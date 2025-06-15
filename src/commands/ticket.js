const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const ticket = require('../schemas/ticketSchema.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Configura el sistema de tickets en el servidor.')
    .addSubcommand(command => command.setName('send').setDescription('Envía el mensaje de creación de tickets.').addStringOption(option => option.setName('name').setDescription('Nombre de la categoría de tickets.').setRequired(true)).addStringOption(option => option.setName('message').setDescription('Mensaje de creación de tickets.').setRequired(false)))
    .addSubcommand(command => command.setName('setup').setDescription('Coloca el sistema de tickets.').addChannelOption(option => option.setName('category').setDescription('Categoría donde se crearán los tickets.').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
    .addSubcommand(command => command.setName('remove').setDescription('Elimina el sistema de tickets.'))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute (interaction) {

        const { options } = interaction;
        const sub = options.getSubcommand();
        const data = await ticket.findOne({ Guild: interaction.guild.id });

        switch (sub) {
            case 'send':
                if (!data) return interaction.reply({ content: 'No has configurado el sistema de tickets.', flags: MessageFlags.Ephemeral });

                const name = options.getString('name');
                var message = options.getString('message') || 'Reacciona para abrir un ticket.';

                const select = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ticketCreateSelect')
                        .setPlaceholder(`⚙️ ${name}`)
                        .setMinValues(1)
                        .addOptions(
                            {
                                label: '🎫 Crear ticket',
                                value: 'createTicket',
                                description: 'Crea un ticket.'
                            },
                            {
                                label: '🎫 Crear ticket 2',
                                value: 'createTicket2',
                                description: 'Crea un ticket 2.'
                            }
                        )
                );

                const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket')
                .setDescription(message)
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name}`, 
                    iconURL: interaction.guild.iconURL() || undefined 
                });
                

                await interaction.reply({ content: 'Mensaje enviado.', flags: MessageFlags.Ephemeral });
                await interaction.channel.send({ embeds: [embed], components: [select] });

            break;
            case 'remove':
                if (!data) return interaction.reply({ content: 'No has configurado el sistema de tickets.', flags: MessageFlags.Ephemeral });
                else {
                    await ticket.deleteOne({ Guild: interaction.guild.id });
                    await interaction.reply({ content: 'Sistema de tickets eliminado.', flags: MessageFlags.Ephemeral });
                }
            break;
            case 'setup':
                if (data) return interaction.reply({ content: `⚠️ ¡Ya tienes un sistema de tickets habilitado! <#${data.Category}>`, flags: MessageFlags.Ephemeral });
                else {
                    const category = options.getChannel('category');
                    await ticket.create({
                        Guild: interaction.guild.id,
                        Category: category.id
                    });

                    await interaction.reply({ content: `🍃 ¡He establecido la categoría a **${category}**! Usa /ticket send para enviar un mensaje de creación de ticket`, flags: MessageFlags.Ephemeral });
                }
        }
    }
}