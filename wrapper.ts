export class CDN {
  constructor(public server: string, public token: string) {}

  async request(path: string, options: RequestInit = {}) {
    options = Object.assign(
      { headers: { authorization: this.token } },
      options
    );

    return fetch(`${this.server}${path}`, options)
      .then(async (e) => {
        if (!e.ok) throw new Error(await e.json().then((e) => e.error));
        return e;
      })
      .then((r) => r.json());
  }

  async deleteEntry(name: string) {
    return this.request("/api/entries/" + name, { method: "DELETE" })
      .then(() => true)
      .catch(() => false);
  }

  async getEntry(name: string) {
    return this.request("/api/entries/" + name, { method: "GET" }).catch(
      () => undefined
    );
  }

  async uploadFile(name: string, contents: Uint8Array, ext?: string) {
    const body = new FormData();
    body.append("name", name);
    body.append("file", new Blob([contents]), name);
    if (ext) body.append("ext", ext);
    await this.request("/api/files", { method: "POST", body });
  }

  async shortenURL(name: string, url: string) {
    await this.request("/api/urls", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, url }),
    });
  }
}
