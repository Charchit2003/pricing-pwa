// MaterialSection.tsx

import {
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  QuoteSection,
  QuoteMaterial
} from "../types/db2";

import {
  calculateMaterial,
  hasAllRequiredQuestions
} from "../pricing/calculator";

import {
  MaterialSelector
} from "../components/MaterialSelector";

import {
  MaterialCard
} from "../components/MaterialCard";

import {
  BrandingSelector
} from "../components/BrandingSelector";

import {
  LaborSelector
} from "../components/LaborSelector";

import type {
  MaterialSheet,
  CostOption
} from "../types/db1";

interface MaterialSectionProps {
  sheet: MaterialSheet;

  brandingOptions:
    CostOption[];

  laborOptions:
    CostOption[];

  value: QuoteSection;

  onChange: (
    value: QuoteSection
  ) => void;
}

export function MaterialSection({
  sheet,
  brandingOptions,
  laborOptions,
  value,
  onChange
}: MaterialSectionProps) {

  const [
    selectedMaterialId,
    setSelectedMaterialId
  ] = useState("");

  const [
    customBrandingCost,
    setCustomBrandingCost
  ] = useState("");

  const [
    customLaborCost,
    setCustomLaborCost
  ] = useState("");

  const selectedMaterial =
    useMemo(
      () =>
        sheet.materials.find(
          material =>
            material.materialId ===
            selectedMaterialId
        ),
      [
        sheet.materials,
        selectedMaterialId
      ]
    );

  function addMaterial() {

    if (!selectedMaterial) {
      return;
    }

    const questions:
      QuoteMaterial["questions"] = {};

    for (
      const [
        questionId,
        question
      ] of Object.entries(
        selectedMaterial.questions
      )
    ) {

      questions[
        questionId
      ] = {
        name:
          question.name,

        value:
          NaN
      };
    }

    const newMaterial:
      QuoteMaterial = {

      materialId:
        selectedMaterial.materialId,

      material:
        selectedMaterial.materialName,

      questions,

      properties: {
        ...selectedMaterial.properties
      },

      results: {}
    };

    onChange({
      ...value,

      materials: [
        ...value.materials,
        newMaterial
      ]
    });

    setSelectedMaterialId("");
  }

  function updateMaterial(
    index: number,
    material: QuoteMaterial
  ) {

    const materials =
      [...value.materials];

    materials[index] =
      material;

    onChange({
      ...value,
      materials
    });
  }

  function removeMaterial(
    index: number
  ) {

    const materials =
      value.materials.filter(
        (_, i) =>
          i !== index
      );

    onChange({
      ...value,
      materials
    });
  }

  function updateBranding(
    type: string,
    cost: number
  ) {

    onChange({
      ...value,

      branding: {
        type,
        cost
      }
    });
  }

  function updateLabor(
    type: string,
    cost: number
  ) {

    onChange({
      ...value,

      labor: {
        type,
        cost
      }
    });
  }

  /*
   * Recalculate material results whenever
   * questions, branding, or labor changes.
   */
  useEffect(() => {

    const brandingCost =
      value.branding.cost;

    const laborCost =
      value.labor.cost;

    const calculatedMaterials =
      value.materials.map(
        quoteMaterial => {

          const definition =
            sheet.materials.find(
              material =>
                material.materialId ===
                quoteMaterial.materialId
            );

          if (!definition) {
            return quoteMaterial;
          }

          if (
            !hasAllRequiredQuestions(
              definition,
              buildQuestionValues(
                definition,
                quoteMaterial
              )
            )
          ) {

            return {
              ...quoteMaterial,
              results: {}
            };
          }

          try {

            const result =
              calculateMaterial(
                definition,
                {
                  questions:
                    buildQuestionValues(
                      definition,
                      quoteMaterial
                    ),

                  brandingCost,

                  laborCost
                }
              );

            /*
             * Keep the UI result calculation
             * compatible with the DB2 result shape.
             *
             * Metadata is added later by
             * calculateQuote() during publish.
             */
            const results =
              Object.fromEntries(
                Object.entries(
                  result.results
                ).map(
                  ([
                    resultName,
                    resultValue
                  ]) => {

                    const resultDefinition =
                      definition.results[
                        resultName
                      ];

                    if (
                      resultDefinition?.type ===
                      "formula"
                    ) {

                      return [
                        resultName,
                        {
                          type:
                            "formula" as const,

                          formula:
                            resultDefinition.formula,

                          value:
                            resultValue
                        }
                      ];
                    }

                    return [
                      resultName,
                      {
                        type:
                          "constant" as const,

                        value:
                          resultValue
                      }
                    ];
                  }
                )
              );

            return {
              ...quoteMaterial,

              properties: {
                ...definition.properties
              },

              results
            };

          } catch {

            return {
              ...quoteMaterial,
              results: {}
            };
          }
        }
      );

    const changed =
      JSON.stringify(
        calculatedMaterials
      ) !==
      JSON.stringify(
        value.materials
      );

    if (changed) {

      onChange({
        ...value,

        materials:
          calculatedMaterials
      });
    }

  }, [
    value.materials,
    value.branding.cost,
    value.labor.cost,
    sheet.materials
  ]);

  return (
    <section className="material-section">

      <h2>
        {sheet.sheetName}
      </h2>

      <div className="add-material">

        <MaterialSelector
          materials={
            sheet.materials
          }

          value={
            selectedMaterialId
          }

          onChange={
            setSelectedMaterialId
          }
        />

        <button
          type="button"
          onClick={
            addMaterial
          }
          disabled={
            !selectedMaterialId
          }
        >
          Add Material
        </button>

      </div>

      <div className="material-list">

        {value.materials.map(
          (
            material,
            index
          ) => {

            const definition =
              sheet.materials.find(
                item =>
                  item.materialId ===
                  material.materialId
              );

            if (!definition) {
              return null;
            }

            return (
              <MaterialCard
                key={
                  `${material.materialId}-${index}`
                }

                material={
                  definition
                }

                value={
                  material
                }

                onChange={
                  updated =>
                    updateMaterial(
                      index,
                      updated
                    )
                }

                onRemove={() =>
                  removeMaterial(
                    index
                  )
                }

                canRemove={
                  value.materials.length >
                  1
                }
              />
            );
          }
        )}

      </div>

      <div className="section-costs">

        <BrandingSelector
          options={
            brandingOptions
          }

          value={
            value.branding.type
          }

          cost={
            value.branding.cost
          }

          customCost={
            customBrandingCost
          }

          onChange={
            updateBranding
          }

          onCustomCostChange={
            cost => {

              setCustomBrandingCost(
                String(cost)
              );

              updateBranding(
                "Custom",
                cost
              );
            }
          }
        />

        <LaborSelector
          options={
            laborOptions
          }

          value={
            value.labor.type
          }

          cost={
            value.labor.cost
          }

          customCost={
            customLaborCost
          }

          onChange={
            updateLabor
          }

          onCustomCostChange={
            cost => {

              setCustomLaborCost(
                String(cost)
              );

              updateLabor(
                "Custom",
                cost
              );
            }
          }
        />

      </div>

    </section>
  );
}

function buildQuestionValues(
  definition: MaterialSheet["materials"][number],
  quoteMaterial: QuoteMaterial
): Record<string, number> {

  const questions:
    Record<string, number> = {};

  for (
    const [
      questionId,
      question
    ] of Object.entries(
      definition.questions
    )
  ) {

    const entered =
      quoteMaterial.questions?.[
        questionId
      ];

    const value =
      typeof entered === "number"
        ? entered
        : entered?.value;

    if (
      value === undefined ||
      value === null
    ) {
      continue;
    }

    questions[
      questionId
    ] = value;

    questions[
      question.name
    ] = value;
  }

  return questions;
}