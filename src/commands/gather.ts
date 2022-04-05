import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Message, MessageEmbed } from "discord.js";
import { Database } from "../database";

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("gather")
  .setDescription("Mention all participants");

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  // Establish Connection To Database
  const data = new Database(interaction.guild!.id);

  // Get Participants
  data.read().then(async (plan) => {
    if (plan) {
      if (!plan.participants.length) {
        // Send Missing player Embed
        await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setTitle(":warning: Warning")
              .setDescription("Currently no participants to mention."),
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

      // Save Last Message
      interaction.fetchReply().then(async (message) => {
        if (!("channelId" in message)) {
          return;
        }

        await data.lastMessage(message.channelId, message.id);
      });
    } else {
      // Send Error Embed
      await interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor("RED")
            .setTitle(":warning: Warning")
            .setDescription("Plan not created."),
        ],
        ephemeral: true,
      });
    }
  });
}
