export class BadRequestError extends Error {
  name = "BadRequestError";
}

export class InternalServerError extends Error {
  name = "InternalServerError";
}

export class FSSClient {
  constructor(public server: string, public token: string) {}

  async request(
    command: string,
    fields: Record<string, string> = {},
    file?: { name: string; data: Uint8Array }
  ) {
    const body = new FormData();
    body.append("command", command);

    for (const [k, v] of Object.entries(fields)) {
      body.append(k, v);
    }

    if (file) {
      body.append("file", new Blob([file.data]), file.name);
    }

    return fetch(this.server + "/api", {
      method: "POST",
      headers: {
        authorization: this.token,
      },
      body,
    }).then(async (r) => {
      if (r.status === 401) throw new Error("Invalid token");
      if (r.status === 501 || r.status === 400) {
        const err = (await r.json()).error;
        if (r.status === 501) throw new InternalServerError(err);
        else throw new BadRequestError(err);
      }
      return r;
    });
  }

  async read(path: string) {
    return this.request("read", { path })
      .then((r) => r.arrayBuffer())
      .then((buf) => new Uint8Array(buf));
  }

  async write(path: string, contents: Uint8Array) {
    await this.request("write", {}, { name: path, data: contents });
  }

  async lstat(path: string): Promise<Deno.FileInfo> {
    return this.request("lstat", { path }).then((r) => r.json());
  }

  async readdir(path: string): Promise<Deno.DirEntry> {
    return this.request("readdir", { path }).then((r) => r.json());
  }

  async rm(path: string) {
    await this.request("rm", { path });
  }

  async mkdir(path: string) {
    await this.request("mkdir", { path });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.request("sql", {
      query: sql,
      params: JSON.stringify(params),
    }).then((e) => e.json());
  }
}
