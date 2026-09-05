import type { MaterialDefinition, ResultDefinition } from "../types/db1";
import { parse, type ASTNode } from "./parser";
import { evaluate, type VariableContext } from "./evaluator";
import { FormulaError } from "./tokenizer";

export interface CalculationInput {
  questions: Record<string, number>;
  brandingCost?: number;
  laborCost?: number;
}

export interface CalculationResult {
  results: Record<string, number>;
}

const canon = (v: string) => v.trim().toUpperCase();

export function extractVariables(node: ASTNode): string[] {
  const out = new Set<string>();

  const visit = (n: ASTNode): void => {
    if (n.type === "variable") {
      out.add(canon(n.name));
    } else if (n.type === "unary") {
      visit(n.operand);
    } else if (n.type === "binary") {
      visit(n.left);
      visit(n.right);
    }
  };

  visit(node);

  return [...out];
}

const find = (
  obj: Record<string, unknown>,
  name: string,
): string | undefined =>
  Object.keys(obj).find((k) => canon(k) === canon(name));

function isResultDefinition(
  result: ResultDefinition | undefined,
): result is Exclude<ResultDefinition, null> {
  return result !== null && result !== undefined;
}

export function calculateMaterial(
  material: MaterialDefinition,
  input: CalculationInput,
): CalculationResult {
  const vars: VariableContext = {};

  // Questions
  for (const [k, v] of Object.entries(input.questions)) {
    if (!Number.isFinite(v)) {
      throw new FormulaError(`Question "${k}" has invalid value`);
    }

    vars[canon(k)] = v;
  }

  // Properties
  for (const [k, v] of Object.entries(material.properties)) {
    if (!Number.isFinite(v)) {
      throw new FormulaError(`Property "${k}" has invalid value`);
    }

    vars[canon(k)] = v;
  }

  // Global costs
  const branding = input.brandingCost ?? 0;
  const labor = input.laborCost ?? 0;

  if (!Number.isFinite(branding) || branding < 0) {
    throw new FormulaError(
      "Branding cost must be a valid non-negative number",
    );
  }

  if (!Number.isFinite(labor) || labor < 0) {
    throw new FormulaError(
      "Labor cost must be a valid non-negative number",
    );
  }

  vars.BRANDING_COST = branding;
  vars.LABOR_COST = labor;

  // Build AST only for results that actually exist.
  // null means the result does not apply to this material.
  const asts: Record<string, ASTNode> = {};

  for (const [key, result] of Object.entries(material.results)) {
    if (!isResultDefinition(result)) {
      continue;
    }

    if (result.type === "formula") {
      asts[canon(key)] = parse(result.formula);
    }
  }

  const results: Record<string, number> = {};

  const visiting = new Set<string>();
  const done = new Set<string>();

  const calc = (name: string): number => {
    const actual = find(material.results, name);

    if (!actual) {
      throw new FormulaError(
        `Result "${name}" is not defined`,
      );
    }

    const key = canon(actual);

    if (done.has(key)) {
      return results[key];
    }

    if (visiting.has(key)) {
      throw new FormulaError(
        `Circular dependency detected involving ${actual}`,
      );
    }

    const def = material.results[actual];

    // A null result is intentionally not calculated.
    if (!isResultDefinition(def)) {
      throw new FormulaError(
        `Result "${actual}" is not defined for material "${material.materialName}"`,
      );
    }

    // Constant result
    if (def.type === "constant") {
      if (!Number.isFinite(def.value)) {
        throw new FormulaError(
          `Result "${actual}" has invalid constant value`,
        );
      }

      results[key] = def.value;
      vars[key] = def.value;

      done.add(key);

      return def.value;
    }

    // Formula result
    visiting.add(key);

    const ast = asts[key];

    if (!ast) {
      throw new FormulaError(
        `Formula for "${actual}" could not be parsed`,
      );
    }

    // Calculate dependencies first.
    for (const dep of extractVariables(ast)) {
      const depResult = find(material.results, dep);

      if (depResult) {
        const depDefinition = material.results[depResult];

        // A dependency may not point at a null result.
        if (!isResultDefinition(depDefinition)) {
          throw new FormulaError(
            `Result "${actual}" depends on empty result "${depResult}"`,
          );
        }

        vars[canon(depResult)] = calc(depResult);
      }
    }

    const value = evaluate(ast, vars);

    if (!Number.isFinite(value)) {
      throw new FormulaError(
        `Result "${actual}" produced an invalid value`,
      );
    }

    results[key] = value;
    vars[key] = value;

    visiting.delete(key);
    done.add(key);

    return value;
  };

  // IMPORTANT:
  // Do not calculate null R_* fields.
  for (const [name, result] of Object.entries(material.results)) {
    if (!isResultDefinition(result)) {
      continue;
    }

    calc(name);
  }

  return { results };
}

export function hasAllRequiredQuestions(
  material: MaterialDefinition,
  questions: Record<string, number>,
) {
  return Object.entries(material.questions).every(
    ([id, q]) =>
      !q.required ||
      Number.isFinite(questions[q.name]) ||
      Number.isFinite(questions[id]),
  );
}