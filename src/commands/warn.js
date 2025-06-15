const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

// Objeto en memoria para guardar advertencias
const advertencias = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('🔨 Moderador / Advierte a un miembro del servidor')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('El usuario al que quieres advertir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Esta es la razón de la advertencia')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    async execute(interaction) {
        const { options, guildId, user } = interaction;
        const objetivo = options.getUser('user');
        const razon = options.getString('reason') || "Sin razón especificada";

        // Crear clave única por servidor y usuario
        const clave = `${guildId}-${objetivo.id}`;

        // Si no existe, inicializar
        if (!advertencias[clave]) {
            advertencias[clave] = [];
        }

        // Agregar advertencia
        advertencias[clave].push({
            ejecutorId: user.id,
            ejecutorTag: user.tag,
            razon: razon,
            fecha: new Date()
        });

        // Embeds
        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setDescription(`😣 Has sido **advertido** en ${interaction.guild.name} | ${razon}`);

        const embed2 = new EmbedBuilder()
            .setColor('Blurple')
            .setDescription(`🔨 ${objetivo.tag} ha sido **advertido** | ${razon}`);

        // Enviar DMs
        objetivo.send({ embeds: [embed] }).catch(() => {});

        // Responder en el canal
        interaction.reply({ embeds: [embed2] });
    }
};
