import * as slash from "https://raw.githubusercontent.com/DjDeveloperr/harmony/refactor/deploy.ts";
import {
  createFileEntry,
  createURLEntry,
  deleteEntry,
  existsEntry,
  fs,
  getEntry,
} from "./cdn.ts";
import { EntryType } from "./common.ts";

const server = "https://cdn.deno.dev";

slash.init({
  publicKey: Deno.env.get("PUBLIC_KEY")!,
  token: Deno.env.get("BOT_TOKEN")!,
  path: "/api/interactions",
});
const USERS = ["422957901716652033", "696828906191454221"];

const commands: slash.SlashCommandPartial[] = [
  {
    name: "info",
    description: "View info about a CDN entry.",
    options: [
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "name",
        description: "Name of the entry.",
        required: true,
      },
    ],
  },
  {
    name: "delete",
    description: "Delete a CDN entry.",
    options: [
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "name",
        description: "Name of the entry.",
        required: true,
      },
    ],
  },
  {
    name: "short",
    description: "Shorten a URL.",
    options: [
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "name",
        description: "Name of the entry.",
        required: true,
      },
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "url",
        description: "URL to shorten.",
        required: true,
      },
    ],
  },
  {
    name: "upload",
    description: "Upload a file to CDN.",
    options: [
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "name",
        description: "Name of the entry.",
        required: true,
      },
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "url",
        description: "URL of the file.",
        required: true,
      },
      {
        type: slash.SlashCommandOptionType.STRING,
        name: "ext",
        description: "Optional extension.",
      },
    ],
  },
];

slash.commands.all().then((e) => {
  if (e.size !== commands.length) {
    slash.commands.bulkEdit(commands);
  }
});

function checkUser(d: slash.Interaction) {
  if (!USERS.includes(d.user.id)) {
    d.reply("You're not allowed to use this command.");
    return false;
  } else return true;
}

slash.handle("info", async (d) => {
  if (!checkUser(d)) return;
  const entry = await getEntry(d.option<string>("name"));
  if (!entry) return d.reply("Entry not found.");
  d.reply({
    embeds: [
      {
        title: "CDN - " + entry.name,
        url: server + "/" + entry.name,
        color: 0x43ae7d,
        fields: [
          {
            name: "Type",
            value: EntryType[entry.type] ?? "Unknown: " + entry.type,
            inline: true,
          },
          {
            name: "Created At",
            value: new Date(parseInt(entry.created)).toDateString(),
            inline: true,
          },
        ],
      },
    ],
  });
});

slash.handle("upload", async (d) => {
  if (!checkUser(d)) return;
  await d.defer();

  const name = d.option<string>("name");
  const url = d.option<string>("url");
  let ext = d.option<string | undefined>("ext");

  if (!ext) {
    if (url.includes("/") && url.includes(".")) {
      const last = url.split("/").pop();
      if (last) {
        const e = last.split(".").pop();
        if (e) ext = e.trim();
      }
    }
  }

  const res = await fetch(url);
  const data = await res
    .arrayBuffer()
    .then((e) => new Uint8Array(e))
    .catch(() => undefined);

  if (!res.ok || !data)
    return d.editResponse({ content: "Failed to fetch URL." });

  const exists = await existsEntry(name);
  if (exists) return d.editResponse({ content: "Entry already exists." });
  await createFileEntry(name, data);
  d.editResponse({
    content: `[Successfully uploaded file.](${server}/${name})`,
  });
});

slash.handle("short", async (d) => {
  if (!checkUser(d)) return;
  const name = d.option<string>("name");
  const url = d.option<string>("url");

  const exists = await existsEntry(name);
  if (exists) return d.editResponse({ content: "Entry already exists." });

  createURLEntry(name, url)
    .then(() => {
      d.reply(`[Shortened URL.](${server + "/" + name})`);
    })
    .catch((e) => {
      d.reply("Failed to shorten URL:" + e.message);
    });
});

slash.handle("delete", (d) => {
  if (!checkUser(d)) return;
  deleteEntry(d.option<string>("name"))
    .then((v) => {
      if (v !== true) throw new Error("");
    })
    .then(() => {
      d.reply("Deleted entry.");
    })
    .catch(() => {
      d.reply("Failed to delete: entry not found.");
    });
});

slash.handle("*", (d) => d.reply("Unhandled command.", { ephemeral: true }));

slash.client.on("interactionError", console.log);
