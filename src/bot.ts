import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, Intents } from "discord.js";
import dotenv from "dotenv";
import moment from "moment-timezone";
import fs from "node:fs";
import { exit } from "node:process";
import { createLogger, format, transports } from "winston";
import { changeStatus } from "./utils";

// Environment Vars
dotenv.config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const accessRole = process.env.ROLE_ID;
const timezone = process.env.TIMEZONE;
const environment = process.env.NODE_ENV;

if (!token || !clientId || !guildId || !accessRole || !timezone || !environment) {
  console.error("BOT CONFIG ERROR: Check .env file.");
  exit(1);
}

// logging
export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: () => moment().tz(timezone).format() }),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new transports.File({
      filename: "logs/warn.log",
      level: "warn",
    }),
    new transports.File({
      filename: "logs/combined.log",
    }),
    new transports.Console(),
  ],
});

// Load Commands
const commands = [];
const commandFiles = fs.readdirSync(`${__dirname}/commands`);

for (const file of commandFiles) {
  const command = require(`${__dirname}/commands/${file}`);
  if (command.stable || environment === "development") commands.push(command.data.toJSON());
}

const rest = new REST({ version: "9" }).setToken(token);

(async () => {
  try {
    logger.info("Started refreshing application (/) commands.");

    if (environment === "development") {
      // Guild Commands (testing)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
    } else {
      // Application Commands (production)
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
    }

    logger.info("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error(error);
  }
})();

// Initialize Bot
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Log into Discord
client.on("ready", async () => {
  logger.warn(`Logged in as ${client.user?.tag}!`);

  // Initial Running Service Check
  await changeStatus(client);

  // Set Bot Activity
  client.user?.setActivity("/plan & /server", { type: "LISTENING" });

  // Fetch Application
  if (!client.application?.owner) await client.application?.fetch();

  // Set Role For Server Command
  // client.application?.commands.fetch().then(async (commands) => {
  //   commands.forEach(async (command) => {
  //     if (command.name == "server") {
  //       await client.application?.commands.permissions.set({
  //         guild: guildId,
  //         command: command.id,
  //         permissions: [
  //           {
  //             id: accessRole,
  //             type: "ROLE",
  //             permission: true,
  //           },
  //         ],
  //       });
  //     }
  //   });
  // });
});

// Interaction Event Listener
client.on("interactionCreate", async (interaction) => {
  // Handle interaction
  if (interaction.isCommand()) {
    // Interaction is a command
    logger.warn(
      `${interaction.user.id}: ${interaction.user.username} issued the ${interaction.commandName} command.`
    );

    if (commandFiles.includes(`${interaction.commandName}.ts`)) {
      await require(`./commands/${interaction.commandName}.ts`).run(interaction);
    }
  } else if (interaction.isAutocomplete()) {
    // Interaction is an autocomplete event
    if (commandFiles.includes(`${interaction.commandName}.ts`)) {
      const cmdMod = require(`./commands/${interaction.commandName}.ts`);

      if ("autocomplete" in cmdMod) {
        // Autocomplete is configured for this command
        // Find the autocomplete handler for the specific option
        for (const optionName of Object.keys(cmdMod.autocomplete)) {
          // The autocomplete interaction will have a value for the option's name if the autocomplete is for that option
          const autocompleteInput = interaction.options.getString(optionName);
          if (autocompleteInput !== null) {
            // This auto-complete event is for this option
            await cmdMod.autocomplete[optionName](interaction, autocompleteInput);
          }
        }
      }
    }
  } else if (interaction && interaction.isButton()) {
    // Interaction is an button event

    // Grab the message interaction from the button interaction
    const messageInteraction = interaction.message.interaction;

    if (
      messageInteraction &&
      "commandName" in messageInteraction &&
      commandFiles.includes(`${messageInteraction.commandName}.ts`)
    ) {
      logger.warn(
        `${interaction.user.id}: ${interaction.user.username} pressed the ${interaction.component.label} from the ${messageInteraction.commandName} command.`
      );

      const cmdMod = require(`./commands/${messageInteraction.commandName}.ts`);

      if ("buttonResponse" in cmdMod) {
        // Buttons are configured for this command
        cmdMod.buttonResponse(interaction);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

// Check Running Services Every Hour
var checkminutes = 60;
var checkthe_interval = checkminutes * 60 * 1000;
setInterval(async function () {
  await changeStatus(client);
}, checkthe_interval);
