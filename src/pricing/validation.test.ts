import { describe, expect, it } from "vitest";
import { validateDB1 } from "./validation";

const base = { versionId: 1, updatedAt: new Date().toISOString(), branding: [{ type: "Standard", cost: 10 }], labor: [{ type: "Standard", cost: 20 }], sheets: [{ sheetName: "Stone", type: "material" as const, order: 1, materials: [{ materialId: "stone_a", materialName: "Stone A", questions: { Q1: { key: "Q1", name: "Length", label: "Length", type: "number" as const, required: true } }, properties: { P_DENSITY: 2.7 } as Record<string, number>, results: { R_Cost: { type: "formula" as const, formula: "Length * P_DENSITY", dependencies: ["LENGTH", "P_DENSITY"] } } }] }] };

describe("DB1 validation", () => {
  it("accepts canonical Q/P/R names", () => expect(validateDB1(base)).toEqual([]));
  it("rejects R1", () => { const db = structuredClone(base); (db.sheets[0].materials[0].results as any).R1 = (db.sheets[0].materials[0].results as any).R_Cost; delete (db.sheets[0].materials[0].results as any).R_Cost; expect(validateDB1(db).some(e => e.message.includes("R_Cost"))).toBe(true); });
  it("rejects unknown formula identifiers", () => { const db = structuredClone(base); db.sheets[0].materials[0].results.R_Cost.formula = "Length * P_UNKNOWN"; db.sheets[0].materials[0].results.R_Cost.dependencies = ["LENGTH", "P_UNKNOWN"]; expect(validateDB1(db).some(e => e.message.includes("Unknown identifier"))).toBe(true); });
  it("rejects dependency metadata that differs from formula", () => { const db = structuredClone(base); db.sheets[0].materials[0].results.R_Cost.dependencies = ["LENGTH"]; expect(validateDB1(db).some(e => e.path.includes("dependencies"))).toBe(true); });
  it("rejects question/property/result namespace collisions", () => { const db = structuredClone(base); db.sheets[0].materials[0].properties = { ...db.sheets[0].materials[0].properties, P_LENGTH: 4 }; expect(validateDB1(db).some(e => e.message.includes("collides"))).toBe(true); });
});
