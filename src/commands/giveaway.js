const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const Giveaway = require('../schemas/giveaway'); // Actualiza con la ruta correcta
const generateRandomCode = require('../utils/generateRandomCode');
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Gestiona sorteos')
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Inicia un nuevo sorteo')
                .addStringOption(option => option.setName('duration').setDescription('Duración del sorteo en minutos').setRequired(true))
                .addStringOption(option => option.setName('prize').setDescription('Premio del sorteo').setRequired(true))
                .addIntegerOption(option => option.setName('winners').setDescription('Número de ganadores').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('Canal donde publicar el sorteo').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
 
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
 
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            await interaction.reply({
                content: "No tienes permiso para ejecutar este comando. Permiso faltante: ManageMembers",
                ephemeral: true
            })
        } else {
            switch (subcommand) {
                case 'start':
                    await startGiveaway(interaction, client);
                    break;
                default:
                    await interaction.reply({ content: 'Subcomando inválido', ephemeral: true });
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
            .setTitle("🎉 Sorteo 🎉")
            .setDescription(`🎁 **Premio:** ${prize}\n⏰ **Termina en:** ${duration / 60000} minutos\n🏆 **Ganadores:** ${winnersCount}`)
            .setFooter({ text: `ID: ${code}` })
            .setColor(0x00FFFF);

        const joinButton = new ButtonBuilder()
            .setCustomId(`giveaway-join-${code}`)
            .setLabel('Participar en el sorteo')
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

        await interaction.reply({ content: '🎉 ¡Sorteo iniciado con éxito!', ephemeral: true });
    } catch (error) {
        console.error('Error al iniciar el sorteo:', error);
        await interaction.reply({ content: '❌ Ocurrió un error al iniciar el sorteo.', ephemeral: true });
    }
}

function selectWinners(participants, count) {
    // Mezcla el array y selecciona 'count' ganadores
    let shuffled = participants.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}