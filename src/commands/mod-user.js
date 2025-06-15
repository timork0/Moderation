const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionsBitField,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderar')
        .setDescription('Modera a un miembro')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario a moderar')
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const usuario = interaction.options.getUser('usuario');
        const miembro = await interaction.guild.members.fetch(usuario.id).catch(() => null);
        if (!miembro) {
            return await interaction.editReply({
                content: '❌ No se pudo encontrar al usuario en el servidor.'
            });
        }

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`menu_moderar_${usuario.id}`)
                .setMinValues(1)
                .setMaxValues(1)
                .setPlaceholder('Selecciona una acción')
                .addOptions(
                    {
                        label: '🔨 Ban permanente',
                        description: 'Banear al usuario para siempre',
                        value: `banperm_${usuario.id}`
                    },
                    {
                        label: '⏳ Ban temporal (1 hora)',
                        description: 'Banear al usuario por 1 hora',
                        value: `bantemp_${usuario.id}`
                    },
                    {
                        label: '🔇 Mute permanente',
                        description: 'Mutear (timeout) por 28 días',
                        value: `muteperm_${usuario.id}`
                    },
                    {
                        label: '⏱️ Mute temporal (10 min)',
                        description: 'Mutear al usuario por 10 minutos',
                        value: `mutetemp_${usuario.id}`
                    },
                    {
                        label: '🔊 Unmute',
                        description: 'Quitar el mute (timeout) al usuario',
                        value: `unmute_${usuario.id}`
                    },
                    {
                        label: '🟢 Unban',
                        description: 'Desbanear al usuario (requiere ID válido)',
                        value: `unban_${usuario.id}`
                    }
                )
        );

        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('🛠️ Moderación')
            .setDescription(`Selecciona una acción para moderar a ${usuario}.`);

        await interaction.editReply({
            embeds: [embed],
            components: [menu]
        });
    }
};
