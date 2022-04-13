import { SlashCommandBuilder } from "@discordjs/builders";
import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton } from "discord.js";
import moment from "moment-timezone";
import dotenv from "dotenv";
import userTime from "user-time";
import { logger } from "../bot";
import { Database, Plan } from "../database";
import { defaultPM, embed, messageExists, statusEmbed } from "../utils";

dotenv.config();
const timezone = process.env.TIMEZONE!;

export const stable = true;

const PLAN_PROTECTION_SECONDS = 60 * 60 * 1; // 1 hour

var cacheMessage: { title: string; spots: number; time: string | undefined } | undefined =
  undefined;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("plan")
  .setDescription("Create a plan")
  .addStringOption((option) =>
    option.setName("title").setDescription("The title of the plan").setRequired(false)
  )
  .addIntegerOption((option) =>
    option.setName("spots").setDescription("The number of spots in the plan").setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("time")
      .setDescription(`Time of event. Use /timezone to set your locale. (Default ${timezone})`)
      .setRequired(false)
  );

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  //Grab State
  const now = moment();
  const user = interaction.user;
  var title = interaction.options.getString("title");
  if (!title || title.length > 256) title = ":notebook_with_decorative_cover: Game Plan";
  var spots = interaction.options.getInteger("spots") || 10;
  if (spots > 20) {
    spots = 20;
  }
  var input_time = interaction.options.getString("time");

  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild.id);

  // Grab User Timezone or Use Default
  var ref_timezone = (await data.getUserTz(user.id)) || timezone;

  // Parse Time Input
  var time = undefined;
  if (input_time) {
    try {
      // Start With user-time Parser
      if (input_time.match(/^\d/))
        time = userTime(input_time, { defaultTimeOfDay: "pm" }).formattedTime;

      // Add a Day If Time is Before Now
      if (time) {
        var user_time = moment.tz(time, "h:m a", ref_timezone);
        user_time.diff(now) > 0
          ? (time = user_time)
          : (time = user_time.clone().add(1, "days").toISOString());
      }

      // If Fail, Use chrono-node Parser
      if (!time)
        time = defaultPM
          .parseDate(input_time, {
            timezone: moment.tz(ref_timezone).zoneAbbr(),
          })
          .toISOString();
    } catch (error) {
      // Send Time Error Embed
      await interaction.reply({
        embeds: [
          statusEmbed({
            level: "error",
            message:
              "Please specify a correct time.\nExamples:\n `9` (Defaults to PM)\n`Tomorrow at noon`\n`Friday at 7am`\n`This is at 2.30`",
          }),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  // Convert Time to Right Timezone
  if (time) time = moment.tz(time, (await data.getUserTz(user.id)) || timezone).toISOString();

  // Read Plan
  var plan = await data.read();

  if (plan) {
    // Send Previous Message Warning
    const message = await messageExists(interaction.guild, plan.channelId, plan.messageId);
    if (message) {
      // Calculate Seconds Since Last Plan Activity
      const messageTime = moment(message.createdTimestamp);
      const timeDifference = now.diff(messageTime, "seconds");

      // Plan Protection
      if (timeDifference < PLAN_PROTECTION_SECONDS) {
        await interaction.reply({
          embeds: [
            embed(plan.title, plan.spots, plan.participants),
            statusEmbed({
              level: "warning",
              message: "Would you like overwrite the existing plan shown above?",
            }),
          ],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton().setCustomId("yes").setLabel("Yes").setStyle("PRIMARY"),
              new MessageButton().setCustomId("no").setLabel("No").setStyle("DANGER")
            ),
          ],
          ephemeral: true,
        });

        // Temporarily save data
        cacheMessage = { title: title, spots: spots, time: time };

        // Stop and don't create new plan. (Wait for button press)
        return;
      }
    }
  }

  // Create Plan
  plan = await data.create(user.id, title, spots, time);

  // Send Plan Embed
  await interaction
    .reply({
      embeds: [embed(plan.title, plan.spots, plan.participants, plan.time)],
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
          statusEmbed({
            level: "info",
            message: "To add yourself to the existing plan use `/join`.",
          }),
        ],
        components: [],
      });
    }

    // "Yes" Button Press
    if (interaction.component.customId == "yes") {
      // Update Button Message
      await interaction.update({
        embeds: [
          statusEmbed({
            level: "info",
            message: "Plan overwritten, you can dismiss this message.",
          }),
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
        const message = await messageExists(interaction.guild, plan.channelId, plan.messageId);

        if (message) {
          await message.delete().catch((error) => logger.error(error));
        }

        // Join Plan
        plan = await data.create(
          interaction.user.id,
          cacheMessage?.title || ":notebook_with_decorative_cover: Game Plan",
          cacheMessage?.spots || 10,
          cacheMessage?.time
        );
        // Send Embed
        const followUpMessage = await interaction.followUp({
          embeds: [embed(plan.title, plan.spots, plan.participants, plan.time)],
          ephemeral: false,
        });

        // Save Last Message
        if (!("channelId" in followUpMessage)) return;
        await data.lastMessage(followUpMessage.channelId, followUpMessage.id);
      }
    }
  }
}
