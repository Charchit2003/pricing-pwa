// src/pricing/evaluator.ts

import type { ASTNode } from "./parser";
import { FormulaError } from "./tokenizer";

export type VariableContext = Record<string, number>;

export function evaluate(
  node: ASTNode,
  variables: VariableContext
): number {
  switch (node.type) {
    case "number":
      return node.value;

    case "variable":
      return evaluateVariable(node.name, variables);

    case "unary": {
      const value = evaluate(node.operand, variables);

      return node.operator === "-"
        ? -value
        : value;
    }

    case "binary": {
      const left = evaluate(node.left, variables);
      const right = evaluate(node.right, variables);

      return evaluateBinary(
        node.operator,
        left,
        right
      );
    }
  }
}

function evaluateVariable(
  name: string,
  variables: VariableContext
): number {
  const canonicalName = canonicalizeIdentifier(name);

  const key = Object.keys(variables).find(
    variable =>
      canonicalizeIdentifier(variable) === canonicalName
  );

  if (key === undefined) {
    throw new FormulaError(
      `Variable "${name}" is not defined`
    );
  }

  const value = variables[key];

  if (!Number.isFinite(value)) {
    throw new FormulaError(
      `Variable "${name}" has invalid value`
    );
  }

  return value;
}

function canonicalizeIdentifier(
  value: string
): string {
  return value.trim().toUpperCase();
}

function evaluateBinary(
  operator: "+" | "-" | "*" | "/",
  left: number,
  right: number
): number {
  let result: number;

  switch (operator) {
    case "+":
      result = left + right;
      break;

    case "-":
      result = left - right;
      break;

    case "*":
      result = left * right;
      break;

    case "/":
      if (right === 0) {
        throw new FormulaError(
          "Division by zero"
        );
      }

      result = left / right;
      break;
  }

  if (!Number.isFinite(result)) {
    throw new FormulaError(
      "Formula produced an invalid numeric result"
    );
  }

  return result;
}