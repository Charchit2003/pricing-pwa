// src/types/db1.ts

export type QuestionType = "number";

export interface QuestionDefinition {
  key: string;
  name: string;
  label: string;
  type: QuestionType;
  required: boolean;
}

export type ResultDefinition =
  | null
  | {
      type: "constant";
      value: number;
      dependencies: [];
    }
  | {
      type: "formula";
      formula: string;
      dependencies: string[];
    };

export interface MaterialDefinition {
  materialId: string;
  materialName: string;

  questions: Record<
    string,
    QuestionDefinition
  >;

  properties: Record<string, number>;

  results: Record<
    string,
    ResultDefinition
  >;
}

export interface MaterialSheet {
  sheetName: string;
  type: "material";
  order: number;
  materials: MaterialDefinition[];
}

export interface CostOption {
  type: string;
  cost: number;
}

export interface DB1 {
  versionId: number;
  updatedAt: string;

  sheets: MaterialSheet[];

  branding: CostOption[];

  labor: CostOption[];
}