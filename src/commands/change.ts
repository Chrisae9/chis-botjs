import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import dotenv from "dotenv";
import moment from "moment";
import { logger } from "../bot";
import { Database } from "../database";
import { embed, messageExists, parseTime, statusEmbed } from "../utils";

dotenv.config();
const timezone = process.env.TIMEZONE!;

export const stable = true;

// Slash Command
export const data = new SlashCommandBuilder()
  .setName("change")
  .setDescription("Change an aspect of the plan")
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
  const user = interaction.user;
  var title = interaction.options.getString("title") || undefined;
  if (!title || title.length > 256) title = undefined;
  var spots = interaction.options.getInteger("spots") || undefined;
  if (!spots || spots > 20) spots = undefined;
  var time: moment.Moment | string | undefined = interaction.options.getString("time") || undefined;

  // Establish Connection To Database
  if (!interaction.guild) return;
  const data = new Database(interaction.guild!.id);

  // Grab User Timezone or Use Default
  var ref_timezone = (await data.getUserTz(user.id)) || timezone;

  // Parse Time Input
  if (time) {
    try {
      time = parseTime(time, ref_timezone);
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
  if (time) time = moment.tz(time, ref_timezone).toISOString();

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
