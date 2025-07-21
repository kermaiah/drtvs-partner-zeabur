require('dotenv').config();
const {
  InteractionType,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = async (interaction) => {
  try {
    if (interaction.type === InteractionType.MessageComponent && interaction.isButton()) {
      const { customId, user, guild, client } = interaction;

      // 🎫 Create Ticket
      if (customId === 'create_ticket') {
        const existing = guild.channels.cache.find(c => c.name === `partner-${user.id}`);
        if (existing) return interaction.reply({ content: 'You already have an open ticket.', flags: 64 });

        const channel = await guild.channels.create({
          name: `partner-${user.id}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: user.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
            {
              id: client.user.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
            }
          ]
        });

        await db.set(`ticket_${user.id}`, channel.id);

        await channel.send({
          content: `<@${user.id}>`,
          embeds: [
            new EmbedBuilder()
              .setTitle('Partnership Request')
              .setDescription('Please send your ad content below. The bot will detect your server link and pass it along to us for review.\n-# Make sure your server ad link is valid. Avoid spamming.')
              .setColor('#FFFFFF')
              .setThumbnail(guild.iconURL())
              .setFooter({ text: 'derivatives', iconURL: guild.iconURL() })
              .setTimestamp()
          ]
        });

        return interaction.reply({ content: 'Ticket created!', flags: 64 });
      }

      // ✅ Accept / ❌ Reject Partnership
      if (customId.startsWith('accept_') || customId.startsWith('reject_')) {
        const [, ticketChannelId, userId] = customId.split('_');
        const ticketChannel = guild.channels.cache.get(ticketChannelId);
        const logChannelId = await db.get('logChannel');
        const publicChannelId = await db.get('publicChannel');

        const logChannel = guild.channels.cache.get(logChannelId);
        const publicChannel = guild.channels.cache.get(publicChannelId);

        if (!ticketChannel) {
          return interaction.reply({
            content: `Ticket not found. Channel: <#${ticketChannelId}>`,
            flags: 64
          });
        }

        const messages = await ticketChannel.messages.fetch({ limit: 50 });
        const adMessage = messages.find(m => m.author.id === userId && m.content.includes('discord.gg'));
        const adContent = adMessage ? adMessage.content : '*No valid ad link found.*';

        const requester = await guild.members.fetch(userId).catch(() => null);
        const requesterTag = requester ? requester.user.tag : 'Unknown User';

        // Correct way to get ticket number (count of partner channels)
        const position = guild.channels.cache.filter(c => c.name?.startsWith('partner-')).size;

        const embed = new EmbedBuilder()
          .setTitle(`Partner Request #${position}`)
          .setDescription(
            `**Requested by:** ${requesterTag} | ${userId}\n` +
            `**Actioned by:** ${interaction.user.tag} | ${interaction.user.id}\n` +
            `**Channel:** <#${ticketChannelId}>\n\n` +
            `**Ad:**\n${adContent}`
          )
          .setThumbnail(requester?.user.displayAvatarURL({ dynamic: true }) || null)
          .setFooter({ text: guild.name, iconURL: guild.iconURL() })
          .setTimestamp()
          .setColor('#FFFFFF');

        if (logChannel) await logChannel.send({ embeds: [embed] });

        if (customId.startsWith('accept_')) {
          const formattedAd = `# ㅤ          ㅤ[drtvs](https://discord.gg/PvDaczMqxn)\n-# ㅤ                  ㅤ#open4ps\n-# ㅤ                ㅤ**filo** • __partner__ • **roblox**\n-# ㅤ               ㅤ**sfw** • ~~no snitch~~ • **social**\n\n@everyone`;
          await ticketChannel.send({ content: `${formattedAd}\n\nPosted. Here's our ad <@${userId}>` });

          if (publicChannel && adMessage) {
            await publicChannel.send({
              content: `${adMessage.content}\n\nrep: <@${userId}>\n\n<@&1393769048482906142>`
            });
          }
        } else if (customId.startsWith('reject_')) {
          await ticketChannel.send({ content: `<@${userId}>, your partnership request was rejected.` });
        }

        return interaction.reply({ content: 'Action completed.', flags: 64 });
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
};
