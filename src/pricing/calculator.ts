// src/pricing/calculator.ts

import type {
  MaterialDefinition,
  ResultDefinition
} from "../types/db1";

import {
  parse
} from "./parser";

import type {
  ASTNode
} from "./parser";

import {
  evaluate
} from "./evaluator";

import type {
  VariableContext
} from "./evaluator";

import {
  FormulaError
} from "./tokenizer";

export interface CalculationInput {
  questions: Record<string, number>;
  brandingCost?: number;
  laborCost?: number;
}

export interface CalculationResult {
  results: Record<string, number>;
}

export function calculateMaterial(
  material: MaterialDefinition,
  input: CalculationInput
): CalculationResult {

  const variables: VariableContext = {};

  /*
   * Questions.
   *
   * The caller may provide both:
   *   Q1 -> value
   *   Length -> value
   *
   * This allows formulas to use human-readable
   * question names.
   */
  for (
    const [name, value]
    of Object.entries(input.questions)
  ) {

    if (!Number.isFinite(value)) {
      throw new FormulaError(
        `Question "${name}" has invalid value`
      );
    }

    variables[name] = value;
  }

  /*
   * Properties.
   *
   * Example:
   * P_Density
   * P_Palla
   * P_SqInch
   */
  for (
    const [name, value]
    of Object.entries(
      material.properties
    )
  ) {

    if (!Number.isFinite(value)) {
      throw new FormulaError(
        `Property "${name}" has invalid value`
      );
    }

    variables[name] = value;
  }

  /*
   * Global costs available to formulas.
   */
  const brandingCost =
    input.brandingCost ?? 0;

  const laborCost =
    input.laborCost ?? 0;

  if (
    !Number.isFinite(brandingCost) ||
    brandingCost < 0
  ) {
    throw new FormulaError(
      "Branding cost must be a valid non-negative number"
    );
  }

  if (
    !Number.isFinite(laborCost) ||
    laborCost < 0
  ) {
    throw new FormulaError(
      "Labor cost must be a valid non-negative number"
    );
  }

  variables.BRANDING_COST =
    brandingCost;

  variables.LABOR_COST =
    laborCost;

  /*
   * Parse formula results once.
   */
  const parsedFormulas:
    Record<string, ASTNode> = {};

  for (
    const [
      resultName,
      definition
    ] of Object.entries(
      material.results
    )
  ) {

    if (
      definition.type ===
      "formula"
    ) {

      parsedFormulas[resultName] =
        parse(
          definition.formula
        );
    }
  }

  const results:
    Record<string, number> = {};

  const visiting =
    new Set<string>();

  const calculated =
    new Set<string>();

  function canonicalize(
    value: string
  ): string {

    return value
      .trim()
      .toUpperCase();
  }

  function findResultKey(
    name: string
  ): string | undefined {

    const canonicalName =
      canonicalize(name);

    return Object.keys(
      material.results
    ).find(
      key =>
        canonicalize(key) ===
        canonicalName
    );
  }

  function calculateResult(
    resultName: string
  ): number {

    const actualResultName =
      findResultKey(resultName);

    if (!actualResultName) {
      throw new FormulaError(
        `Result "${resultName}" is not defined`
      );
    }

    if (
      calculated.has(
        actualResultName
      )
    ) {

      return results[
        actualResultName
      ];
    }

    if (
      visiting.has(
        actualResultName
      )
    ) {

      throw new FormulaError(
        `Circular dependency detected involving ${actualResultName}`
      );
    }

    const definition:
      ResultDefinition =
        material.results[
          actualResultName
        ];

    if (!definition) {
      throw new FormulaError(
        `Result "${actualResultName}" is not defined`
      );
    }

    /*
     * Constant result.
     */
    if (
      definition.type ===
      "constant"
    ) {

      if (
        !Number.isFinite(
          definition.value
        )
      ) {

        throw new FormulaError(
          `Result "${actualResultName}" has invalid constant value`
        );
      }

      results[
        actualResultName
      ] =
        definition.value;

      variables[
        actualResultName
      ] =
        definition.value;

      calculated.add(
        actualResultName
      );

      return definition.value;
    }

    /*
     * Formula result.
     */
    visiting.add(
      actualResultName
    );

    /*
     * Resolve result dependencies first.
     */
    for (
      const dependency
      of definition.dependencies
    ) {

      const dependencyResultKey =
        findResultKey(
          dependency
        );

      if (
        !dependencyResultKey
      ) {
        continue;
      }

      const dependencyValue =
        calculateResult(
          dependencyResultKey
        );

      variables[
        dependencyResultKey
      ] =
        dependencyValue;
    }

    const parsedFormula =
      parsedFormulas[
        actualResultName
      ];

    if (!parsedFormula) {

      throw new FormulaError(
        `Formula for "${actualResultName}" could not be parsed`
      );
    }

    const value =
      evaluate(
        parsedFormula,
        variables
      );

    if (
      !Number.isFinite(value)
    ) {

      throw new FormulaError(
        `Result "${actualResultName}" produced an invalid value`
      );
    }

    results[
      actualResultName
    ] =
      value;

    variables[
      actualResultName
    ] =
      value;

    visiting.delete(
      actualResultName
    );

    calculated.add(
      actualResultName
    );

    return value;
  }

  /*
   * Calculate every result.
   */
  for (
    const resultName
    of Object.keys(
      material.results
    )
  ) {

    calculateResult(
      resultName
    );
  }

  return {
    results
  };
}

export function extractVariables(
  node: ASTNode
): string[] {

  const variables =
    new Set<string>();

  function visit(
    current: ASTNode
  ): void {

    switch (
      current.type
    ) {

      case "number":
        return;

      case "variable":
        variables.add(
          current.name
        );
        return;

      case "unary":
        visit(
          current.operand
        );
        return;

      case "binary":
        visit(
          current.left
        );

        visit(
          current.right
        );

        return;
    }
  }

  visit(node);

  return [
    ...variables
  ];
}

export function hasAllRequiredQuestions(
  material: MaterialDefinition,
  questions: Record<string, number>
): boolean {

  return Object.entries(
    material.questions
  ).every(
    ([
      questionId,
      definition
    ]) => {

      if (
        !definition.required
      ) {
        return true;
      }

      const questionName =
        definition.name;

      const value =
        questions[
          questionName
        ] ??
        questions[
          questionId
        ];

      return (
        value !== undefined &&
        value !== null &&
        Number.isFinite(value)
      );
    }
  );
}