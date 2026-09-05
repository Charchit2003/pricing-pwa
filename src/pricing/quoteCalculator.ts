import type { DB1 } from "../types/db1";
import type { Quote, QuoteMaterial } from "../types/db2";
import { calculateMaterial } from "./calculator";
import { FormulaError } from "./tokenizer";

const canon = (v: string) => v.trim().toUpperCase();

export interface QuoteCalculationError {
  sheetName: string;
  materialId: string;
  material: string;
  message: string;
}

export interface QuoteCalculationResult {
  quote: Quote;
  errors: QuoteCalculationError[];
}

export function calculateQuote(
  quote: Quote,
  config: DB1,
): QuoteCalculationResult {
  const sections = { ...quote.sections };

  const errors: QuoteCalculationError[] = [];

  for (const sheet of config.sheets) {
    const section = quote.sections[sheet.sheetName];

    if (!section) {
      continue;
    }

    sections[sheet.sheetName] = {
      ...section,

      materials: section.materials.map((qm) => {
        const def = sheet.materials.find(
          (m) => m.materialId === qm.materialId,
        );

        if (!def) {
          errors.push({
            sheetName: sheet.sheetName,
            materialId: qm.materialId,
            material: qm.material,
            message: `Material "${qm.material}" does not exist in DB1`,
          });

          return qm;
        }

        try {
          const questions: Record<string, number> = {};

          for (const [id, q] of Object.entries(def.questions)) {
            const entered = qm.questions?.[id]?.value;

            if (
              entered !== undefined &&
              !Number.isFinite(entered)
            ) {
              throw new FormulaError(
                `Question "${q.name}" has invalid value`,
              );
            }

            if (
              q.required &&
              !Number.isFinite(entered)
            ) {
              throw new FormulaError(
                `Question "${q.name}" is required`,
              );
            }

            if (Number.isFinite(entered)) {
              questions[id] = entered;
              questions[canon(q.name)] = entered;
            }
          }

          const calculated = calculateMaterial(def, {
            questions,
            brandingCost: section.branding.cost,
            laborCost: section.labor.cost,
          });

          const results: QuoteMaterial["results"] = {};

          for (const [name, result] of Object.entries(
            def.results,
          )) {
            // null means this R_* field does not apply.
            if (result === null) {
              continue;
            }

            const value =
              calculated.results[canon(name)];

            if (!Number.isFinite(value)) {
              throw new FormulaError(
                `Result "${name}" could not be calculated`,
              );
            }

            results[name] =
              result.type === "formula"
                ? {
                    type: "formula",
                    formula: result.formula,
                    value,
                  }
                : {
                    type: "constant",
                    value,
                  };
          }

          // R_Cost is mandatory.
          const costKey = Object.keys(results).find(
            (key) => canon(key) === "R_COST",
          );

          const cost =
            costKey !== undefined
              ? results[costKey]?.value
              : undefined;

          if (
            typeof cost !== "number" ||
            !Number.isFinite(cost)
          ) {
            throw new FormulaError(
              `R_Cost could not be calculated`,
            );
          }

          return {
            ...qm,
            material: def.materialName,
            properties: { ...def.properties },
            results,
            calculationError: undefined,
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Calculation failed";

          errors.push({
            sheetName: sheet.sheetName,
            materialId: qm.materialId,
            material: def.materialName,
            message,
          });

          // Preserve the material and its previous results.
          // It contributes ZERO to the material subtotal,
          // but does NOT destroy the other material totals.
          return {
            ...qm,
            material: def.materialName,
            properties: { ...def.properties },
            calculationError: message,
          };
        }
      }),
    };
  }

  // Calculate partial total.
  // Invalid material costs are ignored rather than poisoning
  // the entire total with NaN.
  let total = 0;

  for (const [, section] of Object.entries(sections)) {
    let sectionMaterialTotal = 0;

    for (const material of section.materials) {
      const key = Object.keys(material.results).find(
        (k) => canon(k) === "R_COST",
      );

      const cost =
        key !== undefined
          ? material.results[key]?.value
          : undefined;

      if (
        typeof cost === "number" &&
        Number.isFinite(cost)
      ) {
        sectionMaterialTotal += cost;
      }
    }

    const branding = Number(
      section.branding?.cost ?? 0,
    );

    const labor = Number(
      section.labor?.cost ?? 0,
    );

    if (Number.isFinite(branding) && branding >= 0) {
      total += branding;
    }

    if (Number.isFinite(labor) && labor >= 0) {
      total += labor;
    }

    total += sectionMaterialTotal;
  }

  return {
    quote: {
      ...quote,
      sections,
      finalResult: {
        R_Cost: total,
      },
      updatedAt: new Date().toISOString(),
    },

    errors,
  };
}