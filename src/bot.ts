import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, Intents } from "discord.js";
import fs from "node:fs";
import dotenv from "dotenv";
import { changeStatus } from "./utils";

// Environment Vars
dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const accessRole = process.env.ROLE_ID;
const develop = process.env.DEVELOP;

// Load Commands
const commands = [];
const commandFiles = fs
  .readdirSync(`${__dirname}/commands`)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`${__dirname}/commands/${file}`);
  if (command.stable || parseInt(develop!))
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: "9" }).setToken(token!);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    if (parseInt(develop!)) {
      // Guild Commands (testing)
      await rest.put(Routes.applicationGuildCommands(clientId!, guildId!), {
        body: commands,
      });
    } else {
      // Application Commands (production)
      await rest.put(Routes.applicationCommands(clientId!), {
        body: commands,
      });
    }

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

// Initialize Bot
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Log into Discord
client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  // Initial Running Service Check
  await changeStatus(client);

  // Fetch Application
  if (!client.application?.owner) await client.application?.fetch();

  // Set Role For Server Command
  client.application?.commands.fetch().then(async (commands) => {
    commands.forEach(async (command) => {
      if (command.name == "server") {
        await client.application?.commands.permissions.set({
          guild: guildId,
          command: command.id,
          permissions: [
            {
              id: accessRole,
              type: "ROLE",
              permission: true,
            },
          ],
        });
      }
    });
  });
});

// Interaction Event Listener
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (commandFiles.includes(`${interaction.commandName}.js`)) {
    require(`./commands/${interaction.commandName}.js`).run(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);

// Check Running Services Every Hour
var checkminutes = 60;
var checkthe_interval = checkminutes * 60 * 1000;
setInterval(async function () {
  await changeStatus(client);
}, checkthe_interval);
