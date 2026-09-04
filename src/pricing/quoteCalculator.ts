// src/pricing/quoteCalculator.ts

import type {
  DB1
} from "../types/db1";

import type {
  Quote,
  QuoteMaterial
} from "../types/db2";

import {
  calculateMaterial
} from "./calculator";

import {
  FormulaError
} from "./tokenizer";

export interface QuoteCalculationResult {
  quote: Quote;
}

export function calculateQuote(
  quote: Quote,
  config: DB1
): QuoteCalculationResult {

  const updatedSections = {
    ...quote.sections
  };

  for (const sheet of config.sheets) {

    const section =
      quote.sections[sheet.sheetName];

    if (!section) {
      continue;
    }

    const materials =
      section.materials.map(
        quoteMaterial => {

          const definition =
            sheet.materials.find(
              material =>
                material.materialId ===
                quoteMaterial.materialId
            );

          if (!definition) {
            throw new FormulaError(
              `Material "${quoteMaterial.material}" ` +
              `does not exist in DB1`
            );
          }

          /*
           * Expose both:
           *   Q1 / Q2 / ...
           * and human-readable names:
           *   Length / Breadth / ...
           *
           * Formulas should normally use the
           * human-readable names.
           */
          const questions:
            Record<string, number> = {};

          for (
            const [
              questionId,
              questionDefinition
            ] of Object.entries(
              definition.questions
            )
          ) {

            const enteredQuestion =
              quoteMaterial.questions?.[
                questionId
              ];

            const value =
              typeof enteredQuestion === "number"
                ? enteredQuestion
                : enteredQuestion?.value;

            if (
              value === undefined ||
              value === null ||
              !Number.isFinite(value)
            ) {

              if (
                questionDefinition.required
              ) {
                throw new FormulaError(
                  `Question "${questionDefinition.name}" ` +
                  `is required`
                );
              }

              continue;
            }

            questions[
              questionId
            ] = value;

            questions[
              questionDefinition.name
            ] = value;
          }

          const calculation =
            calculateMaterial(
              definition,
              {
                questions,

                brandingCost:
                  section.branding.cost,

                laborCost:
                  section.labor.cost
              }
            );

          const results =
            buildQuoteResults(
              definition,
              calculation.results
            );

          const updatedMaterial:
            QuoteMaterial = {
              ...quoteMaterial,

              /*
               * Snapshot properties used by
               * this calculation.
               */
              properties: {
                ...definition.properties
              },

              /*
               * Snapshot result definitions and
               * calculated values.
               */
              results
            };

          return updatedMaterial;
        }
      );

    updatedSections[
      sheet.sheetName
    ] = {
      ...section,
      materials
    };
  }

  /*
   * Only R_Cost contributes to the final
   * salesman-facing quotation total.
   */
  let totalCost = 0;

  for (
    const section of Object.values(
      updatedSections
    )
  ) {

    for (
      const material of section.materials
    ) {

      const cost =
        findResultValue(
          material.results,
          "R_Cost"
        );

      if (
        cost === undefined
      ) {
        throw new FormulaError(
          `R_Cost is missing for material "${material.material}"`
        );
      }

      if (
        !Number.isFinite(cost)
      ) {
        throw new FormulaError(
          `Invalid R_Cost for material "${material.material}"`
        );
      }

      totalCost += cost;
    }
  }

  return {
    quote: {
      ...quote,

      sections:
        updatedSections,

      finalResult: {
        R_Cost: totalCost
      },

      updatedAt:
        new Date().toISOString()
    }
  };
}

function buildQuoteResults(
  definition: {
    results: Record<
      string,
      {
        type:
          | "constant"
          | "formula";

        value?: number;

        formula?: string;

        dependencies?: string[];
      }
    >
  },
  calculatedResults:
    Record<string, number>
): Record<
  string,
  {
    type:
      | "constant"
      | "formula";

    formula?: string;

    value: number;
  }
> {

  const results: Record<
    string,
    {
      type:
        | "constant"
        | "formula";

      formula?: string;

      value: number;
    }
  > = {};

  for (
    const [
      resultName,
      resultDefinition
    ] of Object.entries(
      definition.results
    )
  ) {

    const value =
      findNumericResult(
        calculatedResults,
        resultName
      );

    if (
      value === undefined ||
      !Number.isFinite(value)
    ) {
      throw new FormulaError(
        `Result "${resultName}" ` +
        `could not be calculated`
      );
    }

    if (
      resultDefinition.type ===
      "constant"
    ) {

      results[
        resultName
      ] = {
        type: "constant",
        value
      };

    } else {

      results[
        resultName
      ] = {
        type: "formula",
        formula:
          resultDefinition.formula,
        value
      };
    }
  }

  return results;
}

function findResultValue(
  results: Record<
    string,
    {
      type:
        | "constant"
        | "formula";

      formula?: string;

      value: number;
    }
  >,
  resultName: string
): number | undefined {

  const key =
    findCanonicalKey(
      results,
      resultName
    );

  if (
    key === undefined
  ) {
    return undefined;
  }

  return results[key]?.value;
}

function findNumericResult(
  results: Record<string, number>,
  resultName: string
): number | undefined {

  const key =
    findCanonicalKey(
      results,
      resultName
    );

  if (
    key === undefined
  ) {
    return undefined;
  }

  return results[key];
}

function findCanonicalKey<T>(
  values: Record<string, T>,
  name: string
): string | undefined {

  const canonicalName =
    canonicalize(name);

  return Object.keys(values)
    .find(
      key =>
        canonicalize(key) ===
        canonicalName
    );
}

function canonicalize(
  value: string
): string {

  return value
    .trim()
    .toUpperCase();
}