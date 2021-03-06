import { SlashCommandBuilder } from "@discordjs/builders";
import { AutocompleteInteraction, CommandInteraction } from "discord.js";
import { Searcher } from "fast-fuzzy";
import moment from "moment";
import { Database } from "../database";
import { allowedTimeZones, MAX_DISCORD_CHOICES, statusEmbed } from "../utils";

const TZ_SEARCHER = new Searcher(allowedTimeZones);

export const stable = true;

// Slash command
export const data = new SlashCommandBuilder()
  .setName("timezone")
  .setDescription("Configure your personal timezone")
  .addStringOption((option) =>
    option
      .setName("timezone")
      .setDescription("Name of the timezone in which you wish to see plan times")
      .setRequired(true)
      .setAutocomplete(true)
  );

// Slash command options autocomplete
export const autocomplete = {
  timezone: async (interaction: AutocompleteInteraction, input: string): Promise<void> => {
    const matches = TZ_SEARCHER.search(input);
    matches.length = Math.min(matches.length, MAX_DISCORD_CHOICES);

    await interaction.respond(
      matches.map((match) => {
        return {
          name: match,
          value: match,
        };
      })
    );
  },
};

// On Interaction Event
export async function run(interaction: CommandInteraction) {
  const data = new Database(interaction.guild!.id);

  // Get arguments
  const timezoneArg = interaction.options.getString("timezone");
  if (timezoneArg === null) {
    return;
  }

  // Verify timezone is real
  const tz = moment.tz.zone(timezoneArg);
  if (tz === null) {
    await interaction.reply({
      embeds: [
        statusEmbed({
          level: "error",
          message: `\`${timezoneArg}\` is not a valid timezone`,
        }),
      ],
      ephemeral: true,
    });
    return;
  }

  // Save the timezone
  await data.saveUserTz(interaction.user.id, timezoneArg);

  await interaction.reply({
    embeds: [
      statusEmbed({
        level: "success",
        title: "Timezone Saved",
        message:
          `Your timezone has been set to \`${timezoneArg}\`.\n \`/plan time\` option will now use your locale.\n` +
          "\n**Example Time Inputs:**\n `9`\n`Tomorrow at noon`\n`Friday at 7am`\n`This is at 2.30`",
      }),
    ],
    ephemeral: true,
  });
}
