import { serve, json } from "https://deno.land/x/sift@0.3.0/mod.ts";
import {
  createFileEntry,
  createURLEntry,
  deleteEntry,
  existsEntry,
  fs,
  getEntry,
} from "./cdn.ts";
import { EntryType } from "./common.ts";
import "./slash.ts";

const empty = new Response(null, { status: 204 });

serve({
  "/": () =>
    new Response("What?", { headers: { "Content-Type": "text/html" } }),
  "/api/files": async (req): Promise<any> => {
    if (req.method !== "POST")
      return json({ error: "Method not allowed" }, { status: 400 });

    if (req.headers.get("authorization") !== fs.token)
      return json({ error: "Not authorized" }, { status: 401 });

    const form = await req.formData();
    const name = form.get("name");
    if (typeof name !== "string" || name === null)
      return json({ error: "Name required in Form" }, { status: 400 });

    const exists = await existsEntry(name);
    if (exists) return json({ error: "Entry already exists" }, { status: 400 });

    const file = form.get("file");
    if (typeof file !== "object" || file === null)
      return json({ error: "File required in Form" }, { status: 400 });
    const ext = form.get("ext") ?? undefined;

    await createFileEntry(
      name,
      new Uint8Array(await file.arrayBuffer()),
      typeof ext === "string" ? ext : undefined
    );
    return empty;
  },
  "/api/urls": async (req): Promise<any> => {
    if (req.method !== "POST")
      return json({ error: "Method not allowed" }, { status: 400 });

    if (req.headers.get("authorization") !== fs.token)
      return json({ error: "Not authorized" }, { status: 401 });

    const data = await req.json();
    if (!data.name || !data.url)
      return json({ error: "Bad Request" }, { status: 400 });

    const { name, url } = data;
    const exists = await existsEntry(name);
    if (exists) return json({ error: "Entry already exists" }, { status: 400 });

    await createURLEntry(name, url);
    return empty;
  },
  "/api/entry/:name": async (req, params): Promise<any> => {
    if (req.headers.get("authorization") !== fs.token)
      return json({ error: "Not authorized" }, { status: 401 });

    if (req.method === "DELETE") {
      const deleted = await deleteEntry(params.name as string);
      if (!deleted)
        return json({ error: "Entry doesn't exist" }, { status: 404 });

      return empty;
    } else if (req.method === "GET") {
      const entry = await getEntry(params.name as string);
      if (!entry)
        return json({ error: "Entry doesn't exist" }, { status: 404 });
      return json(entry as any);
    } else {
      return json({ error: "Method not allowed" }, { status: 400 });
    }
  },
  "/:name": async (req, params): Promise<any> => {
    const name = params.name as string;
    const entry = await getEntry(name);
    if (!entry)
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });

    if (entry.type === EntryType.URL) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: entry.url!,
        },
      });
    } else if (entry.type === EntryType.File) {
      const file = await fs.read(name).catch(() => new Uint8Array(0));
      return new Response(file, {
        headers: {
          "content-type":
            entry.ext === undefined
              ? "application/octet-stream"
              : ["png", "gif", "apng", "webp", "jpg", "jpeg"].includes(
                  entry.ext.toLowerCase()
                )
              ? `image/${entry.ext}`
              : [
                  "js",
                  "ts",
                  "javascript",
                  "typescript",
                  "html",
                  "css",
                  "jsm",
                  "mjs",
                  "cjs",
                  "cs",
                  "cpp",
                  "h",
                  "c",
                  "hpp",
                  "rs",
                  "rust",
                  "py",
                  "swift",
                ].includes(entry.ext)
              ? `text/${entry.ext}`
              : entry.ext,
        },
      });
    } else
      return new Response("Hmm something went wrong", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
  },
});
