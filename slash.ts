import * as slash from "https://raw.githubusercontent.com/harmonyland/harmony/main/deploy.ts";
import { EntryType } from "./cdn.ts";
import { CDN } from "./wrapper.ts";

slash.init({ env: true });
const USERS = ["422957901716652033", "696828906191454221"];

const cdn = new CDN(Deno.env.get("SERVER")!, Deno.env.get("TOKEN")!);

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
  const entry = await cdn.getEntry(d.option<string>("name"));
  if (!entry) return d.reply("Entry not found.");
  d.reply({
    embeds: [
      {
        title: "CDN - " + entry.name,
        url: cdn.server + "/" + entry.name,
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

  await cdn.uploadFile(name, data);
  d.editResponse({
    content: `[Successfully uploaded file.](${cdn.server}/${name})`,
  });
});

slash.handle("short", (d) => {
  if (!checkUser(d)) return;
  const name = d.option<string>("name");
  const url = d.option<string>("url");

  cdn
    .shortenURL(name, url)
    .then(() => {
      d.reply(`[Shortened URL.](${cdn.server + "/" + name})`);
    })
    .catch(() => {
      d.reply("Failed to shorten URL. Entry already exists.");
    });
});

slash.handle("delete", (d) => {
  if (!checkUser(d)) return;
  cdn
    .deleteEntry(d.option<string>("name"))
    .then(() => {
      d.reply("Deleted entry.");
    })
    .catch(() => {
      d.reply("Failed to delete: entry not found.");
    });
});

slash.handle("*", (d) => d.reply("Unhandled command.", { ephemeral: true }));
slash.client.on("interactionError", console.log);
