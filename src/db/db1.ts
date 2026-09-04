import { getDatabase } from "./database";

import type { DB1 } from "../types/db1";

const DB1_KEY = "active";

export async function saveDB1(
  config: DB1
): Promise<void> {

  const db = await getDatabase();

  await db.put(
    "db1",
    config,
    DB1_KEY
  );
}

export async function getDB1():
  Promise<DB1 | undefined> {

  const db = await getDatabase();

  return db.get(
    "db1",
    DB1_KEY
  );
}

export async function getDB1Version():
  Promise<number> {

  const config = await getDB1();

  return config?.versionId ?? 0;
}