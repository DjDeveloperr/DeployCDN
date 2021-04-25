import { FSSClient } from "./client.ts";

export const fs = new FSSClient(
  Deno.env.get("SERVER")!,
  Deno.env.get("TOKEN")!
);

await fs.query(
  "CREATE TABLE IF NOT EXISTS entries (name TEXT PRIMARY KEY, type INTEGER NOT NULL, url TEXT, created TEXT NOT NULL, ext TEXT)"
);

export enum EntryType {
  URL,
  File,
}

export interface Entry {
  name: string;
  type: EntryType;
  url?: string;
  created: string;
  ext?: string;
}

export async function getEntry(name: string): Promise<Entry | undefined> {
  const e = await fs.query("SELECT * FROM entries WHERE name = ?", [name]);
  return e[0];
}

export async function existsEntry(name: string): Promise<boolean> {
  const e = await fs.query("SELECT FROM entries WHERE name = ?", [name]);
  return typeof e[0] !== "undefined";
}

export async function addEntry(
  name: string,
  type: EntryType,
  urlOrExt?: string
) {
  await fs.query(
    `INSERT INTO entries(name, type, created${
      urlOrExt ? (type === EntryType.URL ? ", url" : ", ext") : ""
    }) VALUES(?, ?, ?${urlOrExt ? ", ?" : ""})`,
    [name, type, Date.now().toString(), urlOrExt]
  );
}

export async function deleteEntry(name: string) {
  const exists = await existsEntry(name);
  if (!exists) return false;
  await fs.rm(name).catch(() => {});
  await fs.query(`DELETE FROM entries WHERE name = ?`, [name]);
  return true;
}

export async function createURLEntry(name: string, url: string) {
  await addEntry(name, EntryType.URL, url);
}

export async function createFileEntry(
  name: string,
  contents: Uint8Array,
  ext?: string
) {
  await fs.write(name, contents);
  await addEntry(name, EntryType.File, ext);
}
