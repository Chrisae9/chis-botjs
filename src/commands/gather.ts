import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { Database } from "../database";
import { statusEmbed } from "../utils";

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("gather")
  .setDescription("Mention all participants");

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild.id);

  // Get Participants
  const plan = await data.read();
  if (plan) {
    if (!plan.participants.length) {
      // Send Missing player Embed
      await interaction.reply({
        embeds: [
          statusEmbed({ level: "warning", message: "Currently no participants to mention." }),
        ],
        ephemeral: true,
      });
      return;
    }

    const mention = plan.participants
      .map((participant: string, x: number) => `<@!${participant}>`)
      .join(` `);

    // Send Message
    await interaction.reply({
      content: mention,
      ephemeral: false,
    });
  } else {
    // Send Error Embed
    await interaction.reply({
      embeds: [statusEmbed({ level: "error", message: "Plan not created." })],
      ephemeral: true,
    });
  }
}
