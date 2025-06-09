const { Client, Collection, GatewayIntentBits, Partials, REST, Routes, AttachmentBuilder, Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AuditLogEvent } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const { color, textEffects } = require('./utils/loggingEffects');
const Giveaway = require("./schemas/giveaway");

require('dotenv').config();
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.GuildMessageReactions,], partials: [Partials.Channel, Partials.Message, Partials.User, Partials.Reaction, Partials.GuildMember] });

client.commands = new Collection();
const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
		commands.push(command.data.toJSON());
	} else {
		//console.log('.timOrk is best')
	}
}

// Deploy de comandos
const rest = new REST().setToken(token);
(async () => {
	try {
		console.log(`⏳ ${textEffects.bold}${textEffects.underline}${color.green}[STATUS]${textEffects.reset} ${textEffects.reset}${color.reset}Refreshing ${commands.length} (/) commands...`);

		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.green}[STATUS]${textEffects.reset} ${color.reset}Loaded ${data.length} commands successfully.`);
	} catch (error) {
		console.error('❌ Error al registrar comandos:', error);
	}
})();

// Eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

// SYSTEM ANTI-CRASH
process.on('unhandledRejection', async (reason, promise) => {
	console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
	console.log('Uncaught Expection:', err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
	console.log('Uncaught Expection Monitor', err, origin);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.guild) return;

	// Primera selección (ban, mute, agregar/quitar rol)
	if (interaction.isStringSelectMenu() && interaction.customId.startsWith('moderate_menu_')) {
		const [action, userId] = interaction.values[0].split('_');

		if (action === 'unban') {
			try {
				const bans = await interaction.guild.bans.fetch();
				const isBanned = bans.has(userId);

				if (!isBanned) {
					return await interaction.reply({
						content: '❌ El usuario no está baneado.',
						ephemeral: true
					});
				}

				await interaction.guild.bans.remove(userId);
				return await interaction.reply({
					content: `🟢 Usuario desbaneado con éxito.`,
					ephemeral: true
				});
			} catch (err) {
				console.error(err);
				return await interaction.reply({
					content: '❌ No pude desbanear al usuario.',
					ephemeral: true
				});
			}
		}


		const member = await interaction.guild.members.fetch(userId).catch(() => null);
		if (!member) return await interaction.reply({ content: '❌ Usuario no encontrado en el servidor.', ephemeral: true });

		try {
			switch (action) {
				case 'banperm':
					await member.ban({ reason: `Moderado por ${interaction.user.tag}` });
					return await interaction.reply({ content: `🔨 Usuario baneado permanentemente.`, ephemeral: true });

				case 'bantemp':
					await member.ban({ reason: `Ban temporal por ${interaction.user.tag}` });
					setTimeout(async () => {
						await interaction.guild.bans.remove(userId).catch(() => null);
					}, 60 * 60 * 1000); // 1 hora
					return await interaction.reply({ content: `⏳ Usuario baneado por 1 hora.`, ephemeral: true });

				case 'muteperm': {
					// Mute por 28 días (máximo permitido por Discord)
					const maxMute = 28 * 24 * 60 * 60 * 1000; // 28 días en ms
					const muteUntil = new Date(Date.now() + maxMute);
					await member.timeout(muteUntil, `Mute permanente por ${interaction.user.tag}`);
					return await interaction.reply({ content: `🔇 Usuario muteado por 28 días.`, ephemeral: true });
				}

				case 'mutetemp': {
					const muteDuration = 10 * 60 * 1000; // 10 minutos
					const muteUntil = new Date(Date.now() + muteDuration);
					await member.timeout(muteUntil, `Mute temporal por ${interaction.user.tag}`);
					return await interaction.reply({ content: `⏱️ Usuario muteado por 10 minutos.`, ephemeral: true });
				}

				case 'unmute': {
					await member.timeout(null, `Unmute por ${interaction.user.tag}`);
					return await interaction.reply({ content: `🔊 Usuario desmuteado.`, ephemeral: true });
				}


			}
		} catch (err) {
			console.error(err);
			return await interaction.reply({ content: '❌ Error al ejecutar la acción.', ephemeral: true });
		}
	}

});

client.on(Events.GuildMemberAdd, async member => {

    const channelID = '1374337700940742687';

    const channel = member.guild.channels.cache.get(channelID);
    const { Profile} = require('discord-arts');

    const avatar = member.displayAvatarURL()
    const buffer = await Profile(member.id, {
      presenceStatus: 'online',
      badgesFrame: true,
      moreBackgroundBlur: true,
      backgroundBrightness: 100,
    });
    const profileBuffer = await Profile(member.id);
    const imageAttachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });

    const embed = new EmbedBuilder()
    .setTitle("**New Member**")
    .setDescription(`Welcome to the server <@${member.id}> hope to see you again!`)
    .setAuthor({ iconURL: avatar, name: `User ID: ${member.id}`})
    .setTimestamp()
    .setColor("Blurple")
    .setImage("attachment://profile.png");

    channel.send({ embeds: [embed], files: [imageAttachment] });
});

client.on(Events.GuildMemberRemove, async member => {
    const channelID = '1374342438902038659';
  
        const channel = member.guild.channels.cache.get(channelID);
        const { Profile } = require('discord-arts');
  
        const avatar = member.displayAvatarURL()
        const buffer = await Profile(member.id, {
          presenceStatus: 'online',
          badgesFrame: true,
          moreBackgroundBlur: true,
          backgroundBrightness: 100,
        });
        const profileBuffer = await Profile(member.id);
        const imageAttachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });
  
        const embed = new EmbedBuilder()
        .setTitle("**Member Leave**")
        .setDescription(`😭 Goodbye <@${member.id}> hope to see you again!`)
        .setAuthor({ iconURL: avatar, name: `User ID: ${member.id}`})
        .setTimestamp()
        .setColor("Blurple")
        .setImage("attachment://profile.png");

        channel.send({ embeds: [embed], files: [imageAttachment] });
  });


  // AntiRaid 
const BannedUser = require('./schemas/bannedUsers'); 
const raidUsers = new Collection();
const logChannelId = '1374353812822823053';

client.on('guildMemberAdd', async (member) => {
    const guildId = member.guild.id;
    const userId = member.id;

    console.log(`👋 ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}New member joined: ${member.user.tag} (${userId})`);

    // Exclude bots
    if (member.user.bot) {
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Bot ${member.user.tag} is excluded from Anti-Raid.`);
        return;
    }

    if (!raidUsers.has(guildId)) {
        raidUsers.set(guildId, new Collection());
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Created a new collection for server ${guildId}`);
    }

    const guildRaids = raidUsers.get(guildId);
    guildRaids.set(userId, Date.now());

    console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}User stored. Total new members in 10s: ${guildRaids.size}`);

    setTimeout(() => {
        raidUsers.delete(userId);
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}User ${userId} removed after 10s.`);
    }, 10000);

    // 🔹 Check if a ban is needed
    console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Checking if ban is required. guildRaids.size = ${guildRaids.size}`);

    if (guildRaids.size >= 5) { // Immediate ban even with 1 user
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}🚨 RAID DETECTED! Activating protection on ${member.guild.name}`);
        triggerRaidProtection(member.guild);
    }
});

// 🔹 Function to format the date correctly
const formatDate = (date) => {
    const options = {
        weekday: 'long', // Full day name (Monday, Tuesday, ...)
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'long' // Adds "Daylight Time" or "Standard Time"
    };
    return date.toLocaleString('en-US', options);
};

async function triggerRaidProtection(guild) {
    const guildRaids = raidUsers.get(guild.id);
    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.log(`❌ Log channel not found or bot lacks permissions! (ID: ${logChannelId})`);
        return;
    }

    console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Bot found the log channel: ${logChannel.id}`);

    let bannedUsersInfo = [];

    for (const [userId] of guildRaids) {
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (member && !member.user.bot) {
            console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Banning user: ${member.user.tag}`);

            await member.ban({ reason: '🚨 Raid Protection: Suspicious activity detected!' });

            // Fetch user information
            const username = member.user.tag;
            const createdAtFormatted = formatDate(member.user.createdAt);
            const joinedAtFormatted = member.joinedAt ? formatDate(member.joinedAt) : "Unknown";
            const banDateFormatted = formatDate(new Date());

            // Avatar & Banner
            const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 1024 }) || "No avatar.";
            const banner = (await member.user.fetch())?.bannerURL({ dynamic: true, size: 1024 }) || "No banner.";

            // Roles excluding @everyone
            const roles = member.roles.cache
                .filter(r => r.id !== guild.id) // Excludes @everyone
                .map(r => `<@&${r.id}>`)
                .join(', ') || "No roles.";

            // Save in MongoDB
            await BannedUser.create({
                userId: userId,
                username: username,
                guildId: guild.id
            });

            bannedUsersInfo.push({
                mention: `<@${userId}>`,
                username,
                userId,
                createdAtFormatted,
                joinedAtFormatted,
                banDateFormatted,
                avatarURL,
                banner,
                roles
            });
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🚨 Raid Protection Activated!')
        .setColor('#ff0000') // HEX Color
        .setDescription('📌 **The following users have been banned due to suspicious activity:**');

    bannedUsersInfo.forEach(user => {
        embed.addFields([
            { name: "👤 User:", value: `${user.mention} (${user.username})`, inline: true },
            { name: "🆔 ID:", value: user.userId, inline: true },
            { name: "📅 Account Created:", value: user.createdAtFormatted, inline: false },
            { name: "📥 Joined Server:", value: user.joinedAtFormatted, inline: false },
            { name: "⛔ Ban Date:", value: user.banDateFormatted, inline: false },
            { name: "🎭 Roles:", value: user.roles, inline: false },
            { name: "🖼️ Avatar:", value: user.avatarURL, inline: false },
            { name: "🎨 Banner:", value: user.banner, inline: false }
        ]);
    });

    // 🚀 Send embed to log channel
    logChannel.send({ embeds: [embed] })
        .then(() => console.log("✅ Log message sent successfully!"))
        .catch(error => console.error(`❌ Error sending to log channel:`, error));

    console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Raid Protection completed. Clearing user list.`);
    raidUsers.delete(guild.id);
}

client.on('voiceStateUpdate', (oldState, newState) => {

    if (oldState.channel && !newState.channel) {

        const logChannel = oldState.guild.channels.cache.find(channel => channel.name === 'audit-log'); 
        

        const embed = new EmbedBuilder()
            .setColor(0x5865F2) 
            .setAuthor({ name: 'CHANNEL LEFT', iconURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS07YilaV52XGoxo78bYImjMSPMmybpec5Qiw&usqp=CAU' }) 
            .setDescription(`**User:** <@${oldState.member.id}> (ID: ${oldState.member.id})
            \n**Channel:** <#${oldState.channel.id}> (ID: ${oldState.channel.id})`)
            .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F876897427242766356.gif%3Fv%3D1&w=128&q=75') 
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {

    if (!oldState.channel && newState.channel) {

        const logChannel = newState.guild.channels.cache.find(channel => channel.name === 'audit-log'); 


        const embed = new EmbedBuilder()
            .setColor(0x5865F2) 
            .setAuthor({ 
                name: `${newState.guild.name} | CHANNEL JOINED`, 
                iconURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS07YilaV52XGoxo78bYImjMSPMmybpec5Qiw&usqp=CAU' 
            })
            .setDescription(`**User:** <@${newState.member.id}> (ID: ${newState.member.id})
            \n**Channel:** <#${newState.channel.id}> (ID: ${newState.channel.id})`)
            .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869529604296159282/863876115584385074.gif')
            .setTimestamp();


        logChannel.send({ embeds: [embed] });
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {

    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {

        const logChannel = newState.guild.channels.cache.find(channel => channel.name === 'audit-log'); 


        const embed = new EmbedBuilder()
            .setColor(0x5865F2) 
            .setAuthor({ 
                name: 'CHANNEL SWITCHED', 
                iconURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS07YilaV52XGoxo78bYImjMSPMmybpec5Qiw&usqp=CAU' 
            })
            .setDescription(`**User:** <@${newState.member.id}> (${newState.member.user.tag}) (ID: ${newState.member.id})
            \n**TO CHANNEL:** <#${newState.channel.id}> (ID: ${newState.channel.id})
            \n**FROM CHANNEL:** <#${oldState.channel.id}> (ID: ${oldState.channel.id})`)
            .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869529684805840896/841989410978398218.gif?ex=65af979f&is=659d229f&hm=9fb59e190a49ca05bb9271f0518c1473983dbe4667ebf468b60bcca761c53b4f&') 
            .setTimestamp();


        logChannel.send({ embeds: [embed] });
    }
});

client.on('messageDelete', (message) => {

    const logChannel = message.guild.channels.cache.find(channel => channel.name === 'audit-log'); 


    const embed = new EmbedBuilder()
        .setColor(0x5865F2) 
        .setTitle('Message Deleted')
        .addFields(
            { name: 'Author', value: `@${message.author.tag} - ${message.author}`, inline: true },
            { name: 'Date', value: message.createdAt.toUTCString(), inline: true },
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Deleted Message', value: message.content ? message.content : 'No text content', inline: false }
        )
        .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869530655871082516/850923749132992550.png') 
        .setTimestamp();


    if (message.attachments.size > 0) {
        embed.addFields({ name: 'Attachment URL(s)', value: message.attachments.map(a => a.url).join('\n') });
    }


    logChannel.send({ embeds: [embed] });
});

client.on('roleCreate', (role) => {

    const logChannel = role.guild.channels.cache.find(channel => channel.name === 'audit-log'); 


    const embed = new EmbedBuilder()
        .setColor(role.hexColor) 
        .setTitle('ROLE CREATED')
        .addFields(
            { name: 'ROLE', value: `<@&${role.id}>`, inline: true },
            { name: 'ROLENAME', value: role.name, inline: true },
            { name: 'ROLEID', value: role.id, inline: true },
            { name: 'HEXCOLOR', value: role.hexColor, inline: true },
            { name: 'POSITION', value: role.position.toString(), inline: true }
        )
        .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869531337411952670/845717716559593512.png') 
        .setTimestamp();


    logChannel.send({ embeds: [embed] });
});

client.on('roleDelete', (role) => {

    const logChannel = role.guild.channels.cache.find(channel => channel.name === 'audit-log'); 


    const embed = new EmbedBuilder()
        .setColor(role.hexColor) 
        .setTitle('ROLE DELETED')
        .addFields(
            { name: 'ROLE', value: role.name, inline: true },
            { name: 'ROLEID', value: role.id, inline: true },
            { name: 'HEXCOLOR', value: role.hexColor, inline: true },
            { name: 'POSITION', value: role.position.toString(), inline: true }
        )
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F804032068841242705.png%3Fv%3D1&w=128&q=75')
        .setTimestamp();


    logChannel.send({ embeds: [embed] });
});

client.on('messageUpdate', (oldMessage, newMessage) => {

    if (oldMessage.content === newMessage.content) return;


    const logChannel = newMessage.guild.channels.cache.find(channel => channel.name === 'audit-log'); 


    const messageLink = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`;


    const embed = new EmbedBuilder()
        .setColor(0x5865F2) 
        .setTitle('Message Edited')
        .setURL(messageLink) 
        .addFields(
            { name: 'Author', value: `@${newMessage.author.tag} - ${newMessage.author}`, inline: true },
            { name: 'Date', value: newMessage.createdAt.toUTCString(), inline: true },
            { name: 'Channel', value: `${newMessage.channel}`, inline: true },
            { name: 'Original Message', value: oldMessage.content ? oldMessage.content : 'No original text', inline: false },
            { name: 'Edited Message', value: newMessage.content ? newMessage.content : 'No edited text', inline: false }
        )
        .addFields({ name: 'Jump to Message', value: `[Click here to jump to the message](${messageLink})`, inline: false })
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F944017636893786203.png%3Fv%3D1&w=128&q=75') 
        .setTimestamp();


    logChannel.send({ embeds: [embed] });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {

    const addedRole = newMember.roles.cache.find(role => !oldMember.roles.cache.has(role.id));


    if (addedRole) {

        const logChannel = newMember.guild.channels.cache.find(channel => channel.name === 'audit-log');


        const embed = new EmbedBuilder()
            .setColor(addedRole.hexColor) 
            .setTitle('ROLE ADDED')
            .addFields(
                { name: 'Member', value: `<@${newMember.id}>`, inline: true },
                { name: 'Member ID', value: newMember.id, inline: true },
                { name: 'Role Added', value: `<@&${addedRole.id}>`, inline: true },
                { name: 'Role ID', value: addedRole.id, inline: true },
                { name: 'Total User Roles', value: newMember.roles.cache.size.toString(), inline: true }
            )
            .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F812353578995679324.png%3Fv%3D1&w=128&q=75')
            .setTimestamp(); 


        logChannel.send({ embeds: [embed] });
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {

    const removedRole = oldMember.roles.cache.find(role => !newMember.roles.cache.has(role.id));


    if (removedRole) {

        const logChannel = newMember.guild.channels.cache.find(channel => channel.name === 'audit-log');

        const embed = new EmbedBuilder()
            .setColor(removedRole.hexColor) 
            .setTitle('ROLE REMOVED')
            .addFields(
                { name: 'Member', value: `<@${newMember.id}>`, inline: true },
                { name: 'Member ID', value: newMember.id, inline: true },
                { name: 'Role Removed', value: `<@&${removedRole.id}>`, inline: true },
                { name: 'Role ID', value: removedRole.id, inline: true },
                { name: 'Total User Roles', value: newMember.roles.cache.size.toString(), inline: true }
            )
            .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F904899961961984011.png%3Fv%3D1&w=128&q=75')
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
});

client.on('inviteCreate', async invite => {

    if (!invite.guild) return;


    const logChannel = invite.guild.channels.cache.find(channel => channel.name === 'audit-log');
    

    if (!logChannel) {
        console.log('Audit-log channel not found');
        return;
    }

 
    const embed = new EmbedBuilder()
        .setColor('#00ff00') 
        .setTitle('NEW INVITE CREATED')
        .setThumbnail('https://cdn.discordapp.com/emojis/1065300559952875620.gif') 
        .addFields(
            { name: 'Invite Code', value: invite.code, inline: true },
            { name: 'Inviter', value: invite.inviter ? `<@${invite.inviter.id}>` : 'Unknown', inline: true },
            { name: 'Channel', value: invite.channel ? `<#${invite.channel.id}>` : 'Unknown', inline: true },
            { name: 'Expires', value: invite.expiresTimestamp ? new Date(invite.expiresTimestamp).toString() : 'Never', inline: true },
            { name: 'Max Uses', value: invite.maxUses.toString(), inline: true }
        )
        .setTimestamp();


    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('roleUpdate', (oldRole, newRole) => {
    const logChannel = newRole.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.log('Audit-log channel not found');
        return; 
    }

    let descriptionText = '';


    if (oldRole.hexColor !== newRole.hexColor) {
        descriptionText += `**Color:** Changed from \`${oldRole.hexColor.toUpperCase()}\` to \`${newRole.hexColor.toUpperCase()}\`\n`;
    }


    const oldPerms = new PermissionsBitField(oldRole.permissions);
    const newPerms = new PermissionsBitField(newRole.permissions);
    const addedPerms = newPerms.remove(oldPerms).toArray();
    const removedPerms = oldPerms.remove(newPerms).toArray();

    if (addedPerms.length > 0 || removedPerms.length > 0) {
        descriptionText += '**Permissions:**\n';
        if (addedPerms.length > 0) {
            descriptionText += `Added: \`${addedPerms.join('`, `')}\`\n`;
        }
        if (removedPerms.length > 0) {
            descriptionText += `Removed: \`${removedPerms.join('`, `')}\`\n`;
        }
    }


    if (descriptionText !== '') {
        const embed = new EmbedBuilder()
            .setColor(newRole.hexColor) 
            .setTitle(`Role Updated: "${newRole.name}"`)
            .setDescription(descriptionText)
            .addFields({ name: 'Role ID', value: `\`${newRole.id}\``, inline: false })
            .setTimestamp()
            .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F769686808375590943.gif%3Fv%3D1&w=128&q=75')
            .setTimestamp(); 
        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const logChannel = newMember.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.log('Audit-log channel not found');
        return;
    }


    if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
        const duration = newMember.communicationDisabledUntilTimestamp - Date.now();

        const embed = new EmbedBuilder()
            .setColor(0xFFA500) 
            .setTitle('User Timed Out')
            .setDescription(`**User:** ${newMember.user.tag}`)
            .addFields(
                { name: 'User ID', value: newMember.user.id, inline: true },
                { name: 'Timeout Duration', value: `${Math.round(duration / 60000)} minutes`, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

client.on('emojiCreate', async emoji => {
    const logChannel = emoji.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }


    const fetchedLogs = await emoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiCreate
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (emojiLog && emojiLog.target.id === emoji.id) {
        executor = emojiLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('New Emoji Added')
        .setDescription(`A new emoji has been added to the server!`)
        .addFields(
            { name: 'Emoji', value: `${emoji}`, inline: true },
            { name: 'Emoji Name', value: `\`${emoji.name}\``, inline: true },
            { name: 'Emoji ID', value: `\`${emoji.id}\``, inline: true },
            { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
            { name: 'Uploader', value: executor, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('emojiDelete', async emoji => {
    const logChannel = emoji.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }


    const fetchedLogs = await emoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiDelete
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (emojiLog && emojiLog.target.id === emoji.id) {
        executor = emojiLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#FF0000') 
        .setTitle('Emoji Deleted 🚫')
        .setDescription(`An emoji was deleted from the server.`)
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F893811882807410759.gif%3Fv%3D1&w=128&q=75')
        .addFields(
            { name: 'Emoji Name', value: `\`${emoji.name}\``, inline: true },
            { name: 'Emoji ID', value: `\`${emoji.id}\``, inline: true },
            { name: 'Deleted by', value: executor, inline: true }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
    const logChannel = newEmoji.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }


    const fetchedLogs = await newEmoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiUpdate
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (emojiLog && emojiLog.target.id === newEmoji.id) {
        executor = emojiLog.executor.tag;
    }


    const embed = new EmbedBuilder()
        .setColor('#FFA500') 
        .setTitle('Emoji Updated 🔄')
        .setDescription(`An emoji has been updated in the server.`)
        .addFields(
            { name: 'Old Emoji Name', value: `\`${oldEmoji.name}\``, inline: true },
            { name: 'New Emoji Name', value: `\`${newEmoji.name}\``, inline: true },
            { name: 'Emoji ID', value: `\`${newEmoji.id}\``, inline: true },
            { name: 'Updated by', value: executor, inline: true }
        )
        .setThumbnail(newEmoji.url)
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('channelCreate', async channel => {
    const logChannel = channel.guild.channels.cache.find(ch => ch.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }


    const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate
    }).catch(console.error);

    const channelLog = fetchedLogs?.entries.first();
    const executor = channelLog?.executor.tag || 'Unknown';


    const permissionsOverview = channel.permissionOverwrites.cache.map(overwrite => {
        const role = channel.guild.roles.cache.get(overwrite.id);
        const canView = overwrite.allow.has(PermissionsBitField.Flags.ViewChannel);
        return canView ? `✅ ${role.name}` : '';
    }).filter(name => name).join('\n') || 'No roles with explicit view access.';

    const embed = new EmbedBuilder()
        .setColor('#0099ff') 
        .setTitle('🆕 Channel Created')
        .setDescription(`A new channel has been created!`)
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F1000566451213701180.gif%3Fv%3D1&w=128&q=75')
        .addFields(
            { name: 'Name', value: channel.name, inline: true },
            { name: 'Type', value: ChannelType[channel.type], inline: true },
            { name: 'Category', value: channel.parent?.name || 'None', inline: true },
            { name: 'Created By', value: executor, inline: true },
            { name: 'Roles with View Access', value: permissionsOverview, inline: false },
            { name: 'Channel ID', value: channel.id, inline: false }
        )
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('channelDelete', async channel => {
    const logChannel = channel.guild.channels.cache.find(ch => ch.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    let executor = 'Unknown';
    

    const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete
    }).catch(console.error);

    if (fetchedLogs && fetchedLogs.entries.size > 0) {
        const channelLog = fetchedLogs.entries.first();
        if (channelLog && channelLog.target.id === channel.id) {
            executor = channelLog.executor.tag;
        }
    }

    const embed = new EmbedBuilder()
        .setColor('#FF0000') 
        .setTitle('Channel Deleted')
        .setDescription(`**Name:** ${channel.name}\n**Type:** ${ChannelType[channel.type]}\n**Deleted by:** ${executor}`)
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F893811882807410759.gif%3Fv%3D1&w=128&q=75')
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    const creationTime = SnowflakeUtil.deconstruct(newChannel.id).timestamp;
    if (BigInt(Date.now()) - BigInt(creationTime) < BigInt(10000)) {
        return; 
    }

    const logChannel = newChannel.guild.channels.cache.find(ch => ch.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    let executor = 'Unknown';

 
    const fetchedLogs = await newChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate
    }).catch(console.error);

    if (fetchedLogs && fetchedLogs.entries.size > 0) {
        const channelLog = fetchedLogs.entries.first();
        if (channelLog && channelLog.target.id === newChannel.id) {
            executor = channelLog.executor.tag || 'Unknown';
        }
    }

    const embed = new EmbedBuilder()
        .setColor('#FFFF00') 
        .setTitle('Channel Updated')
        .setDescription(`A channel has been updated in the server.`)
        .addFields(
            { name: 'Channel ID', value: newChannel.id, inline: true },
            { name: 'Updated by', value: executor, inline: true }
        )
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F1000566451213701180.gif%3Fv%3D1&w=128&q=75')
        .setTimestamp()
        .setFooter({ text: `Channel Update Log`, iconURL: newChannel.guild.iconURL({ dynamic: true }) });

  
    if (oldChannel.name !== newChannel.name) {
        embed.addFields(
            { name: 'Old Name', value: oldChannel.name, inline: true },
            { name: 'New Name', value: newChannel.name, inline: true }
        );
    }

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('messageDelete', async message => {
    if (message.mentions.users.size > 0 && Date.now() - message.createdTimestamp < 5000) {
        const logChannel = message.guild.channels.cache.find(channel => channel.name === 'audit-log');
        if (!logChannel) {
            console.error('Audit-log channel not found');
            return;
        }

        let executor = 'Unknown';
        const fetchedLogs = await message.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MessageDelete
        }).catch(console.error);

        const deletionLog = fetchedLogs?.entries.first();
        if (deletionLog && deletionLog.extra.channel.id === message.channel.id
            && deletionLog.target.id === message.author.id
            && deletionLog.createdTimestamp > message.createdTimestamp) {
            executor = deletionLog.executor.tag;
        } else {

            executor = message.author.tag + ' (Self-deletion)';
        }

        const embed = new EmbedBuilder()
            .setColor('#FF4500') 
            .setTitle('Ghost Ping Detected 🚫')
            .setDescription(`A message mentioning a user was quickly deleted.`)
            .addFields(
                { name: 'Author', value: message.author.tag, inline: true },
                { name: 'Content', value: message.content, inline: true },
                { name: 'Deleted by', value: executor, inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

client.on('messageDeleteBulk', async messages => {
    const logChannel = messages.first().guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    const fetchedLogs = await messages.first().guild.fetchAuditLogs({
        limit: 1,
        type: 'MESSAGE_BULK_DELETE'
    }).catch(console.error);

    const deletionLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (deletionLog) {
        executor = deletionLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('Bulk Messages Deleted 🚫')
        .setDescription(`${messages.size} messages were deleted in bulk.`)
        .addFields(
            { name: 'Channel', value: messages.first().channel.name, inline: true },
            { name: 'Deleted by', value: executor, inline: true }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberAdd', member => {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    const accountCreationDate = member.user.createdAt;
    const accountAge = new Date() - accountCreationDate;
    const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 7 days

    let accountAgeWarning = '';
    if (accountAge < sevenDaysInMilliseconds) {
        accountAgeWarning = '⚠️ **This account is less than 7 days old. Admins, please take note!** ⚠️';
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`**${member.user.tag}** has joined`)
        .setDescription(`Member ${member.user.tag} Account overview! 
        
        **${accountAgeWarning}**`)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Member #', value: `${member.guild.memberCount}`, inline: true },
            { name: 'Account Created', value: `${accountCreationDate.toDateString()}`, inline: true }
        )
        
    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberRemove', member => {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#FF0000') 
        .setTitle('Member Left the Server')
        .setDescription(`**${member.user.tag}** has left **${member.guild.name}**.`)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Username', value: `${member.user.tag}`, inline: true },
            { name: 'Member ID', value: `${member.id}`, inline: true },
            { name: 'Total Members Now', value: `${member.guild.memberCount}`, inline: true }
        )
        

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildBanRemove', async (ban) => {
    const logChannel = ban.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove
    }).catch(console.error);
    
    const unbanLog = fetchedLogs?.entries.first();
    let executor = 'Unknown';
    if (unbanLog) {
        executor = unbanLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#32a852') 
        .setTitle('User Unbanned')
        .setDescription(`**${ban.user.tag}** has been unbanned from **${ban.guild.name}**.`)
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: 'Unbanned User', value: `${ban.user.tag}`, inline: true },
            { name: 'User ID', value: `${ban.user.id}`, inline: true },
            { name: 'Unbanned by', value: executor, inline: true }
        )
        
    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildBanAdd', async (ban) => {
    const logChannel = ban.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Ban-log channel not found');
        return;
    }


    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: 22 
    }).catch(console.error);

    const banLog = fetchedLogs?.entries.first();
    let executor = banLog?.executor?.tag || 'Unknown';
    let reason = banLog?.reason || 'No reason provided';

    const embed = new EmbedBuilder()
        .setColor('#FF0000') 
        .setTitle('User Banned')
        .setDescription(`**${ban.user.tag}** has been banned from the server.`)
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: 'Username', value: `${ban.user.tag}`, inline: true },
            { name: 'User ID', value: `${ban.user.id}`, inline: true },
            { name: 'Banned By', value: executor, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Time of ban', value: `<t:${Math.floor(kickLog.createdTimestamp / 1000)}:F>`, inline: false }
        )

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberRemove', async member => {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Audit-log channel not found');
        return;
    }

    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberKick
        });

        const kickLog = fetchedLogs.entries.first();
        if (!kickLog || kickLog.target.id !== member.id) return;

        const executor = kickLog.executor.tag;
        const reason = kickLog.reason || 'No reason provided';

        const embed = new EmbedBuilder()
            .setColor('#FF4500') 
            .setTitle('User Kicked')
            .setDescription(`**${member.user.tag}** has been removed from the server.`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'Username', value: `${member.user.tag}`, inline: true },
                { name: 'User ID', value: `${member.user.id}`, inline: true },
                { name: 'Kicked By', value: executor, inline: true },
                { name: 'Reason for Kick', value: reason, inline: false },
                { name: 'Time of Kick', value: `<t:${Math.floor(kickLog.createdTimestamp / 1000)}:F>`, inline: false }
            )
            
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
});

 client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton()) {
            const customId = interaction.customId;
 
            if (customId.startsWith("giveaway-join")) {
                const giveawayId = customId.split("-").slice(2).join("-"); 
 
                const giveaway = await Giveaway.findOne({id: giveawayId});
 
                if (!giveaway) {
                    await interaction.reply({ content: "This giveaway no longer exists.", ephemeral: true });
                }
 
                if (giveaway.participants.includes(interaction.user.id)) {
 
                    const buttonRed = new ButtonBuilder().setCustomId(`leave-giveaway-${giveawayId}`).setLabel("Leave Giveaway").setStyle(ButtonStyle.Danger)
                    const row = new ActionRowBuilder().addComponents(buttonRed)
                    await interaction.reply({ content: "You have already joined this giveaway.", ephemeral: true, components: [row] });
 
                    
                } else {
                    giveaway.participants.push(interaction.user.id);
                    await giveaway.save();
    
                    interaction.reply({ content: "You have successfully joined the giveaway!", ephemeral: true });
                }
            } else if (customId.startsWith("leave-giveaway")) {
                const giveawayId = customId.split("-").slice(2).join("-");
                const giveaway = await Giveaway.findOne({id: giveawayId});
            
                giveaway.participants = giveaway.participants.filter(participantId => participantId !== interaction.user.id);
                await giveaway.save();
            
                await interaction.reply({
                    content: "You have left the giveaway!",
                    ephemeral: true
                });
            }
        }
    });

    setInterval(async () => {
        const giveaways = await Giveaway.find();
    
        for (const giveaway of giveaways) {
            if (!giveaway.ended) {
                const now = Date.now();
                if (now >= giveaway.endTime.getTime()) { 
                    try {
                        const channel = await client.channels.fetch(giveaway.channelId);
                        const message = await channel.messages.fetch(giveaway.messageId);
    
                        const winners = selectWinners(giveaway.participants, giveaway.winnersCount);
                        const winnersText = winners.map(winner => `<@${winner}>`).join(', ');
                        const announcement = `🎉 Congratulations to the winners: ${winnersText}!`;
    
                        const embed = new EmbedBuilder().setDescription(`Winner(s): ${winnersText}`).setColor("Green").setTitle("Giveaway Ended").setFooter({text: `${giveaway.id}`});
                        await message.edit({ embeds: [embed], components: [] });
    
                        await channel.send(announcement);
 
                        giveaway.ended = true;
                        await giveaway.save();
                    } catch (error) {
                        console.error("Error in giveaway check:", error);
                    }
                }
            }
        }
 
    }, 1000)

function selectWinners(participants, count) {
    return participants.slice(0, count);
}

client.on('guildCreate', async (guild) => {
  try {
    const owner = await guild.members.fetch(guild.ownerId);

    if (owner) {
      const embed = new EmbedBuilder()
        .setColor('#00cc99')
        .setTitle('Thanks for Adding Me! 🎉')
        .setDescription(`Hey ${owner.user.username}! Thanks for inviting me to your server.`)
        .addFields(
          {
            name: '🛠 What Can I Do?',
            value: `I’m a professional **moderation-only** bot with over **15 commands** and **5 systems** ready to help you manage and entertain your server.`
          },
          {
            name: '🛒 Want a Bot Like Me?',
            value: `You can get your own custom bot here: [THIS DISCORD SERVER](https://discord.gg/EXEv9pKpT4)`
          },
          {
            name: '💡 How to Use Me',
            value: `You can use me with **slash commands**. (Prefix support is currently in beta!)`
          }
        )
        .setFooter({ text: 'Thanks for trusting me 🤖' });

      await owner.send({ embeds: [embed] });
      console.log(`Sent welcome message to ${owner.user.tag}`);
    }
  } catch (error) {
    console.error(`Error sending welcome message: ${error.message}`);
  }
});

client.on('guildDelete', async (guild) => {
  try {
    const owner = await guild.members.fetch(guild.ownerId);

    if (owner) {
      const embed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('See You Soon! 😢')
        .setDescription(`Hey ${owner.user.username}, I was removed from your server.`)
        .addFields(
          {
            name: 'Want Your Own Bot?',
            value: `Visit [THIS DISCORD SERVER](https://discord.gg/EXEv9pKpT4) and get a professional bot like me.`
          }
        )
        .setFooter({ text: 'Thanks for using me ❤️' });

      await owner.send({ embeds: [embed] });
      console.log(`Sent farewell message to ${owner.user.tag}`);
    }
  } catch (error) {
    console.error(`Error sending farewell message: ${error.message}`);
  }
});

client.login(token);