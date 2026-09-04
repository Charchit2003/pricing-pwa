// src/types/db2.ts

export type QuoteStatus =
  | "draft"
  | "pending"
  | "complete";

export interface QuoteMaterial {
  materialId: string;
  material: string;

  questions: Record<
    string,
    {
      name: string;
      value: number;
    }
  >;

  properties: Record<string, number>;

  results: Record<
    string,
    {
      type: "constant" | "formula";
      formula?: string;
      value: number;
    }
  >;
}

export interface QuoteBranding {
  type: string;
  cost: number;
}

export interface QuoteLabor {
  type: string;
  cost: number;
}

export interface QuoteSection {
  materials: QuoteMaterial[];

  branding: QuoteBranding;

  labor: QuoteLabor;
}

export interface Quote {
  id: string;

  displayName: string;

  versionId: number;

  createdAt: string;

  updatedAt: string;

  status: QuoteStatus;

  sections: Record<
    string,
    QuoteSection
  >;

  finalResult: {
    R_Cost: number;
  };
}