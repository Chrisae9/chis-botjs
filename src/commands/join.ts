import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed, CommandInteraction } from "discord.js";
import { Database } from "../database";
import { embed } from "../utils";

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join the plan")
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("The member to add")
      .setRequired(false)
  );

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  const user = interaction.options.getUser("member") || interaction.user;

  // Establish Connection To Database
  const data = new Database(interaction.guild!.id);

  // Join Plan
  data.join(user.id).then(async (plan) => {
    if (plan) {
      // Delete Previous Message
      interaction
        .guild!.channels.fetch(plan.channelId)
        .then(async (channel) => {
          channel!.messages
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
            .setDescription("Unable to join the current plan."),
        ],
        ephemeral: true,
      });
    }
  });
}
