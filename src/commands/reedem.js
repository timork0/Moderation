const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');
const Code = require('../schemas/premiumcode');
const User = require('../schemas/user');
const soycanvas = require('soycanvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('canjear')
        .setDescription('Canjea tu código Premium.')
        .addStringOption(option =>
            option.setName('codigo')
                .setDescription('Introduce tu código Premium.')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const input = interaction.options.getString('codigo').toUpperCase();
        const user = await User.findOne({ Id: interaction.user.id });
        const code = await Code.findOne({ code: input });
        const premiumID = soycanvas.Util.captchaKey(12);

        if (user?.isPremium) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor('#ff0000').setDescription(`\`❌\` | Ya eres un usuario premium.`)]
            });
        }

        if (!code) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor('#800080').setDescription(`\`❌\` | El código proporcionado no es válido. Inténtalo de nuevo.`)]
            });
        }

        const durationMap = {
            minutely: 300000,
            daily: 86400000,
            weekly: 86400000 * 7,
            monthly: 86400000 * 30,
            yearly: 86400000 * 365,
            lifetime: 86400000 * 365 * 100
        };

        const duration = durationMap[code.plan];
        const expiresAt = Date.now() + duration;

        const userData = {
            Id: interaction.user.id,
            isPremium: true,
            PremID: premiumID,
            redeemedAt: Date.now(),
            expiresAt: durationMap[code.plan] === durationMap.lifetime ? null : expiresAt,
            plan: code.plan
        };

        if (user) {
            Object.assign(user, userData);
            await user.save();
        } else {
            await new User(userData).save();
        }

        await Code.deleteOne({ code: input });
        

        const time = await User.findOne({ Id: interaction.user.id });
        const expires = time.expiresAt ? moment(time.expiresAt).format('dddd, MMMM Do YYYY HH:mm:ss') : 'Nunca';

        const embed = new EmbedBuilder()
            .setAuthor({ name: '¡Premium Canjeado!', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Felicidades ${interaction.member}, has canjeado tu código premium exitosamente.`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setColor('#800080')
            .setTimestamp();

        embed.addFields([
            { name: `\`👥\` • Canjeado por`, value: `\`\`\`${interaction.member.displayName}\`\`\``, inline: true },
            { name: `\`💠\` • Tipo de Plan`, value: `\`\`\`${time.plan}\`\`\``, inline: true },
            { name: `\`🕓\` • Fecha de Expiración`, value: `\`\`\`${expires}\`\`\``, inline: false },
            { name: `\`🆔\` • ID Premium`, value: `\`\`\`${time.PremID}\`\`\``, inline: false }
        ]);

        return interaction.editReply({ embeds: [embed] });
    }
};