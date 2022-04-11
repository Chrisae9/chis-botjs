import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { logger } from "../bot";
import { Database } from "../database";
import { embed, messageExists, statusEmbed } from "../utils";

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("rename")
  .setDescription("Rename the plan")
  .addStringOption((option) =>
    option.setName("title").setDescription("The new title").setRequired(true)
  );

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  var title = interaction.options.getString("title");
  if (!title || title.length > 256) {
    title = ":notebook_with_decorative_cover: Game Plan";
  }

  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild!.id);

  // Rename Plan
  const plan = await data.rename(title);

  if (plan) {
    // Delete Previous Message
    const message = await messageExists(interaction.guild, plan.channelId, plan.messageId);

    if (message) await message.delete().catch((error) => logger.error(error));

    // Send Embed
    await interaction.reply({
      embeds: [embed(plan.title, plan.spots, plan.participants)],
      ephemeral: false,
    });

    // Save Last Message
    const replyMessage = await interaction.fetchReply();
    if (!("channelId" in replyMessage)) return;
    await data.lastMessage(replyMessage.channelId, replyMessage.id);
  } else {
    // Send Error Embed
    await interaction.reply({
      embeds: [statusEmbed({ level: "error", message: "Plan not created." })],
      ephemeral: true,
    });
  }
}
