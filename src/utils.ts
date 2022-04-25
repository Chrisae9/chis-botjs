import { exec } from "child_process";
import { Client, Guild, MessageEmbed } from "discord.js";
import moment from "moment-timezone";
import userTime from "user-time";
import { logger } from "./bot";
import { services } from "./commands/server";

export const MAX_DISCORD_CHOICES = 25;

export function embed(title: string, spots: number, participants: string[], time?: string) {
  var mention = "No one has joined the plan.";
  if (participants.length)
    mention = participants
      .map((participant: string, x: number) => `${x + 1}. <@!${participant}>`)
      .join(`\n`);
  var embed = new MessageEmbed();
  embed.setColor("PURPLE");
  embed.setAuthor({
    name: "Chis Bot",
    iconURL:
      "https://cdn.discordapp.com/app-icons/724657775652634795/22a8bc7ffce4587048cb74b41d2a7363.png?size=512",
    url: "https://chis.dev/chis-botjs/",
  });
  // embed.setTitle(title + (time ? ` @ <t:${Math.round(new Date(time).getTime() / 1000)}:t>` : ""));
  embed.setTitle(title);
  if (time) embed.addField(`Event Time`, `<t:${Math.round(new Date(time).getTime() / 1000)}:F>`);

  embed.addField(`Participants (${participants.length}/${spots})`, mention);
  embed.addField(`Slash Commands`, `/join, /leave, /change, /view, /gather`);
  embed.setTimestamp().setFooter({
    text: "server.chis.dev",
    iconURL:
      "https://cdn.discordapp.com/avatars/219152343588012033/4c7053ce4c177cdab007d986c47b9410.webp?size=512",
  });
  return embed;
}

/**
 * @returns An embed setup to look like an error.
 */
export function statusEmbed({
  level,
  title,
  message,
}: {
  level: "error" | "warning" | "info" | "success";
  title?: string;
  message: string;
}) {
  const color =
    level === "error"
      ? "RED"
      : level === "warning"
      ? "YELLOW"
      : level === "info"
      ? "BLUE"
      : "GREEN";
  const titleEmoji =
    level === "error"
      ? ":no_entry_sign:"
      : level === "warning"
      ? ":warning:"
      : level === "info"
      ? ":information_source:"
      : ":white_check_mark:";
  const titleBody =
    title !== undefined
      ? title
      : level === "error"
      ? "Error"
      : level === "warning"
      ? "Warning"
      : level === "info"
      ? "Information"
      : "Success";
  return new MessageEmbed()
    .setColor(color)
    .setTitle(`${titleEmoji} ${titleBody}`)
    .setDescription(message);
}

export async function changeStatus(client: Client): Promise<void> {
  // Wait for Docker Service To Start/Stop
  const delay = (ms: number | undefined) => new Promise((res) => setTimeout(res, ms));
  await delay(11000);

  logger.info("Updating client status.");

  exec(
    `docker ps --format "table {{.Names}}" | grep -w '${services.join("\\|")}'`,
    (error, stdout, stderr) => {
      if (stdout.length) {
        client.user?.setStatus("online");
      } else {
        client.user?.setStatus("idle");
      }
    }
  );
}

// Check If Message Exists Helper Method
export async function messageExists(guild: Guild, channelId: string, messageId: string) {
  if (!channelId || !messageId) return;

  const channel = await guild.channels
    .fetch(channelId)
    .catch((error) => logger.error(error) && null);

  if (channel === null || !channel.isText()) return;

  return await channel.messages
    .fetch(messageId)
    .catch((error: any) => logger.error(error) && undefined);
}

var chrono = require("chrono-node");
export var defaultPM = new chrono.Chrono();
defaultPM.refiners.push({
  refine: (context: any, results: any[]) => {
    // If there is no AM/PM (meridiem) specified,
    //  let all time between 1:00 - 4:00 be PM (13.00 - 16.00)
    results.forEach((result) => {
      const hour = result.start.get("hour");
      if (hour === null) return;
      if (!result.start.isCertain("meridiem") && hour >= 1 && hour < 12) {
        result.start.assign("meridiem", 1);
        result.start.assign("hour", hour + 12);
      }
    });
    return results;
  },
});

const deprecatedTimeZones = [
  "UCT",
  "PST8PDT",
  "GB",
  "MST7MDT",
  "EST5EDT",
  "W-SU",
  "CST6CDT",
  "HST",
  "MST",
  "Universal",
  "EET",
  "WET",
  "EST",
  "CET",
  "MET",
  "GMT",
  "Etc",
];
const deprecatedTimeZonesRegex = `^${deprecatedTimeZones.join("|^")}`;

export const allowedTimeZones = moment.tz
  .names()
  .filter(
    (timezone) => timezone.startsWith("A") || !new RegExp(deprecatedTimeZonesRegex).test(timezone)
  )
  .sort((timezoneA, timezoneB) => timezoneA.localeCompare(timezoneB))
  .map((timezone) => timezone);

export function parseTime(input_time: string, ref_timezone: string) {
  const now = moment();
  var time = undefined;
  // Start With user-time Parser
  if (input_time.match(/^\d/))
    time = userTime(input_time, { defaultTimeOfDay: "pm" }).formattedTime;

  // Add a Day If Time is Before Now
  if (time) {
    var user_time = moment(time, "h:m a").tz(ref_timezone, true);
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

  return time;
}
