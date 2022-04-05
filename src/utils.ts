import { MessageEmbed } from "discord.js";
import { exec } from "child_process";
import { Client } from "discord.js";
import { logger } from "./bot";

export function embed(title: string, spots: number, participants: string[]) {
  var mention = "No one has joined the plan.";
  if (participants.length)
    mention = participants
      .map((participant: string, x: number) => `${x + 1}. <@!${participant}>`)
      .join(`\n`);
  return new MessageEmbed()
    .setColor("PURPLE")
    .setTitle(title)
    .setAuthor({
      name: "Chis Bot",
      iconURL:
        "https://cdn.discordapp.com/app-icons/724657775652634795/22a8bc7ffce4587048cb74b41d2a7363.png?size=512",
      url: "https://chis.dev/chis-botjs/",
    })
    .addField(`Participants (${participants.length}/${spots})`, mention)
    .addField(`Slash Commands`, `/join, /leave, /view, /plan, /rename, /gather`)
    .setTimestamp()
    .setFooter({
      text: "server.chis.dev",
      iconURL:
        "https://cdn.discordapp.com/avatars/219152343588012033/4c7053ce4c177cdab007d986c47b9410.webp?size=512",
    });
}

const services = ["7dtd", "valheim", "minecraft", "csgo"];

export async function changeStatus(client: Client): Promise<void> {
  // Wait for Docker Service To Start/Stop
  const delay = (ms: number | undefined) =>
    new Promise((res) => setTimeout(res, ms));
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
