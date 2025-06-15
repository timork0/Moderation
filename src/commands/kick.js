const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('El usuario a expulsar')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('La razón de la expulsión')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: "No tienes permiso para usar este comando.", ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Sin razón proporcionada';
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.reply({ content: "Usuario no encontrado en el servidor.", ephemeral: true });
        }

        if (!member.bannable) {
            return interaction.reply({ content: "No se puede expulsar a este usuario.", ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: "No puedes expulsarte a ti mismo.", ephemeral: true });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: "No puedes expulsar a un usuario con un rol igual o superior al tuyo.", ephemeral: true });
        }

        try {
            await member.kick({ reason });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Caso de Expulsión')
                .setDescription(
                    `> Usuario: ${user.tag}\n` +
                    `> Expulsado por: ${interaction.user.tag}\n` +
                    `> Razón: ${reason}\n` +
                    `> Expulsado el: ${new Date().toLocaleString()}\n` +
                    `> Expira: Falso`
                );

            const button = new ButtonBuilder()
                .setCustomId('view_case')
                .setLabel('Ver Caso')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            const banMessage = await interaction.reply({
                content: `Se expulsó correctamente a \`${user.tag}\` con ID: \`${user.id}\``,
                components: [row],
                fetchReply: true
            });

            const filter = i => i.customId === 'view_case' && i.user.id === interaction.user.id;
            const collector = banMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (!i.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    await i.reply({ content: "No tienes permiso para ver este caso.", ephemeral: true });
                    return;
                }

                if (i.customId === 'view_case') {
                    await i.reply({ embeds: [embed], ephemeral: true });
                }
            });

        } catch (error) {
            console.error(error);
            interaction.reply({ content: 'Hubo un error al intentar expulsar a este usuario.', ephemeral: true });
        }
    }
};
