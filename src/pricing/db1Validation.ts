import type { DB1, MaterialDefinition } from "../types/db1";
import { parse } from "./parser";
import { extractVariables } from "./calculator";
export class DB1ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DB1ValidationError";
  }
}
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const QUESTION_ID = /^Q\d+$/;
const PROPERTY_ID = /^P_[A-Z0-9_]+$/;
const RESULT_ID = /^R_[A-Z0-9_]+$/;
const GLOBALS = new Set(["BRANDING_COST", "LABOR_COST"]);
const canon = (v: string) => v.trim().toUpperCase();
function assertIdentifier(name: string, path: string) {
  if (!IDENTIFIER.test(name))
    throw new DB1ValidationError(`${path}: invalid identifier "${name}"`);
}
function validateMaterial(material: MaterialDefinition, path: string) {
  if (!material.materialId || !material.materialName)
    throw new DB1ValidationError(
      `${path}: materialId and materialName are required`,
    );
  const namespace = new Map<string, string>();
  const add = (name: string, source: string) => {
    const k = canon(name);
    if (namespace.has(k))
      throw new DB1ValidationError(
        `${path}: identifier collision "${name}" between ${namespace.get(k)} and ${source}`,
      );
    namespace.set(k, source);
  };
  for (const [id, q] of Object.entries(material.questions)) {
    const k = canon(id);
    if (!QUESTION_ID.test(k))
      throw new DB1ValidationError(`${path}.questions: invalid key "${id}"`);
    if (canon(q.key) !== k)
      throw new DB1ValidationError(`${path}.questions.${id}: key mismatch`);
    assertIdentifier(q.name, `${path}.questions.${id}.name`);
    if (q.type !== "number")
      throw new DB1ValidationError(`${path}.questions.${id}: unsupported type`);
    add(k, `question ${id}`);
    add(q.name, `question name ${q.name}`);
  }
  for (const [id, v] of Object.entries(material.properties)) {
    const k = canon(id);
    if (!PROPERTY_ID.test(k))
      throw new DB1ValidationError(`${path}.properties: invalid key "${id}"`);
    if (!Number.isFinite(v))
      throw new DB1ValidationError(
        `${path}.properties.${id}: non-finite value`,
      );
    add(k, `property ${id}`);
  }
  if (!Object.keys(material.results).some((k) => canon(k) === "R_COST"))
    throw new DB1ValidationError(`${path}: R_Cost result is required`);
  for (const [id, r] of Object.entries(material.results)) {
    if (r === null) {
        continue;
    }
    const k = canon(id);
    if (!RESULT_ID.test(k))
      throw new DB1ValidationError(`${path}.results: invalid key "${id}"`);
    add(k, `result ${id}`);
    if (r.type === "constant") {
      if (!Number.isFinite(r.value))
        throw new DB1ValidationError(
          `${path}.results.${id}: non-finite constant`,
        );
    } else {
      if (typeof r.formula !== "string" || !r.formula.trim())
        throw new DB1ValidationError(`${path}.results.${id}: formula required`);
      const ast = parse(r.formula);
      const deps = extractVariables(ast);
      for (const dep of deps)
        if (!namespace.has(dep) && !GLOBALS.has(dep))
          throw new DB1ValidationError(
            `${path}.results.${id}: undefined variable "${dep}"`,
          );
      r.dependencies = deps.map(canon);
    }
  }
  const resultKeys = new Map<string, string>();
  for (const k of Object.keys(material.results)) resultKeys.set(canon(k), k);
  const visiting = new Set<string>(),
    done = new Set<string>();
  const visit = (k: string) => {
    if (done.has(k)) return;
    if (visiting.has(k))
      throw new DB1ValidationError(
        `${path}: circular result dependency involving ${k}`,
      );
    visiting.add(k);
    const r = material.results[resultKeys.get(k)!];
    if (r && r.type === "formula")
      for (const d of r.dependencies.map(canon))
        if (resultKeys.has(d)) visit(d);
    visiting.delete(k);
    done.add(k);
  };
  for (const k of resultKeys.keys()) visit(k);
}
export function validateDB1(input: unknown): DB1 {
  if (!input || typeof input !== "object")
    throw new DB1ValidationError("DB1 must be an object");
  const db = input as DB1;
  if (!Number.isInteger(db.versionId) || db.versionId < 1)
    throw new DB1ValidationError("versionId must be a positive integer");
  if (!db.updatedAt || Number.isNaN(Date.parse(db.updatedAt)))
    throw new DB1ValidationError("updatedAt must be a valid ISO date");
  if (!Array.isArray(db.sheets) || !db.sheets.length)
    throw new DB1ValidationError(
      "DB1 must contain at least one material sheet",
    );
  const sheets = new Set<string>(),
    ids = new Set<string>();
  for (const s of db.sheets) {
    if (!s.sheetName || s.type !== "material" || !Number.isInteger(s.order))
      throw new DB1ValidationError("Invalid material sheet metadata");
    const sk = canon(s.sheetName);
    if (sheets.has(sk))
      throw new DB1ValidationError(`Duplicate sheet "${s.sheetName}"`);
    sheets.add(sk);
    if (!Array.isArray(s.materials) || !s.materials.length)
      throw new DB1ValidationError(`Sheet "${s.sheetName}" has no materials`);
    for (const m of s.materials) {
      if (ids.has(m.materialId))
        throw new DB1ValidationError(`Duplicate materialId "${m.materialId}"`);
      ids.add(m.materialId);
      validateMaterial(m, `sheets.${s.sheetName}.${m.materialId}`);
    }
  }
  const costs = (name: string, v: unknown) => {
    if (!Array.isArray(v))
      throw new DB1ValidationError(`${name} must be an array`);
    const seen = new Set<string>();
    for (const x of v as any[]) {
      if (
        !x ||
        typeof x.type !== "string" ||
        !x.type.trim() ||
        !Number.isFinite(x.cost) ||
        x.cost < 0
      )
        throw new DB1ValidationError(`Invalid ${name} cost option`);
      const k = canon(x.type);
      if (seen.has(k))
        throw new DB1ValidationError(`Duplicate ${name} option "${x.type}"`);
      seen.add(k);
    }
  };
  costs("branding", db.branding);
  costs("labor", db.labor);
  return db;
}
