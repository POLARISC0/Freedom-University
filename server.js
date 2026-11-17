import { ChannelType } from "discord.js";

// Finding things on the server by name, whatever their case.
export const same = (a, b) => a.toLowerCase() === b.toLowerCase();
export const TEXT_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum];

export const findRole = (guild, name) => guild.roles.cache.find((r) => same(r.name, name));
export const findChannel = (guild, name) => guild.channels.cache.find((c) => TEXT_TYPES.includes(c.type) && same(c.name, name));
export const findCategory = (guild, name) => guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && same(c.name, name));

/** Turns "#wins" in a message into a clickable channel link, when the channel exists. */
export const linkChannels = (guild, text) => text.replace(/#([a-z0-9-]+)/g, (m, name) => (findChannel(guild, name) ? `<#${findChannel(guild, name).id}>` : m));
