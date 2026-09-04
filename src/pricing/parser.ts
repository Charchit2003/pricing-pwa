// src/pricing/parser.ts

import {
  tokenize,
  FormulaError
} from "./tokenizer";

import type {
  Token
} from "./tokenizer";

export type ASTNode =
  | NumberNode
  | VariableNode
  | UnaryNode
  | BinaryNode;

export interface NumberNode {
  type: "number";
  value: number;
}

export interface VariableNode {
  type: "variable";
  name: string;
}

export interface UnaryNode {
  type: "unary";
  operator: "+" | "-";
  operand: ASTNode;
}

export interface BinaryNode {
  type: "binary";
  operator: "+" | "-" | "*" | "/";
  left: ASTNode;
  right: ASTNode;
}

export function parse(expression: string): ASTNode {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);

  const result = parser.parseExpression();

  if (!parser.isAtEnd()) {
    const token = parser.peek();

    throw new FormulaError(
      `Unexpected token "${token.value ?? token.type}" at position ${token.position}`
    );
  }

  return result;
}

class Parser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token {
    return this.tokens[this.index];
  }

  parseExpression(): ASTNode {
    return this.parseAdditive();
  }

  private parseAdditive(): ASTNode {
    let node = this.parseMultiplicative();

    while (
      this.match("PLUS") ||
      this.match("MINUS")
    ) {
      const operator =
        this.previous().type === "PLUS"
          ? "+"
          : "-";

      const right = this.parseMultiplicative();

      node = {
        type: "binary",
        operator,
        left: node,
        right
      };
    }

    return node;
  }

  private parseMultiplicative(): ASTNode {
    let node = this.parseUnary();

    while (
      this.match("MULTIPLY") ||
      this.match("DIVIDE")
    ) {
      const operator =
        this.previous().type === "MULTIPLY"
          ? "*"
          : "/";

      const right = this.parseUnary();

      node = {
        type: "binary",
        operator,
        left: node,
        right
      };
    }

    return node;
  }

  private parseUnary(): ASTNode {
    if (this.match("PLUS")) {
      return {
        type: "unary",
        operator: "+",
        operand: this.parseUnary()
      };
    }

    if (this.match("MINUS")) {
      return {
        type: "unary",
        operator: "-",
        operand: this.parseUnary()
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.match("NUMBER")) {
      const token = this.previous();

      const value = Number(token.value);

      if (!Number.isFinite(value)) {
        throw new FormulaError(
          `Invalid number at position ${token.position}`
        );
      }

      return {
        type: "number",
        value
      };
    }

    if (this.match("IDENTIFIER")) {
      const token = this.previous();

      if (!token.value) {
        throw new FormulaError(
          `Invalid identifier at position ${token.position}`
        );
      }

      return {
        type: "variable",
        name: token.value
      };
    }

    if (this.match("LPAREN")) {
      const node = this.parseExpression();

      this.consume(
        "RPAREN",
        "Expected ')' after expression"
      );

      return node;
    }

    const token = this.peek();

    throw new FormulaError(
      `Expected number, variable, or '(' at position ${token.position}`
    );
  }

  private match(type: Token["type"]): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }

    return false;
  }

  private consume(
    type: Token["type"],
    message: string
  ): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw new FormulaError(message);
  }

  private check(type: Token["type"]): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.index++;
    }

    return this.previous();
  }

  private previous(): Token {
    return this.tokens[this.index - 1];
  }

  isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }
}