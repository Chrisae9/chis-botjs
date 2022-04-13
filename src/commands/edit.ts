import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { logger } from "../bot";
import dotenv from "dotenv";
import { Database } from "../database";
import { embed, messageExists, statusEmbed } from "../utils";
import { parseDate } from "chrono-node";
import moment from "moment";
import userTime from "user-time";

dotenv.config();
const timezone = process.env.TIMEZONE!;

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("edit")
  .setDescription("Edit an aspect of the plan")
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
  var title = interaction.options.getString("title") || undefined;
  if (!title || title.length > 256) title = undefined;
  var spots = interaction.options.getInteger("spots") || undefined;
  if (!spots || spots > 20) spots = undefined;
  var input_time = interaction.options.getString("time");

  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild!.id);

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
        user_time.diff(now) < 0
          ? (time = user_time)
          : (time = user_time.clone().add(1, "days").toISOString());
      }

      // If Fail, Use chrono-node Parser
      if (!time)
        time = parseDate(input_time, {
          timezone: moment.tz(ref_timezone).zoneAbbr(),
        }).toISOString();
    } catch (error) {
      // Send Time Error Embed
      await interaction.reply({
        embeds: [
          statusEmbed({
            level: "error",
            message: "Please specify a correct time.\nEx: `9pm`",
          }),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  // Convert Time to Right Timezone
  if (time) time = moment.tz(time, (await data.getUserTz(user.id)) || timezone).toISOString();

  // Change Plan
  const plan = await data.change(title, spots, time);

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
      embeds: [statusEmbed({ level: "error", message: "Plan not created." })],
      ephemeral: true,
    });
  }
}
