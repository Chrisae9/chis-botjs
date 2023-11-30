import { SlashCommandBuilder } from "@discordjs/builders";
import { exec } from "child_process";
import { CommandInteraction, GuildInviteManager, GuildMemberRoleManager, MessageEmbed } from "discord.js";
import { logger } from "../bot";
import dotenv from "dotenv";
import { changeStatus, statusEmbed } from "../utils";

// Production Ready flag
export const stable = true;

dotenv.config();
const guildId = process.env.GUILD_ID!;
const roleId = process.env.ROLE_ID!;

// Services
export const services = ["7dtd", "valheim", "minecraft", "csgo", "satisfactory", "minecraft-skyblock", "factorio"];

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("server")
  .setDescription("Start/stop a service on [server.chis.dev]")
  .setDefaultMemberPermissions(0)
  .addStringOption((option) =>
    option
      .setName("service")
      .setDescription("Select a service")
      .setRequired(true)
      .addChoices(
        // { name: "7 Days to Die", value: "7dtd" },
        // { name: "Valheim (PW: jrisawesome)", value: "valheim" },
        { name: "Minecraft", value: "minecraft" },
        // { name: "Minecraft Skyblock (Port: 25566)", value: "minecraft-skyblock" },
        // { name: "CS:GO Bhop", value: "csgo" },
        { name: "Factorio", value: "factorio" },
        { name: "Satisfactory", value: "satisfactory" },
        )
  )
  .addStringOption((option) =>
    option
      .setName("state")
      .setDescription("Select a state")
      .setRequired(true)
      .addChoices(
        { name: "Start", value: "start"},
      {name: "Stop", value: "stop"}
      )
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
    .addFields(
      {name: "Service", value: service, inline: true},
      {name: "Request", value: state, inline: true }
      )
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
  
  if (!interaction.member) return;

  if (!(interaction.member.roles instanceof GuildMemberRoleManager)) return;


  if (interaction.guildId != guildId || !interaction.member.roles.cache.map((role) => role.id).includes(roleId)) {
    logger.warn(
      `${interaction.user.id}: ${interaction.user.username} denied.`
    );
    await interaction.reply({
      embeds: [statusEmbed({ level: "error", message: "Unable to access command." }),],
      ephemeral: true,
    });
    return
  }


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
