const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

// Objeto en memoria para guardar warns
const warns = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('🔨 Moderator / This warns a server member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('This is the reason for warning the user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    async execute(interaction) {
        const { options, guildId, user } = interaction;
        const target = options.getUser('user');
        const reason = options.getString('reason') || "No reason given";

        // Crear clave única por servidor y usuario
        const key = `${guildId}-${target.id}`;

        // Si no existe, inicializar
        if (!warns[key]) {
            warns[key] = [];
        }

        // Agregar warn
        warns[key].push({
            executerId: user.id,
            executerTag: user.tag,
            reason: reason,
            date: new Date()
        });

        // Embeds
        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setDescription(`😣 You have been **warned** in ${interaction.guild.name} | ${reason}`);

        const embed2 = new EmbedBuilder()
            .setColor('Blurple')
            .setDescription(`🔨 ${target.tag} has been **warned** | ${reason}`);

        // Enviar DMs
        target.send({ embeds: [embed] }).catch(() => {});

        // Responder en el canal
        interaction.reply({ embeds: [embed2] });
    }
};
