import { Guild, MessageEmbed } from "discord.js";
import { exec } from "child_process";
import { Client } from "discord.js";
import { logger } from "./bot";
import { services } from "./commands/server";

export const MAX_DISCORD_CHOICES = 25;

export function embed(title: string, spots: number, participants: string[], time?: string) {
  var mention = "No one has joined the plan.";
  if (participants.length)
    mention = participants
      .map((participant: string, x: number) => `${x + 1}. <@!${participant}>`)
      .join(`\n`);
  return new MessageEmbed()
    .setColor("PURPLE")
    .setTitle(title + (time ? ` @ <t:${Math.round(new Date(time).getTime() / 1000)}:t>` : ""))
    .setAuthor({
      name: "Chis Bot",
      iconURL:
        "https://cdn.discordapp.com/app-icons/724657775652634795/22a8bc7ffce4587048cb74b41d2a7363.png?size=512",
      url: "https://chis.dev/chis-botjs/",
    })
    .addField(`Participants (${participants.length}/${spots})`, mention)
    .addField(`Slash Commands`, `/join, /leave, /change, /view, /gather`)
    .setTimestamp()
    .setFooter({
      text: "server.chis.dev",
      iconURL:
        "https://cdn.discordapp.com/avatars/219152343588012033/4c7053ce4c177cdab007d986c47b9410.webp?size=512",
    });
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

  return await channel.messages.fetch(messageId).catch((error) => logger.error(error) && undefined);
}

var chrono = require('chrono-node')
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
