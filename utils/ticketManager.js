const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const config = require('../config.json');

module.exports = async function ticketManager(client, message) {
  // Skip if not in a text channel or not a ticket
  if (
    message.author.bot ||
    message.channel.type !== ChannelType.GuildText ||
    !message.channel.name.startsWith('partner')
  ) return;

  // Only trigger if message contains a Discord invite link
  const inviteRegex = /https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\/[^\s)]+/i;
  if (!inviteRegex.test(message.content)) return;

  const cooldownKey = `adCooldown_${message.channel.id}`;

  if (await db.get(cooldownKey)) return; // Cooldown active

  // Activate 5s cooldown
  await db.set(cooldownKey, true);
  setTimeout(() => db.delete(cooldownKey), 5000);

  const logChannelId = await db.get('logChannel');
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${message.author.username} - [#${message.channel.name}]`)
    .setDescription(message.content)
    .setColor('Blue')
    .setFooter({ text: config.embedFooterText, iconURL: config.embedFooterIcon })
    .setTimestamp();

  const acceptBtn = new ButtonBuilder()
    .setCustomId(`accept_${message.author.id}_${message.id}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success);

  const rejectBtn = new ButtonBuilder()
    .setCustomId(`reject_${message.author.id}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

  // Log to staff channel
  await logChannel.send({ embeds: [embed], components: [row] });

  // Confirm to user in ticket
  await message.channel.send({
    content: `<@${message.author.id}> your partnership ad has been submitted to staff! Please wait for approval.\n-# Note: Approval might take a while since the admin could be busy or not around.`,
  });
};
