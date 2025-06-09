const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('Steal an emoji.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Provide an emoji')
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
                            { name: '<:cross2:1345422141251784785> Invalid Input', value: 'Please provide a valid emoji.' }
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
            .setLabel('Add Emoji to Server')
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
                .setTitle('Set Emoji Name');

            const nameInput = new TextInputBuilder()
                .setCustomId('emoji_name')
                .setLabel('Enter the name for the emoji:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Example: WackMoji')
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
                        { name: '<:cross2:1345422141251784785> Request Expired', value: 'The button has expired. Please run the command again.' }
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
                                    { name: '<:green_tick:1345422039091118100> Emoji Added', value: `Successfully added \`${emojiName}\` to the server.` }
                                )
                        ]
                    });
                } catch (error) {
                    await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#97bcbf')
                                .addFields(
                                    { name: '<:cross2:1345422141251784785> Failed to Add', value: `Error: ${error.message}` }
                                )
                        ],
                        ephemeral: true
                    });
                }
            }
        });
    }
};
