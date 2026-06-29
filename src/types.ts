import type { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';

export type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: CommandData;
  cooldown?: number;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface QuoteParseResult {
  quoteText: string;
  quotedPersons: string[];
}

export interface QuoteConfig {
  type: 'single' | 'category';
  id: string;
  name: string;
}
