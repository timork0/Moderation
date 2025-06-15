const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('Roba un emoji.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Proporciona un emoji')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const item = interaction.options.getString('item');

        const emojiMatch = item.match(/^<a?:\w+:(\d+)>$/);
        if (!emojiMatch) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#97bcbf')
                        .addFields(
                            { name: '<:cross2:1345422141251784785> Entrada inválida', value: 'Por favor proporciona un emoji válido.' }
                        )
                ],
                ephemeral: true
            });
        }

        const emojiID = emojiMatch[1];
        const imageURL = `https://cdn.discordapp.com/emojis/${emojiID}.png`;

        const embed = new EmbedBuilder()
            .setImage(imageURL)
            .setColor('#97bcbf');

        const addButton = new ButtonBuilder()
            .setCustomId('add_emoji')
            .setLabel('Agregar emoji al servidor')
            .setStyle('Primary');

        const row = new ActionRowBuilder().addComponents(addButton);

        const msg = await interaction.reply({ embeds: [embed], components: [row] });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'add_emoji' && i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const modal = new ModalBuilder()
                .setCustomId('emoji_modal')
                .setTitle('Establecer nombre del emoji');

            const nameInput = new TextInputBuilder()
                .setCustomId('emoji_name')
                .setLabel('Ingresa el nombre para el emoji:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ejemplo: WackMoji')
                .setRequired(true);

            const modalRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(modalRow);

            await i.showModal(modal);
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const expiredEmbed = new EmbedBuilder()
                    .setColor('#ff4242')
                    .addFields(
                        { name: '<:cross2:1345422141251784785> Solicitud expirada', value: 'El botón ha expirado. Por favor ejecuta el comando de nuevo.' }
                    );

                await msg.edit({ embeds: [expiredEmbed], components: [] });
            }
        });

        interaction.client.on('interactionCreate', async modalInteraction => {
            if (modalInteraction.type !== InteractionType.ModalSubmit) return;

            if (modalInteraction.customId === 'emoji_modal') {
                const emojiName = modalInteraction.fields.getTextInputValue('emoji_name');

                try {
                    await interaction.guild.emojis.create({
                        attachment: imageURL,
                        name: emojiName
                    });

                    await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#97bcbf')
                                .addFields(
                                    { name: '<:green_tick:1345422039091118100> Emoji agregado', value: `Se agregó correctamente \`${emojiName}\` al servidor.` }
                                )
                        ]
                    });
                } catch (error) {
                    await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#97bcbf')
                                .addFields(
                                    { name: '<:cross2:1345422141251784785> Error al agregar', value: `Error: ${error.message}` }
                                )
                        ],
                        ephemeral: true
                    });
                }
            }
        });
    }
};
