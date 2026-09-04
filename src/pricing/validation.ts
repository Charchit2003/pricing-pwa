// src/pricing/validation.ts

import type {
  MaterialDefinition,
  MaterialSheet,
  DB1
} from "../types/db1";

import type {
  Quote,
  QuoteMaterial,
  QuoteSection
} from "../types/db2";

export interface ValidationError {
  path: string;
  message: string;
}

export function validateQuote(
  quote: Quote,
  config: DB1
): ValidationError[] {

  const errors: ValidationError[] = [];

  if (
    !quote.displayName ||
    !quote.displayName.trim()
  ) {
    errors.push({
      path: "displayName",
      message:
        "Customer / Quote name is required"
    });
  }

  for (
    const sheet of config.sheets
  ) {

    const section =
      quote.sections[
        sheet.sheetName
      ];

    if (!section) {

      errors.push({
        path:
          sheet.sheetName,
        message:
          "Section is missing"
      });

      continue;
    }

    validateSection(
      sheet,
      section,
      errors
    );
  }

  return errors;
}

function validateSection(
  sheet: MaterialSheet,
  section: QuoteSection,
  errors: ValidationError[]
): void {

  /*
   * Branding is mandatory for every
   * material section.
   */
  if (
    !section.branding ||
    !section.branding.type
  ) {

    errors.push({
      path:
        `${sheet.sheetName}.branding`,
      message:
        "Branding is required"
    });

  } else if (
    !Number.isFinite(
      section.branding.cost
    ) ||
    section.branding.cost < 0
  ) {

    errors.push({
      path:
        `${sheet.sheetName}.branding.cost`,
      message:
        "Branding cost must be a valid non-negative number"
    });
  }

  /*
   * Labor is mandatory for every
   * material section.
   */
  if (
    !section.labor ||
    !section.labor.type
  ) {

    errors.push({
      path:
        `${sheet.sheetName}.labor`,
      message:
        "Labor is required"
    });

  } else if (
    !Number.isFinite(
      section.labor.cost
    ) ||
    section.labor.cost < 0
  ) {

    errors.push({
      path:
        `${sheet.sheetName}.labor.cost`,
      message:
        "Labor cost must be a valid non-negative number"
    });
  }

  /*
   * At least one material is mandatory.
   */
  if (
    !section.materials ||
    section.materials.length === 0
  ) {

    errors.push({
      path:
        `${sheet.sheetName}.materials`,
      message:
        "At least one material is required"
    });

    return;
  }

  section.materials.forEach(
    (
      quoteMaterial,
      index
    ) => {

      const definition =
        sheet.materials.find(
          material =>
            material.materialId ===
            quoteMaterial.materialId
        );

      if (!definition) {

        errors.push({
          path:
            `${sheet.sheetName}.materials[${index}]`,
          message:
            `Material "${quoteMaterial.material}" no longer exists`
        });

        return;
      }

      validateMaterial(
        sheet.sheetName,
        index,
        definition,
        quoteMaterial,
        errors
      );
    }
  );
}

function validateMaterial(
  sheetName: string,
  index: number,
  definition: MaterialDefinition,
  quoteMaterial: QuoteMaterial,
  errors: ValidationError[]
): void {

  /*
   * Every required Q field must have
   * a finite numeric value.
   */
  for (
    const [
      questionId,
      question
    ] of Object.entries(
      definition.questions
    )
  ) {

    if (!question.required) {
      continue;
    }

    const questionValue =
      quoteMaterial.questions?.[
        questionId
      ];

    const value =
      typeof questionValue === "number"
        ? questionValue
        : questionValue?.value;

    if (
      value === undefined ||
      value === null ||
      !Number.isFinite(value)
    ) {

      errors.push({
        path:
          `${sheetName}.materials[${index}].${questionId}`,

        message:
          `${question.label} is required`
      });
    }
  }

  /*
   * Validate that the entered question
   * values are numeric even for optional
   * questions.
   */
  for (
    const [
      questionId,
      questionValue
    ] of Object.entries(
      quoteMaterial.questions ?? {}
    )
  ) {

    const value =
      typeof questionValue === "number"
        ? questionValue
        : questionValue?.value;

    if (
      value !== undefined &&
      value !== null &&
      !Number.isFinite(value)
    ) {

      errors.push({
        path:
          `${sheetName}.materials[${index}].${questionId}`,

        message:
          "Question value must be a valid number"
      });
    }
  }
}