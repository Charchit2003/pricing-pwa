// src/pricing/tokenizer.ts

export type TokenType =
  | "NUMBER"
  | "IDENTIFIER"
  | "PLUS"
  | "MINUS"
  | "MULTIPLY"
  | "DIVIDE"
  | "LPAREN"
  | "RPAREN"
  | "EOF";

export interface Token {
  type: TokenType;
  value?: string;
  position: number;
}

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*/;

export function tokenize(expression: string): Token[] {
  if (typeof expression !== "string") {
    throw new FormulaError("Formula must be a string");
  }

  const tokens: Token[] = [];
  let position = 0;

  while (position < expression.length) {
    const char = expression[position];

    // ---------------------------------------------------------
    // Whitespace
    // ---------------------------------------------------------
    if (/\s/.test(char)) {
      position++;
      continue;
    }

    // ---------------------------------------------------------
    // Number
    //
    // Supported:
    //   10
    //   10.5
    //   0.68
    //   .5
    //
    // Not supported:
    //   10.5.2
    //   .
    // ---------------------------------------------------------
    if (/[0-9.]/.test(char)) {
      const start = position;
      let dotCount = 0;

      while (
        position < expression.length &&
        /[0-9.]/.test(expression[position])
      ) {
        if (expression[position] === ".") {
          dotCount++;
        }

        position++;
      }

      const value = expression.substring(start, position);

      if (dotCount > 1 || value === ".") {
        throw new FormulaError(
          `Invalid number "${value}" at position ${start}`
        );
      }

      tokens.push({
        type: "NUMBER",
        value,
        position: start
      });

      continue;
    }

    // ---------------------------------------------------------
    // Identifier
    //
    // Examples:
    //   Length
    //   Breadth
    //   Thickness
    //   P_Density
    //   P_Palla
    //   R_SqInch
    //   R_TotalRoll
    //   R_Cost
    //
    // The tokenizer intentionally does NOT decide whether an
    // identifier is Q/P/R. That is the validator/evaluator's job.
    // ---------------------------------------------------------
    if (/[A-Za-z_]/.test(char)) {
      const start = position;

      const remaining = expression.substring(position);
      const match = remaining.match(IDENTIFIER_REGEX);

      if (!match) {
        throw new FormulaError(
          `Invalid identifier at position ${position}`
        );
      }

      const value = match[0];

      tokens.push({
        type: "IDENTIFIER",
        value,
        position: start
      });

      position += value.length;

      continue;
    }

    // ---------------------------------------------------------
    // Operators / Parentheses
    // ---------------------------------------------------------
    switch (char) {
      case "+":
        tokens.push({
          type: "PLUS",
          position
        });
        break;

      case "-":
        tokens.push({
          type: "MINUS",
          position
        });
        break;

      case "*":
        tokens.push({
          type: "MULTIPLY",
          position
        });
        break;

      case "/":
        tokens.push({
          type: "DIVIDE",
          position
        });
        break;

      case "(":
        tokens.push({
          type: "LPAREN",
          position
        });
        break;

      case ")":
        tokens.push({
          type: "RPAREN",
          position
        });
        break;

      default:
        throw new FormulaError(
          `Unexpected character "${char}" at position ${position}`
        );
    }

    position++;
  }

  // ---------------------------------------------------------
  // End of expression
  // ---------------------------------------------------------
  tokens.push({
    type: "EOF",
    position
  });

  return tokens;
}