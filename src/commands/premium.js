const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const UserPremium = require('../schemas/userPremium.js');
const GuildPremium = require('../schemas/guildPremium.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Gestiona el acceso premium o revisa tu propio estado.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(subcommand =>
            subcommand
                .setName('user-add')
                .setDescription('Otorga acceso premium a un usuario')
                .addStringOption(option =>
                    option.setName('user')
                        .setDescription('ID del usuario')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('user-remove')
                .setDescription('Remueve el acceso premium de un usuario')
                .addStringOption(option =>
                    option.setName('user')
                        .setDescription('ID del usuario')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('guild-add')
                .setDescription('Otorga acceso premium a un servidor')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('ID del servidor')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('guild-remove')
                .setDescription('Remueve el acceso premium de un servidor')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('ID del servidor')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Revisa tu estado premium')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.options.getString('user');
        const guildId = interaction.options.getString('guild');

        // Embeds para respuestas comunes
        const successEmbed = new EmbedBuilder().setColor('Green');
        const errorEmbed = new EmbedBuilder().setColor('Red');

        switch (subcommand) {
            case 'user-add': {
                const existingUser = await UserPremium.findOne({ userID: userId });
                if (existingUser) {
                    return interaction.reply({
                        embeds: [errorEmbed.setDescription(`🟥 El usuario <@${userId}> ya tiene acceso premium.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                await UserPremium.create({ userID: userId });
                return interaction.reply({
                    embeds: [successEmbed.setDescription(`🟩 Se ha otorgado acceso premium a <@${userId}> correctamente.`)],
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'user-remove': {
                const existingUser = await UserPremium.findOne({ userID: userId });
                if (!existingUser) {
                    return interaction.reply({
                        embeds: [errorEmbed.setDescription(`🟥 El usuario <@${userId}> no tiene acceso premium.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                await UserPremium.deleteOne({ userID: userId });
                return interaction.reply({
                    embeds: [successEmbed.setDescription(`🟩 Se ha removido el acceso premium de <@${userId}> correctamente.`)],
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'guild-add': {
                const existingGuild = await GuildPremium.findOne({ guildID: guildId });
                if (existingGuild) {
                    return interaction.reply({
                        embeds: [errorEmbed.setDescription(`🟥 El servidor con ID ${guildId} ya tiene acceso premium.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                await GuildPremium.create({ guildID: guildId });
                return interaction.reply({
                    embeds: [successEmbed.setDescription(`🟩 Acceso premium añadido correctamente al servidor con ID ${guildId}.`)],
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'guild-remove': {
                const existingGuild = await GuildPremium.findOne({ guildID: guildId });
                if (!existingGuild) {
                    return interaction.reply({
                        embeds: [errorEmbed.setDescription(`🟥 El servidor con ID ${guildId} no tiene acceso premium.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                await GuildPremium.deleteOne({ guildID: guildId });
                return interaction.reply({
                    embeds: [successEmbed.setDescription(`🟩 Acceso premium removido correctamente del servidor con ID ${guildId}.`)],
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'check': {
                const userPremium = await UserPremium.findOne({ userID: interaction.user.id });
                const guildPremium = await GuildPremium.findOne({ guildID: interaction.guild.id });

                const embed = new EmbedBuilder()
                    .setTitle('Estado Premium')
                    .setTimestamp();

                if (userPremium || guildPremium) {
                    embed
                        .setColor('Green')
                        .setDescription('🟩 ¡Tienes acceso premium!');
                } else {
                    embed
                        .setColor('Red')
                        .setDescription('😣 No tienes acceso premium.');
                }

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }
    }
};
