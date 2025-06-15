const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Desmutear a un miembro')
        .addUserOption(option => option
            .setName('user')
            .setDescription('usuario a desmutear')
            .setRequired(true)),
    execute: async function (interaction) {
        const { options } = interaction;
        const user = options.getUser('user')
        const timeoutTarget = await interaction.guild.members.fetch(user)
        const embed = new EmbedBuilder()
        .setDescription(':white_check_mark: El usuario ha sido desmuteado')
        .setColor('Green')

        const dmEmbed = new EmbedBuilder()
        .setDescription(`Has sido desmuteado en ${interaction.guild.name}`)
        .setColor('Green') 

        await timeoutTarget.timeout(1000)
        await user.send({embeds: [dmEmbed]});
        await interaction.reply({embeds: [embed]})
    }
}
