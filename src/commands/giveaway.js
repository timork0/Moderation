const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const Giveaway = require('../schemas/giveaway'); // Update with the correct path
const generateRandomCode = require('../utils/generateRandomCode');
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option => option.setName('duration').setDescription('Duration of the giveaway in minutes').setRequired(true))
                .addStringOption(option => option.setName('prize').setDescription('Prize of the giveaway').setRequired(true))
                .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('Channel to post the giveaway').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
 
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
 
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            await interaction.reply({
                content: "You are not allowed to execute this command. Missing Permission(s): ManageMembers",
                ephemeral: true
            })
        } else {
            switch (subcommand) {
                case 'start':
                    await startGiveaway(interaction, client);
                    break;
                default:
                    await interaction.reply({ content: 'Invalid subcommand', ephemeral: true });
            }
        }
    }
};
 
async function startGiveaway(interaction, client) {
    try {
        const durationStr = interaction.options.getString('duration');
        const prize = interaction.options.getString('prize');
        const winnersCount = interaction.options.getInteger('winners');
        const channel = interaction.options.getChannel('channel');

        if (!durationStr || !prize || !winnersCount || !channel) {
            return await interaction.reply({ content: 'Todos los campos son obligatorios.', ephemeral: true });
        }

        const duration = parseInt(durationStr) * 60000;
        if (isNaN(duration) || duration <= 0) {
            return await interaction.reply({ content: 'Duración inválida.', ephemeral: true });
        }

        const endTime = new Date(Date.now() + duration);
        const code = generateRandomCode(10);

        const embed = new EmbedBuilder()
            .setTitle("🎉 Giveaway 🎉")
            .setDescription(`🎁 **Prize:** ${prize}\n⏰ **Ends in:** ${duration / 60000} minutes\n🏆 **Winners:** ${winnersCount}`)
            .setFooter({ text: `ID: ${code}` })
            .setColor(0x00FFFF);

        const joinButton = new ButtonBuilder()
            .setCustomId(`giveaway-join-${code}`)
            .setLabel('Join Giveaway')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(joinButton);

        const sentMessage = await channel.send({ embeds: [embed], components: [actionRow] });

        await Giveaway.create({
            guildId: interaction.guild.id,
            channelId: channel.id,
            messageId: sentMessage.id,
            endTime: endTime,
            prize: prize,
            winnersCount: winnersCount,
            participants: [],
            id: code,
            ended: false
        });

        await interaction.reply({ content: '🎉 ¡Giveaway iniciado con éxito!', ephemeral: true });
    } catch (error) {
        console.error('Error al iniciar el giveaway:', error);
        await interaction.reply({ content: '❌ Ocurrió un error al iniciar el giveaway.', ephemeral: true });
    }
}

function selectWinners(participants, count) {
    // Shuffle array and pick 'count' winners
    let shuffled = participants.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}