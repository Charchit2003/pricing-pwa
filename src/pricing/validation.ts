import type { DB1 } from "../types/db1";
import type { Quote, QuoteMaterial, QuoteSection } from "../types/db2";
import { validateDB1 as validateDB1Strict, DB1ValidationError } from "./db1Validation";

export interface ValidationError {
  path: string;
  message: string;
}

const canon = (value: string) => value.trim().toUpperCase();

export function validateDB1(db: unknown): ValidationError[] {
  try {
    validateDB1Strict(db);
    return [];
  } catch (error) {
    if (error instanceof DB1ValidationError) {
      const message = error.message;
      const separator = message.indexOf(": ");
      return [{
        path: separator >= 0 ? message.slice(0, separator) : "db",
        message: separator >= 0 ? message.slice(separator + 2) : message,
      }];
    }
    return [{ path: "db", message: error instanceof Error ? error.message : "Invalid DB1" }];
  }
}

export function validateQuote(quote: Quote, config: DB1): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!quote.id || !/^[0-9a-f-]{36}$/i.test(quote.id)) errors.push({ path: "id", message: "Quote ID is invalid" });
  if (!quote.displayName?.trim()) errors.push({ path: "displayName", message: "Customer / Quote name is required" });
  if (!Number.isInteger(quote.versionId) || quote.versionId < 1) errors.push({ path: "versionId", message: "Configuration version is invalid" });
  for (const sheet of config.sheets) {
    const section = quote.sections?.[sheet.sheetName];
    if (!section) errors.push({ path: sheet.sheetName, message: "Section is missing" });
    else validateSection(sheet, section, errors);
  }
  for (const key of Object.keys(quote.sections ?? {})) {
    if (!config.sheets.some((s) => s.sheetName === key)) errors.push({ path: key, message: "Unknown section" });
  }
  return errors;
}

function validateSection(sheet: DB1["sheets"][number], section: QuoteSection, errors: ValidationError[]) {
  if (!section.branding?.type) errors.push({ path: `${sheet.sheetName}.branding`, message: "Branding is required" });
  else if (!Number.isFinite(section.branding.cost) || section.branding.cost < 0) errors.push({ path: `${sheet.sheetName}.branding.cost`, message: "Branding cost must be non-negative" });
  if (!section.labor?.type) errors.push({ path: `${sheet.sheetName}.labor`, message: "Labor is required" });
  else if (!Number.isFinite(section.labor.cost) || section.labor.cost < 0) errors.push({ path: `${sheet.sheetName}.labor.cost`, message: "Labor cost must be non-negative" });
  if (!Array.isArray(section.materials) || section.materials.length === 0) { errors.push({ path: `${sheet.sheetName}.materials`, message: "At least one material is required" }); return; }
  section.materials.forEach((m, i) => {
    const def = sheet.materials.find((x) => x.materialId === m.materialId);
    if (!def) errors.push({ path: `${sheet.sheetName}.materials[${i}]`, message: `Material "${m.material}" no longer exists` });
    else validateMaterial(sheet.sheetName, i, def, m, errors);
  });
}

function validateMaterial(sheetName: string, index: number, definition: DB1["sheets"][number]["materials"][number], quoteMaterial: QuoteMaterial, errors: ValidationError[]) {
  for (const [id, q] of Object.entries(definition.questions)) {
    const entered = quoteMaterial.questions?.[id]?.value;
    if (q.required && (entered === undefined || !Number.isFinite(entered))) errors.push({ path: `${sheetName}.materials[${index}].${id}`, message: `${q.label} is required` });
  }
  for (const [id, v] of Object.entries(quoteMaterial.questions ?? {})) if (!Number.isFinite(v?.value)) errors.push({ path: `${sheetName}.materials[${index}].${id}`, message: "Question value must be a valid number" });
  for (const [id, v] of Object.entries(quoteMaterial.properties ?? {})) if (!Number.isFinite(v)) errors.push({ path: `${sheetName}.materials[${index}].properties.${id}`, message: "Property value must be finite" });
  for (const [id, v] of Object.entries(quoteMaterial.results ?? {})) if (!Number.isFinite(v?.value)) errors.push({ path: `${sheetName}.materials[${index}].results.${id}`, message: "Result value must be finite" });
  if (!Object.keys(quoteMaterial.results ?? {}).some((k) => canon(k) === "R_COST")) errors.push({ path: `${sheetName}.materials[${index}].results.R_Cost`, message: "R_Cost is required" });
}
