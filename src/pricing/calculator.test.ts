import {
  describe,
  expect,
  it
} from "vitest";

import { parse } from "./parser";
import { evaluate } from "./evaluator";
import {
  calculateMaterial
} from "./calculator";

describe(
  "Formula parser/evaluator",
  () => {

    it(
      "calculates basic arithmetic",
      () => {

        const ast =
          parse("10 + 20");

        expect(
          evaluate(ast, {})
        ).toBe(30);
      }
    );

    it(
      "respects multiplication precedence",
      () => {

        const ast =
          parse("10 + 20 * 3");

        expect(
          evaluate(ast, {})
        ).toBe(70);
      }
    );

    it(
      "supports parentheses",
      () => {

        const ast =
          parse("(10 + 20) * 3");

        expect(
          evaluate(ast, {})
        ).toBe(90);
      }
    );

    it(
      "supports variables",
      () => {

        const ast =
          parse(
            "Palla * SqInch + Mtr"
          );

        expect(
          evaluate(
            ast,
            {
              Palla: 5,
              SqInch: 31.1,
              Mtr: 30
            }
          )
        ).toBeCloseTo(185.5);
      }
    );

    it(
      "supports decimal values",
      () => {

        const ast =
          parse(
            "Length * 0.18"
          );

        expect(
          evaluate(
            ast,
            {
              Length: 100
            }
          )
        ).toBeCloseTo(18);
      }
    );

    it(
      "supports unary minus",
      () => {

        const ast =
          parse("-Q1 + 10");

        expect(
          evaluate(
            ast,
            {
              Q1: 5
            }
          )
        ).toBe(5);
      }
    );

    it(
      "throws for missing variables",
      () => {

        const ast =
          parse(
            "Length + Breadth"
          );

        expect(() =>
          evaluate(
            ast,
            {
              Length: 10
            }
          )
        ).toThrow(
          'Variable "Breadth" is not defined'
        );
      }
    );

    it(
      "throws for division by zero",
      () => {

        const ast =
          parse(
            "Length / Breadth"
          );

        expect(() =>
          evaluate(
            ast,
            {
              Length: 10,
              Breadth: 0
            }
          )
        ).toThrow(
          "Division by zero"
        );
      }
    );

    it(
      "rejects unsupported expressions",
      () => {

        expect(() =>
          parse("Length ** 2")
        ).toThrow();
      }
    );
  }
);

describe(
  "Material calculator",
  () => {

    const material = {

      materialId:
        "frontpalda_printing",

      materialName:
        "Printing",

      questions: {

        Q1: {
          key: "Q1",
          name: "Length",
          label: "Roll Size",
          type: "number" as const,
          required: true
        },

        Q2: {
          key: "Q2",
          name: "Mtr",
          label: "Roll Length",
          type: "number" as const,
          required: true
        },

        Q3: {
          key: "Q3",
          name: "PallaCount",
          label: "Palla",
          type: "number" as const,
          required: true
        }
      },

      properties: {

        Density: 31.1,

        SqInch: 1,

        Palla: 3
      },

      results: {

        R_Kg: {
          type: "formula" as const,

          formula:
            "Length * Palla * Mtr * Density / 1000",

          dependencies: [
            "Length",
            "Palla",
            "Mtr",
            "Density"
          ]
        },

        R_SqInch: {
          type: "formula" as const,

          formula:
            "Mtr * SqInch",

          dependencies: [
            "Mtr",
            "SqInch"
          ]
        },

        R_Cost: {
          type: "formula" as const,

          formula:
            "Palla * Density + Mtr",

          dependencies: [
            "Palla",
            "Density",
            "Mtr"
          ]
        }
      }
    };

    it(
      "calculates R values using question names and properties",
      () => {

        const result =
          calculateMaterial(
            material,
            {
              questions: {
                Length: 20,
                Mtr: 30,
                PallaCount: 5
              }
            }
          );

        expect(
          result.results.R_Kg
        ).toBeCloseTo(
          55.98
        );

        expect(
          result.results.R_SqInch
        ).toBeCloseTo(
          30
        );

        expect(
          result.results.R_Cost
        ).toBeCloseTo(
          123.3
        );
      }
    );

    it(
      "supports result-to-result dependencies",
      () => {

        const materialWithDependencies = {

          ...material,

          results: {

            R_Base: {
              type: "formula" as const,

              formula:
                "Palla * Density + Mtr",

              dependencies: [
                "Palla",
                "Density",
                "Mtr"
              ]
            },

            R_Margin: {
              type: "formula" as const,

              formula:
                "R_Base * 0.18",

              dependencies: [
                "R_Base"
              ]
            },

            R_Cost: {
              type: "formula" as const,

              formula:
                "R_Base + R_Margin",

              dependencies: [
                "R_Base",
                "R_Margin"
              ]
            }
          }
        };

        const result =
          calculateMaterial(
            materialWithDependencies,
            {
              questions: {
                Length: 20,
                Mtr: 30,
                PallaCount: 5
              }
            }
          );

        expect(
          result.results.R_Base
        ).toBeCloseTo(
          123.3
        );

        expect(
          result.results.R_Margin
        ).toBeCloseTo(
          22.194
        );

        expect(
          result.results.R_Cost
        ).toBeCloseTo(
          145.494
        );
      }
    );

    it(
      "supports branding and labor cost",
      () => {

        const materialWithCosts = {

          ...material,

          results: {

            R_Cost: {
              type: "formula" as const,

              formula:
                "Palla * Density + BRANDING_COST + LABOR_COST",

              dependencies: [
                "Palla",
                "Density",
                "BRANDING_COST",
                "LABOR_COST"
              ]
            }
          }
        };

        const result =
          calculateMaterial(
            materialWithCosts,
            {
              questions: {
                Length: 20,
                Mtr: 30,
                PallaCount: 5
              },

              brandingCost: 20,

              laborCost: 10
            }
          );

        expect(
          result.results.R_Cost
        ).toBeCloseTo(
          123.3
        );
      }
    );

    it(
      "detects circular dependencies",
      () => {

        const circularMaterial = {

          ...material,

          results: {

            R_Cost: {
              type: "formula" as const,

              formula:
                "R_Margin + 10",

              dependencies: [
                "R_Margin"
              ]
            },

            R_Margin: {
              type: "formula" as const,

              formula:
                "R_Cost + 20",

              dependencies: [
                "R_Cost"
              ]
            }
          }
        };

        expect(() =>
          calculateMaterial(
            circularMaterial,
            {
              questions: {}
            }
          )
        ).toThrow(
          "Circular dependency"
        );
      }
    );

    it(
      "supports case-insensitive result references",
      () => {

        const materialWithCaseDifference = {

          ...material,

          results: {

            R_Base: {
              type: "formula" as const,

              formula:
                "Palla * Density",

              dependencies: [
                "Palla",
                "Density"
              ]
            },

            R_Cost: {
              type: "formula" as const,

              formula:
                "r_base + Mtr",

              dependencies: [
                "r_base",
                "Mtr"
              ]
            }
          }
        };

        const result =
          calculateMaterial(
            materialWithCaseDifference,
            {
              questions: {
                Length: 20,
                Mtr: 30,
                PallaCount: 5
              }
            }
          );

        expect(
          result.results.R_Cost
        ).toBeCloseTo(
          123.3
        );
      }
    );
  }
);