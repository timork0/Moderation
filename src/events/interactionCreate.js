const { Events, EmbedBuilder } = require('discord.js');
const ModmailData = require('../schemas/modmail');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// 🎯 Slash command handler
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
			return;
		}

		// 🔴 ModMail close button handler
		if (interaction.isButton()) {
			if (interaction.customId === 'close_modmail') {
				const channel = interaction.channel;

				const modmailData = await ModmailData.findOne({ channel: channel.id });
				if (!modmailData) {
					await interaction.reply({ content: 'No se encontró información del ModMail.', ephemeral: true });
					return;
				}

				const user = await interaction.client.users.fetch(modmailData.userId);

				await interaction.reply({ content: 'Cerrando ModMail...', ephemeral: true });

				await user.send({
					embeds: [
						new EmbedBuilder()
							.setTitle('ModMail cerrado')
							.setDescription(`Tu ModMail ha sido cerrado por el equipo de soporte.`)
							.setColor('Red')
							.setTimestamp()
					]
				}).catch(() => {});

				await ModmailData.deleteOne({ userId: modmailData.userId });

				setTimeout(async () => {
					await channel.delete().catch(() => {});
				}, 3000);
			}
		}
	},
};
