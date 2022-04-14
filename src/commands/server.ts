import { SlashCommandBuilder } from "@discordjs/builders";
import { exec } from "child_process";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { logger } from "../bot";
import { changeStatus } from "../utils";

// Production Ready flag
export const stable = true;

// Services
export const services = ["7dtd", "valheim", "minecraft", "csgo", "satisfactory"];

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("server")
  .setDescription("Start/stop a service on [server.chis.dev]")
  .setDefaultPermission(false)
  .addStringOption((option) =>
    option
      .setName("service")
      .setDescription("Select a service")
      .setRequired(true)
      .addChoice("7 Days to Die", "7dtd")
      .addChoice("Valheim (PW: jrisawesome)", "valheim")
      .addChoice("Minecraft", "minecraft")
      .addChoice("CS:GO Bhop", "csgo")
      .addChoice("Satisfactory (Port: 7778)", "satisfactory")
  )
  .addStringOption((option) =>
    option
      .setName("state")
      .setDescription("Select a state")
      .setRequired(true)
      .addChoice("Start", "start")
      .addChoice("Stop", "stop")
  );

// Embedded Message Reply
function embed(service: string, state: string) {
  return new MessageEmbed()
    .setColor("#FFC0CB")
    .setTitle("Game Servers")
    .setURL("https://chis.dev/?category=server")
    .setAuthor({
      name: "Chis Bot",
      iconURL:
        "https://cdn.discordapp.com/app-icons/724657775652634795/22a8bc7ffce4587048cb74b41d2a7363.png?size=512",
      url: "https://chis.dev/chis-botjs/",
    })
    .setDescription("Thank you for using my bot :)")
    .addField("Service", service, true)
    .addField("Request", state, true)
    .setTimestamp()
    .setFooter({
      text: "server.chis.dev",
      iconURL:
        "https://cdn.discordapp.com/avatars/219152343588012033/4c7053ce4c177cdab007d986c47b9410.webp?size=512",
    });
}

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  const state = interaction.options.getString("state")!;
  const service = interaction.options.getString("service")!;

  logger.warn(
    `${interaction.user.id}: ${interaction.user.username} is trying to ${state} ${service}.`
  );

  // Docker Command
  exec(`docker ${state} ${service}`, (error, stdout, stderr) => {
    if (error) {
      logger.error(`${error.message}`);
      return;
    }
    if (stderr) {
      logger.info(`stderr: ${stderr}`);
      return;
    }
    const output = stdout;
    logger.info(`stdout: ${stdout}`);
  });
  await interaction.reply({
    embeds: [embed(service, state)],
    ephemeral: true,
  });

  // Check Status of Services
  await changeStatus(interaction.client);
}
