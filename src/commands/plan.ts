import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Database } from "../database";
import { embed } from "../utils";

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("plan")
  .setDescription("Create a plan (This will overwrite any existing plans)")
  .addStringOption((option) =>
    option
      .setName("title")
      .setDescription("The title of the plan")
      .setRequired(false)
  )
  .addIntegerOption((option) =>
    option
      .setName("spots")
      .setDescription("The number of spots in the plan")
      .setRequired(false)
  );

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  const user = interaction.user;
  const title =
    interaction.options.getString("title") ||
    ":notebook_with_decorative_cover: Game Plan";
  const spots = interaction.options.getInteger("spots") || 10;

  // Establish Connection To Database
  const data = new Database(interaction.guild!.id);

  // Delete Previous Message
  data.read().then(async (plan) => {
    if (plan)
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
  });

  // Join Plan
  data.create(user.id, title, spots).then(async (plan) => {
    // Send Embed
    await interaction.reply({
      embeds: [embed(plan.title, plan.spots, plan.participants)],
      ephemeral: false,
    });

    // Save Last Message
    interaction.fetchReply().then(async (message) => {
      await data.lastMessage(message.channelId, message.id);
    });
  });
}
