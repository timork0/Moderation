const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const voucher_codes = require("voucher-code-generator");
const CodeSchema = require('../schemas/premiumcode');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premiumcode')
        .setDescription('Genera un código de usuario premium.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('plan')
                .setDescription('Selecciona tu plan.')
                .setRequired(true)
                .addChoices(
                    { name: 'Minuto', value: 'minutely' },
                    { name: 'Diario', value: 'daily' },
                    { name: 'Semanal', value: 'weekly' },
                    { name: 'Mensual', value: 'monthly' },
                    { name: 'Anual', value: 'yearly' },
                    { name: 'De por vida', value: 'lifetime' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const plan = interaction.options.getString('plan');
        const codePremium = voucher_codes.generate({ pattern: "####-####-####" });
        const code = codePremium.toString().toUpperCase();

        // Verificar si el código ya existe en la base de datos
        const findCode = await CodeSchema.findOne({ code });
        if (!findCode) {
            // Crear un nuevo documento en la base de datos
            await CodeSchema.create({ code, plan });
        } else {
            return interaction.editReply({
                content: `Ocurrió un conflicto. Por favor, intenta generar el código nuevamente.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('・Códigos Premium')
            .setDescription(`\`\`\`Código de usuario premium generado:\n\n--------\n${code}\n--------\`\`\``)
            .addFields({ name: `\`💠\` • Tipo de plan:`, value: `\`\`\`${plan}\`\`\``, inline: true })
            .setColor('#FFD700')
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};