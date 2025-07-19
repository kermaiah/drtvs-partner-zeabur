const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up partnership system channels')
    .addChannelOption(opt =>
      opt.setName('ticket_channel')
        .setDescription('Channel to create partnership tickets in')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('log_channel')
        .setDescription('Staff log channel (for approving/rejecting ads)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('public_channel')
        .setDescription('Where approved ads will be posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'Only admins can use this command.', flags: 64 });
    }

    const ticketChannel = interaction.options.getChannel('ticket_channel');
    const logChannel = interaction.options.getChannel('log_channel');
    const publicChannel = interaction.options.getChannel('public_channel');

    // Save channel IDs
    await db.set('ticketChannel', ticketChannel.id);
    await db.set('logChannel', logChannel.id);
    await db.set('publicChannel', publicChannel.id);

    const guild = interaction.guild;

    // Create the embed + button to post in ticket channel
    const embed = new EmbedBuilder()
      .setTitle('Request a Partnership Ticket')
      .setDescription('Click the button below to open a ticket and submit your server ad.')
      .setColor('#FFFFFF')
      .setThumbnail(guild.iconURL())
      .setFooter({ text: 'derivatives', iconURL: guild.iconURL() })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Create Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    // Send the embed and button to the selected ticket channel
    await ticketChannel.send({ embeds: [embed], components: [row] });

    // Confirm setup to admin
    return interaction.reply({
      content: `Setup complete:\n• Ticket Channel: ${ticketChannel}\n• Log Channel: ${logChannel}\n• Public Channel: ${publicChannel}`,
      flags: 64
    });
  }
};
