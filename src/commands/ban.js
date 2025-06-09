const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Banea a un miembro del servidor.')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption(option =>
			option.setName('usuario')
				.setDescription('El usuario que quieres banear')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('razon')
				.setDescription('Razón del baneo')
				.setRequired(false)),

	async execute(interaction) {
		const usuario = interaction.options.getUser('usuario');
		const razon = interaction.options.getString('razon') || 'No se especificó razón';
		const miembro = interaction.guild.members.cache.get(usuario.id);

		// Comprobaciones
		if (!miembro) {
			return interaction.reply({ content: '❌ No puedo encontrar a ese usuario en este servidor.', ephemeral: true });
		}

		if (!miembro.bannable) {
			return interaction.reply({ content: '❌ No puedo banear a ese usuario. Es posible que tenga un rol superior o sea un administrador.', ephemeral: true });
		}

		if (miembro.id === interaction.user.id) {
			return interaction.reply({ content: '❌ No puedes banearte a ti mismo.', ephemeral: true });
		}

		if (miembro.id === interaction.client.user.id) {
			return interaction.reply({ content: '❌ No puedes banearme 😢', ephemeral: true });
		}

		// Intentamos banear
		try {
			await miembro.ban({ reason: `${razon} | Ban ejecutado por ${interaction.user.tag}` });

			const embed = new EmbedBuilder()
				.setTitle('🚫 Usuario baneado')
				.setColor('Red')
				.addFields(
					{ name: 'Usuario', value: `${usuario.tag} (${usuario.id})`, inline: false },
					{ name: 'Moderador', value: `${interaction.user.tag}`, inline: false },
					{ name: 'Razón', value: razon, inline: false },
				)
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: '❌ Hubo un error al intentar banear al usuario.', ephemeral: true });
		}
	},
};
