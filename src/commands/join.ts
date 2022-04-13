import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { logger } from "../bot";
import { Database } from "../database";
import { embed, messageExists, statusEmbed } from "../utils";

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join the plan")
  .addUserOption((option) =>
    option.setName("member").setDescription("The member to add").setRequired(false)
  );

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  const user = interaction.options.getUser("member") || interaction.user;

  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild.id);

  // Join Plan
  const plan = await data.join(user.id);

  if (plan) {
    // Delete Previous Message
    const message = await messageExists(interaction.guild, plan.channelId, plan.messageId);

    if (message) await message.delete().catch((error) => logger.error(error));

    // Send Embed
    await interaction.reply({
      embeds: [embed(plan.title, plan.spots, plan.participants, plan.time)],
      ephemeral: false,
    });

    // Save Last Message
    const replyMessage = await interaction.fetchReply();
    if (!("channelId" in replyMessage)) return;
    await data.lastMessage(replyMessage.channelId, replyMessage.id);
  } else {
    // Send Error Embed
    await interaction.reply({
      embeds: [statusEmbed({ level: "error", message: "Unable to join the current plan." })],
      ephemeral: true,
    });
  }
}
