// ============================
// ✅ index.js (Updated)
// ============================
const {
  Client,
  GatewayIntentBits,
  Collection,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  Events,
  PermissionsBitField // ✅ Add this line
} = require('discord.js');
const fs = require('fs');
const express = require('express');
const PORT = 3000;
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Slash + Button Handler
client.on('interactionCreate', async interaction => {
  const interactionHandler = require('./handlers/interactionHandler');
  await interactionHandler(interaction);

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'There was an error executing this command.', flags: 64 });
    }
  }
});

// Ad Detection in Ticket
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const isTicket = message.channel.name?.startsWith('partner-');
  if (!isTicket) return;

  // Check if this ticket belongs to the sender
  const { QuickDB } = require('quick.db');
  const db = new QuickDB();
  const ticketOwnerId = await db.get(`ticket_${message.author.id}`);
  const isTicketOwner = ticketOwnerId === message.channel.id;

  const hasInvite = /discord\.gg\/([a-zA-Z0-9-]+)/i.test(message.content);
  const inviteCode = message.content.match(/discord\.gg\/([a-zA-Z0-9-]+)/i)?.[1];

  // Allow admins or bot or if not invite link
  if (!hasInvite || message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  // If user is not the ticket creator, block them from sending invites
  if (!isTicketOwner) {
    return message.delete().catch(() => {});
  }

  // Validate invite
  try {
    await client.fetchInvite(inviteCode);
  } catch (err) {
    return message.reply({
      content: 'That server invite appears to be **invalid, broken, or expired**. Please double-check it.',
      allowedMentions: { repliedUser: false }
    });
  }

  // ✅ If valid and user is allowed, proceed as usual
  const logChannelId = await db.get('logChannel');
  const logChannel = message.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const allTickets = message.guild.channels.cache.filter(c => c.name?.startsWith('partner-'));
  const position = Array.from(allTickets.keys()).indexOf(message.channel.id) + 1;

  const embed = new EmbedBuilder()
    .setTitle(`Partner Request #${position}\n${message.author.tag} | ${message.author.id}`)
    .setDescription(`**Ad:**\n${message.content}`)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
    .setTimestamp()
    .setColor('#FFFFFF');

  const acceptBtn = new ButtonBuilder()
    .setCustomId(`accept_${message.channel.id}_${message.author.id}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success);

  const rejectBtn = new ButtonBuilder()
    .setCustomId(`reject_${message.channel.id}_${message.author.id}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

  await logChannel.send({ embeds: [embed], components: [row] });

  await message.reply({
    content: 'Your partnership ad has been submitted to staff. Please wait for approval.\n-# Note: Approval might take a while since the admin could be busy or not around.',
    flags: 64
  });
});

client.once('ready', () => {
  console.log(`${client.user.tag} is online.`);
});

// Keep-alive server
express().get('/', (_, res) => res.send('Bot is online')).listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

client.login(process.env.TOKEN);
