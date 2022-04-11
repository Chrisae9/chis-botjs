import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ButtonInteraction,
  CommandInteraction,
  Guild,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import moment from "moment-timezone";
import { logger } from "../bot";
import { Database, Plan } from "../database";
import { embed, messageExists } from "../utils";

export const stable = true;

const PLAN_PROTECTION_SECONDS = 60 * 60 * 1; // 1 hour

var cacheMessage: { title: string; spots: number } | undefined = undefined;

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
  //Grab State
  const user = interaction.user;
  var title = interaction.options.getString("title");
  if (!title || title.length > 256)
    title = ":notebook_with_decorative_cover: Game Plan";
  var spots = interaction.options.getInteger("spots") || 10;
  if (spots > 20) {
    spots = 20;
  }

  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild.id);

  // Read Plan
  var plan = await data.read();

  if (plan) {
    // Send Previous Message Warning
    const message = await messageExists(
      interaction.guild,
      plan.channelId,
      plan.messageId
    );
    if (message) {
      // Calculate Seconds Since Last Plan Activity
      const now = moment();
      const messageTime = moment(message.createdTimestamp);
      const timeDifference = now.diff(messageTime, "seconds");

      // Plan Protection
      if (timeDifference < PLAN_PROTECTION_SECONDS) {
        await interaction.reply({
          embeds: [
            embed(plan.title, plan.spots, plan.participants),
            new MessageEmbed()
              .setColor("YELLOW")
              .setTitle(":warning: Plan Recently Used")
              .setDescription(
                "Would you like overwrite the existing plan shown above?"
              ),
          ],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("yes")
                .setLabel("Yes")
                .setStyle("PRIMARY"),
              new MessageButton()
                .setCustomId("no")
                .setLabel("No")
                .setStyle("DANGER")
            ),
          ],
          ephemeral: true,
        });

        // Temporarily save data
        cacheMessage = { title: title, spots: spots };

        // Stop and don't create new plan. (Wait for button press)
        return;
      }
    }
  }

  // Create Plan
  plan = await data.create(user.id, title, spots);

  // Send Plan Embed
  await interaction
    .reply({
      embeds: [embed(plan.title, plan.spots, plan.participants)],
      ephemeral: false,
    })
    .catch((error) => logger.error(error));

  // Save Last Message Sent to Discord
  const replyMessage = await interaction.fetchReply();

  if (!("channelId" in replyMessage)) return;
  await data.lastMessage(replyMessage.channelId, replyMessage.id);
}

export async function buttonResponse(interaction: ButtonInteraction) {
  if (interaction.component.type == "BUTTON") {
    //"No" Button Press
    if (interaction.component.customId == "no") {
      await interaction.update({
        embeds: [
          new MessageEmbed()
            .setColor("BLUE")
            .setTitle(":information_source:  Information")
            .setDescription(
              "To add yourself to the existing plan use `/join`."
            ),
        ],
        components: [],
      });
    }

    // "Yes" Button Press
    if (interaction.component.customId == "yes") {
      // Update Button Message
      await interaction.update({
        embeds: [
          new MessageEmbed()
            .setColor("BLUE")
            .setTitle(":information_source: Information")
            .setDescription("Plan overwritten, you can dismiss this message."),
        ],
        components: [],
      });

      // Establish Connection To Database
      const data = new Database(interaction.guild!.id);

      // Read Plan
      var plan: void | Plan | null = await data.read();

      // Delete Previous Message
      if (!interaction.guild) return;

      if (plan) {
        const message = await messageExists(
          interaction.guild,
          plan.channelId,
          plan.messageId
        );

        if (message) {
          await message.delete().catch((error) => logger.error(error));
        }

        // Join Plan
        plan = await data.create(
          interaction.user.id,
          cacheMessage?.title || ":notebook_with_decorative_cover: Game Plan",
          cacheMessage?.spots || 10
        );
        // Send Embed
        const followUpMessage = await interaction.followUp({
          embeds: [embed(plan.title, plan.spots, plan.participants)],
          ephemeral: false,
        });

        // Save Last Message
        if (!("channelId" in followUpMessage)) return;
        await data.lastMessage(followUpMessage.channelId, followUpMessage.id);
      }
    }
  }
}
