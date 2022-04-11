import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, Intents, ButtonInteraction } from "discord.js";
import fs from "node:fs";
import dotenv from "dotenv";
import { changeStatus } from "./utils";
import { createLogger, transports, format } from "winston";
import moment from "moment-timezone";

// Environment Vars
dotenv.config();
const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;
const accessRole = process.env.ROLE_ID!;
const timezone = process.env.TIMEZONE!;
const develop = process.env.DEVELOP!;

// logging
export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: moment().tz(timezone).format() }),
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
const buttonHandlers: { [key: string]: (interaction: ButtonInteraction) => Promise<void> } = {};
const commandFiles = fs.readdirSync(`${__dirname}/commands`);

for (const file of commandFiles) {
  const command = require(`${__dirname}/commands/${file}`);
  if (command.stable || parseInt(develop)) commands.push(command.data.toJSON());
    if ("buttons" in command) {
	   for (const customId of Object.keys(command.buttons)) {
		  if (customId in buttonHandlers) {
			 throw new Error(`Discord button interaction handler for '${customId}' was already defined`);
		  }
		  
		  buttonHandlers[customId] = command.buttons[customId];
	   }
    }
}

const rest = new REST({ version: "9" }).setToken(token);

(async () => {
  try {
    logger.info("Started refreshing application (/) commands.");

    if (parseInt(develop)) {
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
    // Handle interaction
    if (interaction.isCommand()) {
	   // Interaction is a command
	   logger.warn(
		  `${interaction.user.id}: ${interaction.user.username} issued the ${interaction.commandName} command}.`
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
    } else if (interaction.isButton()) {
	   // Interaction is a button event
	   if (interaction.customId in buttonHandlers) {
		  await buttonHandlers[interaction.customId](interaction);
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
