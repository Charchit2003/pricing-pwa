import { getDatabase } from "./database";
import type { DB1 } from "../types/db1";
import { validateDB1 } from "../pricing/db1Validation";
const KEY="active";
export async function saveDB1(config:DB1){const db=await getDatabase();const value=validateDB1(structuredClone(config));const tx=db.transaction("db1","readwrite");await tx.store.put(value,KEY);await tx.done;}
export async function getDB1(){const value=await (await getDatabase()).get("db1",KEY);return value?validateDB1(value):undefined;}
export async function getDB1Version(){return (await getDB1())?.versionId??0;}
