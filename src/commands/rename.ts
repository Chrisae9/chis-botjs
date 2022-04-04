import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Database } from "../database";
import { embed } from "../utils";

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
  const title = interaction.options.getString("title");

  // Establish Connection To Database
  const data = new Database(interaction.guild!.id);

  // Rename Plan
  data.rename(title).then(async (plan) => {
    if (title.length) {
      // Delete Previous Message
      interaction
        .guild!.channels.fetch(plan.channelId)
        .then(async (channel) => {
          channel.messages
            .fetch(plan.messageId)
            .then(async (message) => {
              await message.delete();
            })
            .catch((error) => {
              console.error(error);
            });
        })
        .catch((error) => {
          console.error(error);
        });

      // Send Embed
      await interaction.reply({
        embeds: [embed(plan.title, plan.spots, plan.participants)],
        ephemeral: false,
      });

      // Save Last Message
      interaction.fetchReply().then(async (message) => {
        console.log(message);
        await data.lastMessage(message.channelId, message.id);
      });
    } else {
      // Send Error Embed
      await interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor("RED")
            .setTitle(":warning: Warning")
            .setDescription("Please provide a valid title."),
        ],
        ephemeral: true,
      });
    }
  });
}
