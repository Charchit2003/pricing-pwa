import { useMemo, useState } from "react";
import type { QuoteSection, QuoteMaterial } from "../types/db2";
import type { MaterialSheet, CostOption } from "../types/db1";
import { calculateMaterial } from "../pricing/calculator";
import { MaterialSelector } from "../components/MaterialSelector";
import { MaterialCard } from "../components/MaterialCard";
import { BrandingSelector } from "../components/BrandingSelector";
import { LaborSelector } from "../components/LaborSelector";

interface Props {
  sheet: MaterialSheet;
  brandingOptions: CostOption[];
  laborOptions: CostOption[];
  value: QuoteSection;
  onChange: (value: QuoteSection) => void;
  readOnly?: boolean;
}

function createMaterial(
  material: MaterialSheet["materials"][number],
): QuoteMaterial {
  const questions: QuoteMaterial["questions"] = {};

  for (const [id, question] of Object.entries(
    material.questions,
  )) {
    questions[id] = {
      name: question.name,
      value: NaN,
    };
  }

  return {
    materialId: material.materialId,
    material: material.materialName,
    questions,
    properties: { ...material.properties },
    results: {},
  };
}

export function MaterialSection({
  sheet,
  brandingOptions,
  laborOptions,
  value,
  onChange,
  readOnly = false,
}: Props) {
  const [selectedMaterial, setSelectedMaterial] =
    useState("");

  const calculatedMaterials = useMemo(
    () =>
      value.materials.map((material) => {
        const definition = sheet.materials.find(
          (item) =>
            item.materialId === material.materialId,
        );

        if (!definition) {
          return material;
        }

        const questions: Record<string, number> = {};

        for (const [id, question] of Object.entries(
          definition.questions,
        )) {
          const entered =
            material.questions[id]?.value;

          if (Number.isFinite(entered)) {
            questions[id] = entered;
            questions[question.name] = entered;
            questions[
              question.name.toUpperCase()
            ] = entered;
          }
        }

        try {
          const calculated = calculateMaterial(
            definition,
            {
              questions,
              brandingCost: value.branding.cost,
              laborCost: value.labor.cost,
            },
          );

          const results: QuoteMaterial["results"] =
            {};

          for (const [name, result] of Object.entries(
            definition.results,
          )) {
            // Empty R_* fields are intentionally ignored.
            if (result === null) {
              continue;
            }

            const calculatedValue =
              calculated.results[name.toUpperCase()];

            if (
              !Number.isFinite(calculatedValue)
            ) {
              continue;
            }

            results[name] =
              result.type === "formula"
                ? {
                    type: "formula",
                    formula: result.formula,
                    value: calculatedValue,
                  }
                : {
                    type: "constant",
                    value: calculatedValue,
                  };
          }

          return {
            ...material,
            material: definition.materialName,
            properties: {
              ...definition.properties,
            },
            results,
            calculationError: undefined,
          };
        } catch (error) {
          return {
            ...material,
            material: definition.materialName,
            properties: {
              ...definition.properties,
            },
            calculationError:
              error instanceof Error
                ? error.message
                : "Calculation failed",
          };
        }
      }),
    [sheet, value],
  );

  const addMaterial = (materialId: string) => {
    if (readOnly || !materialId) return;

    const definition = sheet.materials.find(
      (item) => item.materialId === materialId,
    );

    if (!definition) return;

    onChange({
      ...value,
      materials: [
        ...value.materials,
        createMaterial(definition),
      ],
    });

    setSelectedMaterial("");
  };

  const updateMaterial = (
    index: number,
    material: QuoteMaterial,
  ) => {
    if (readOnly) return;

    const materials = [...value.materials];

    materials[index] = material;

    onChange({
      ...value,
      materials,
    });
  };

  const materialTotal =
    calculatedMaterials.reduce(
      (total, material) => {
        const key = Object.keys(
          material.results,
        ).find(
          (name) =>
            name.trim().toUpperCase() ===
            "R_COST",
        );

        const cost =
          key !== undefined
            ? material.results[key]?.value
            : undefined;

        return typeof cost === "number" &&
          Number.isFinite(cost)
          ? total + cost
          : total;
      },
      0,
    );

  const brandingCost =
    Number.isFinite(value.branding.cost)
      ? value.branding.cost
      : 0;

  const laborCost =
    Number.isFinite(value.labor.cost)
      ? value.labor.cost
      : 0;

  const sectionTotal =
    materialTotal +
    brandingCost +
    laborCost;

  return (
    <section className="material-section">
      <div className="section-header">
        <div>
          <h2>{sheet.sheetName}</h2>

          <span className="section-subtotal">
            Section total: ₹
            {sectionTotal.toFixed(2)}
          </span>
        </div>

        <strong className="section-header-total">
          ₹{sectionTotal.toFixed(2)}
        </strong>
      </div>

      {!readOnly && (
        <MaterialSelector
          materials={sheet.materials}
          value={selectedMaterial}
          onChange={(id) => {
            setSelectedMaterial(id);
            addMaterial(id);
          }}
        />
      )}

      <div className="material-list">
        {value.materials.map(
          (material, index) => {
            const definition =
              sheet.materials.find(
                (item) =>
                  item.materialId ===
                  material.materialId,
              );

            if (!definition) return null;

            return (
              <div
                key={`${material.materialId}-${index}`}
              >
                <MaterialCard
                  material={definition}
                  value={
                    calculatedMaterials[index] ??
                    material
                  }
                  onChange={(next) =>
                    updateMaterial(
                      index,
                      next,
                    )
                  }
                  onRemove={() => {
                    if (readOnly) return;

                    onChange({
                      ...value,
                      materials:
                        value.materials.filter(
                          (_, i) =>
                            i !== index,
                        ),
                    });
                  }}
                  canRemove={!readOnly}
                  readOnly={readOnly}
                />

                {calculatedMaterials[index]
                  ?.calculationError && (
                  <div className="material-error">
                    Calculation error:{" "}
                    {
                      calculatedMaterials[index]
                        .calculationError
                    }
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      <BrandingSelector
        options={brandingOptions}
        value={value.branding.type}
        cost={value.branding.cost}
        customCost={
          value.branding.type === "Custom"
            ? String(value.branding.cost)
            : ""
        }
        onChange={(type, cost) =>
          onChange({
            ...value,
            branding: {
              type,
              cost,
            },
          })
        }
        onCustomCostChange={(cost) =>
          onChange({
            ...value,
            branding: {
              ...value.branding,
              cost,
            },
          })
        }
        readOnly={readOnly}
      />

      <LaborSelector
        options={laborOptions}
        value={value.labor.type}
        cost={value.labor.cost}
        customCost={
          value.labor.type === "Custom"
            ? String(value.labor.cost)
            : ""
        }
        onChange={(type, cost) =>
          onChange({
            ...value,
            labor: {
              type,
              cost,
            },
          })
        }
        onCustomCostChange={(cost) =>
          onChange({
            ...value,
            labor: {
              ...value.labor,
              cost,
            },
          })
        }
        readOnly={readOnly}
      />

      <div className="section-cost-breakdown">
        <div>
          <span>Materials</span>
          <strong>
            ₹{materialTotal.toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Branding</span>
          <strong>
            ₹{brandingCost.toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Labor</span>
          <strong>
            ₹{laborCost.toFixed(2)}
          </strong>
        </div>

        <div className="section-total">
          <strong>Section Total</strong>
          <strong>
            ₹{sectionTotal.toFixed(2)}
          </strong>
        </div>
      </div>
    </section>
  );
}