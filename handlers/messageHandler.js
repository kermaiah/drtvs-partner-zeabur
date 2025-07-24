// ========================
// ✅ handlers/messageHandler.js
// ========================
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const config = require('../config.json');

module.exports = async function messageHandler(client, message) {
  if (message.author.bot) return;
  if (!message.channel.name.includes('ticket')) return;

  // 👇 Remove zero-width characters (like \u200B, \u200C, etc.)
  const cleanedContent = message.content.replace(/[\u200B-\u200D\uFEFF|\s]+/g, '');

  // 👇 Regex runs on cleaned content
  const inviteRegex = /https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\/[\w-]+/gi;
  if (!inviteRegex.test(cleanedContent)) return;

  const staffChannelId = await db.get('publicChannel');
  const staffChannel = await client.channels.fetch(staffChannelId).catch(() => null);
  if (!staffChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${message.author.tag} - [Request]`)
    .setDescription(message.content)
    .setFooter({ text: config.embedFooterText, iconURL: config.embedFooterIcon })
    .setTimestamp()
    .setColor('Yellow');

  const accept = new ButtonBuilder()
    .setCustomId(`accept_${message.author.id}_${message.id}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success);

  const reject = new ButtonBuilder()
    .setCustomId(`reject_${message.author.id}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(accept, reject);

  await staffChannel.send({ embeds: [embed], components: [row] });

  await message.channel.send({
    content: `<@${message.author.id}> Your partnership request has been submitted to staff! Please wait for approval.\n-# Note: Approval might take a while since the admin could be busy or not around.`,
  });
};
