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
        .setName('moderate')
        .setDescription('Moderate a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to moderate')
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return await interaction.editReply({
                content: '❌ No se pudo encontrar al usuario en el servidor.'
            });
        }

        const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
        .setCustomId(`moderate_menu_${user.id}`)
        .setMinValues(1)
        .setMaxValues(1)
        .setPlaceholder('Selecciona una acción')
        .addOptions(
            {
                label: '🔨 Ban permanente',
                description: 'Banear al usuario para siempre',
                value: `banperm_${user.id}`
            },
            {
                label: '⏳ Ban temporal (1 hora)',
                description: 'Banear al usuario por 1 hora',
                value: `bantemp_${user.id}`
            },
            {
                label: '🔇 Mute permanente',
                description: 'Mutear (timeout) por 28 días',
                value: `muteperm_${user.id}`
            },
            {
                label: '⏱️ Mute temporal (10 min)',
                description: 'Mutear al usuario por 10 minutos',
                value: `mutetemp_${user.id}`
            },
            {
                label: '🔊 Unmute',
                description: 'Quitar el mute (timeout) al usuario',
                value: `unmute_${user.id}`
            },
            {
                label: '🟢 Unban',
                description: 'Desbanear al usuario (requiere ID válido)',
                value: `unban_${user.id}`
            }
        )
);


        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('🛠️ Moderación')
            .setDescription(`Selecciona una acción para moderar a ${user}.`);

        await interaction.editReply({
            embeds: [embed],
            components: [menu]
        });
    }
};
