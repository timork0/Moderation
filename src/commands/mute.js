const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

function parseDuration(duration) {
    const regex = /(\d+)([smhd])/g;
    let match;
    let milliseconds = 0;

    while ((match = regex.exec(duration)) !== null) { 
        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                milliseconds += value * 1000;
                break;
            case 'm':
                milliseconds += value * 60 * 1000;
                break;
            case 'h':
                milliseconds += value * 60 * 60 * 1000;
                break;
            case 'd':
                milliseconds += value * 24 * 60 * 60 * 1000;
                break;
        }
    }

    return milliseconds;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia a un usuario')
        .addUserOption(option => option
            .setName('user')
            .setDescription('Usuario a silenciar.')
            .setRequired(true))
        .addStringOption(option => option
            .setName('time')
            .setDescription('Tiempo a silenciar (ejemplo, "1h 20m").')
            .setRequired(true)),
    async execute(interaction, client) {
        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {

               await LogChannel.send({embeds: [warnEmbed]})
                return await interaction.reply({
                    content: `❗ No tienes permisos para usar este comando.`,
                    ephemeral: true
                });

            }

            const { options } = interaction;
            const muteTimeInput = options.getString('time');
            const muteTime = parseDuration(muteTimeInput);
            const user = options.getUser('user');
            const timeoutTarget = await interaction.guild.members.fetch(user.id);

            if (isNaN(muteTime) || muteTime <= 0) {
                return interaction.reply({ content: 'Por favor, proporciona una duración válida para el muteo.', ephemeral: true });
            }

            
            const maxMuteTime = 28 * 24 * 60 * 60 * 1000;
            if (muteTime > maxMuteTime) {
                return interaction.reply({ content: 'Mute time cannot exceed 28 days.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setDescription('🟩 Usuario muteado correctamente.')
                .setColor('Green');

            const dmEmbed = new EmbedBuilder()
                .setDescription(`🟥 Has sido muteado en ${interaction.guild.name}`)
                .setColor('Red');

     
            const muteUntil = new Date(Date.now() + muteTime);

            await timeoutTarget.disableCommunicationUntil(muteUntil, 'Muted via command');
            await user.send({ embeds: [dmEmbed] });
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error muting the user:', error);
            await interaction.reply({ content: '🟥 A ocurrido un error al intentar mutear al usuario.', ephemeral: true });
        }
    }
};
