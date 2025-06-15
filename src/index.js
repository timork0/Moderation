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

    const channelID = process.env.CANAL_BIENVENIDAS; // ID DEL CANAL DE BIENVENIDA

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
        .setTitle("**Nuevo Miembro**")
        .setDescription(`Bienvenido <@${member.id}> al servidor!`)
        .setAuthor({ iconURL: avatar, name: `ID de Usuario: ${member.id}` })
        .setTimestamp()
        .setColor("Blurple")
        .setImage("attachment://profile.png");

    channel.send({ embeds: [embed], files: [imageAttachment] });
});

client.on(Events.GuildMemberRemove, async member => {
    const channelID = process.env.CANAL_SALIDAS; // ID DEL CANAL DE DESPEDIDA

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
        .setTitle("**Salida de miembro**")
        .setDescription(`😭 Adiós <@${member.id}>, ¡esperamos verte de nuevo!`)
        .setAuthor({ iconURL: avatar, name: `ID de usuario: ${member.id}` })
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

    console.log(`👋 ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Nuevo miembro unido: ${member.user.tag} (${userId})`);

    // Excluir bots
    if (member.user.bot) {
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}El bot ${member.user.tag} ha sido excluido por el anti-raid.`);
        return;
    }

    if (!raidUsers.has(guildId)) {
        raidUsers.set(guildId, new Collection());
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Se ha creado una colección para el servidor ${guildId}`);
    }

    const guildRaids = raidUsers.get(guildId);
    guildRaids.set(userId, Date.now());

    console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Usuario registrado. Total de nuevos miembros en 10s: ${guildRaids.size}`);

    setTimeout(() => {
        raidUsers.delete(userId);
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Usuario ${userId} eliminado después de 10 segundos.`);
    }, 10000);

    // 🔹 Verificar si se necesita banear
    console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Verificando si es necesario banear. guildRaids.size = ${guildRaids.size}`);

    if (guildRaids.size >= 5) { // Ban inmediato si hay 5 o más
        console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}🚨 ¡RAID DETECTADO! Activando protección en ${member.guild.name}`);
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
        console.log(`❌ ¡Canal de logs no encontrado o el bot no tiene permisos! (ID: ${logChannelId})`);
        return;
    }

    console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}El bot encontró el canal de logs: ${logChannel.id}`);

    let bannedUsersInfo = [];

    for (const [userId] of guildRaids) {
        const member = await guild.members.fetch(userId).catch(() => null);

        if (member && !member.user.bot) {
            console.log(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Baneando usuario: ${member.user.tag}`);

            await member.ban({ reason: '🚨 Protección Anti-Raid: ¡Actividad sospechosa detectada!' });

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
        .setTitle('🚨 ¡Protección Anti-Raid Activada!')
        .setColor('#ff0000') // Color HEX
        .setDescription('📌 **Los siguientes usuarios han sido baneados por actividad sospechosa:**');

    bannedUsersInfo.forEach(user => {
        embed.addFields([
            { name: "👤 Usuario:", value: `${user.mention} (${user.username})`, inline: true },
            { name: "🆔 ID:", value: user.userId, inline: true },
            { name: "📅 Cuenta Creada:", value: user.createdAtFormatted, inline: false },
            { name: "📥 Se Unió al Servidor:", value: user.joinedAtFormatted, inline: false },
            { name: "⛔ Fecha de Ban:", value: user.banDateFormatted, inline: false },
            { name: "🎭 Roles:", value: user.roles, inline: false },
            { name: "🖼️ Avatar:", value: user.avatarURL, inline: false },
            { name: "🎨 Banner:", value: user.banner, inline: false }
        ]);
    });

    // 🚀 Send embed to log channel
    logChannel.send({ embeds: [embed] })
        .then(() => console.log("✅ ¡Mensaje de registro enviado correctamente!"))
        .catch(error => console.error(`❌ Error al enviar al canal de registros:`, error));

    console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.yellow} [ANTI-RAID]${textEffects.reset} ${textEffects.reset}${color.reset}Protección Anti-Raid completada. Limpiando la lista de usuarios.`);
    raidUsers.delete(guild.id);
}

client.on('voiceStateUpdate', (oldState, newState) => {

    if (oldState.channel && !newState.channel) {

        const logChannel = oldState.guild.channels.cache.find(channel => channel.name === 'audit-log');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: 'CANAL ABANDONADO', iconURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS07YilaV52XGoxo78bYImjMSPMmybpec5Qiw&usqp=CAU' })
            .setDescription(`**Usuario:** <@${oldState.member.id}> (ID: ${oldState.member.id})
            \n**Canal:** <#${oldState.channel.id}> (ID: ${oldState.channel.id})`)
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
                name: `${newState.guild.name} | CANAL UNIDO`,
                iconURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS07YilaV52XGoxo78bYImjMSPMmybpec5Qiw&usqp=CAU'
            })
            .setDescription(`**Usuario:** <@${newState.member.id}> (ID: ${newState.member.id})
            \n**Canal:** <#${newState.channel.id}> (ID: ${newState.channel.id})`)
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
                name: 'CANAL CAMBIADO',
                iconURL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS07YilaV52XGoxo78bYImjMSPMmybpec5Qiw&usqp=CAU'
            })
            .setDescription(`**Usuario:** <@${newState.member.id}> (${newState.member.user.tag}) (ID: ${newState.member.id})
            \n**AL CANAL:** <#${newState.channel.id}> (ID: ${newState.channel.id})
            \n**DESDE CANAL:** <#${oldState.channel.id}> (ID: ${oldState.channel.id})`)
            .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869529684805840896/841989410978398218.gif?ex=65af979f&is=659d229f&hm=9fb59e190a49ca05bb9271f0518c1473983dbe4667ebf468b60bcca761c53b4f&')
            .setTimestamp();


        logChannel.send({ embeds: [embed] });
    }
});

client.on('messageDelete', (message) => {

    const logChannel = message.guild.channels.cache.find(channel => channel.name === 'audit-log');


    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Mensaje Eliminado')
        .addFields(
            { name: 'Autor', value: `@${message.author.tag} - ${message.author}`, inline: true },
            { name: 'Fecha', value: message.createdAt.toUTCString(), inline: true },
            { name: 'Canal', value: `${message.channel}`, inline: true },
            { name: 'Mensaje Eliminado', value: message.content ? message.content : 'Sin contenido de texto', inline: false }
        )
        .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869530655871082516/850923749132992550.png')
        .setTimestamp();


    if (message.attachments.size > 0) {
        embed.addFields({ name: 'URL(s) de Adjuntos', value: message.attachments.map(a => a.url).join('\n') });
    }


    logChannel.send({ embeds: [embed] });
});

client.on('roleCreate', (role) => {

    const logChannel = role.guild.channels.cache.find(channel => channel.name === 'audit-log');


    const embed = new EmbedBuilder()
        .setColor(role.hexColor)
        .setTitle('ROL CREADO')
        .addFields(
            { name: 'ROL', value: `<@&${role.id}>`, inline: true },
            { name: 'NOMBRE DEL ROL', value: role.name, inline: true },
            { name: 'ID DEL ROL', value: role.id, inline: true },
            { name: 'COLOR HEX', value: role.hexColor, inline: true },
            { name: 'POSICIÓN', value: role.position.toString(), inline: true }
        )
        .setThumbnail('https://cdn.discordapp.com/attachments/849047781276647425/869531337411952670/845717716559593512.png')
        .setTimestamp();


    logChannel.send({ embeds: [embed] });
});

client.on('roleDelete', (role) => {

    const logChannel = role.guild.channels.cache.find(channel => channel.name === 'audit-log');


    const embed = new EmbedBuilder()
        .setColor(role.hexColor)
        .setTitle('ROL ELIMINADO')
        .addFields(
            { name: 'ROL', value: role.name, inline: true },
            { name: 'ID DEL ROL', value: role.id, inline: true },
            { name: 'COLOR HEX', value: role.hexColor, inline: true },
            { name: 'POSICIÓN', value: role.position.toString(), inline: true }
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
        .setTitle('Mensaje Editado')
        .setURL(messageLink)
        .addFields(
            { name: 'Autor', value: `@${newMessage.author.tag} - ${newMessage.author}`, inline: true },
            { name: 'Fecha', value: newMessage.createdAt.toUTCString(), inline: true },
            { name: 'Canal', value: `${newMessage.channel}`, inline: true },
            { name: 'Mensaje Original', value: oldMessage.content ? oldMessage.content : 'Sin texto original', inline: false },
            { name: 'Mensaje Editado', value: newMessage.content ? newMessage.content : 'Sin texto editado', inline: false }
        )
        .addFields({ name: 'Ir al Mensaje', value: `[Haz clic aquí para ir al mensaje](${messageLink})`, inline: false })
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
            .setTitle('ROL AGREGADO')
            .addFields(
                { name: 'Miembro', value: `<@${newMember.id}>`, inline: true },
                { name: 'ID del Miembro', value: newMember.id, inline: true },
                { name: 'Rol Agregado', value: `<@&${addedRole.id}>`, inline: true },
                { name: 'ID del Rol', value: addedRole.id, inline: true },
                { name: 'Total de Roles del Usuario', value: newMember.roles.cache.size.toString(), inline: true }
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
            .setTitle('ROL REMOVIDO')
            .addFields(
                { name: 'Miembro', value: `<@${newMember.id}>`, inline: true },
                { name: 'ID del Miembro', value: newMember.id, inline: true },
                { name: 'Rol Removido', value: `<@&${removedRole.id}>`, inline: true },
                { name: 'ID del Rol', value: removedRole.id, inline: true },
                { name: 'Total de Roles del Usuario', value: newMember.roles.cache.size.toString(), inline: true }
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
        console.log('Canal audit-log no encontrado');
        return;
    }


    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('NUEVA INVITACIÓN CREADA')
        .setThumbnail('https://cdn.discordapp.com/emojis/1065300559952875620.gif')
        .addFields(
            { name: 'Código de Invitación', value: invite.code, inline: true },
            { name: 'Invitador', value: invite.inviter ? `<@${invite.inviter.id}>` : 'Desconocido', inline: true },
            { name: 'Canal', value: invite.channel ? `<#${invite.channel.id}>` : 'Desconocido', inline: true },
            { name: 'Expira', value: invite.expiresTimestamp ? new Date(invite.expiresTimestamp).toString() : 'Nunca', inline: true },
            { name: 'Usos Máximos', value: invite.maxUses.toString(), inline: true }
        )
        .setTimestamp();


    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('roleUpdate', (oldRole, newRole) => {
    const logChannel = newRole.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.log('Canal audit-log no encontrado');
        return;
    }

    let descriptionText = '';


    if (oldRole.hexColor !== newRole.hexColor) {
        descriptionText += `**Color:** Cambiado de \`${oldRole.hexColor.toUpperCase()}\` a \`${newRole.hexColor.toUpperCase()}\`\n`;
    }


    const oldPerms = new PermissionsBitField(oldRole.permissions);
    const newPerms = new PermissionsBitField(newRole.permissions);
    const addedPerms = newPerms.remove(oldPerms).toArray();
    const removedPerms = oldPerms.remove(newPerms).toArray();

    if (addedPerms.length > 0 || removedPerms.length > 0) {
        descriptionText += '**Permisos:**\n';
        if (addedPerms.length > 0) {
            descriptionText += `Agregados: \`${addedPerms.join('`, `')}\`\n`;
        }
        if (removedPerms.length > 0) {
            descriptionText += `Removidos: \`${removedPerms.join('`, `')}\`\n`;
        }
    }


    if (descriptionText !== '') {
        const embed = new EmbedBuilder()
            .setColor(newRole.hexColor)
            .setTitle(`Rol Actualizado: "${newRole.name}"`)
            .setDescription(descriptionText)
            .addFields({ name: 'ID del Rol', value: `\`${newRole.id}\``, inline: false })
            .setTimestamp()
            .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F769686808375590943.gif%3Fv%3D1&w=128&q=75')
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const logChannel = newMember.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.log('Canal audit-log no encontrado');
        return;
    }


    if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
        const duration = newMember.communicationDisabledUntilTimestamp - Date.now();

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Usuario Silenciado Temporalmente')
            .setDescription(`**Usuario:** ${newMember.user.tag}`)
            .addFields(
                { name: 'ID de Usuario', value: newMember.user.id, inline: true },
                { name: 'Duración del Silencio', value: `${Math.round(duration / 60000)} minutos`, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

client.on('emojiCreate', async emoji => {
    const logChannel = emoji.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }


    const fetchedLogs = await emoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiCreate
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Desconocido';
    if (emojiLog && emojiLog.target.id === emoji.id) {
        executor = emojiLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Nuevo Emoji Agregado')
        .setDescription(`¡Se ha agregado un nuevo emoji al servidor!`)
        .addFields(
            { name: 'Emoji', value: `${emoji}`, inline: true },
            { name: 'Nombre del Emoji', value: `\`${emoji.name}\``, inline: true },
            { name: 'ID del Emoji', value: `\`${emoji.id}\``, inline: true },
            { name: 'Animado', value: emoji.animated ? 'Sí' : 'No', inline: true },
            { name: 'Subido por', value: executor, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('emojiDelete', async emoji => {
    const logChannel = emoji.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }


    const fetchedLogs = await emoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiDelete
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Desconocido';
    if (emojiLog && emojiLog.target.id === emoji.id) {
        executor = emojiLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Emoji Eliminado 🚫')
        .setDescription(`Un emoji fue eliminado del servidor.`)
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F893811882807410759.gif%3Fv%3D1&w=128&q=75')
        .addFields(
            { name: 'Nombre del Emoji', value: `\`${emoji.name}\``, inline: true },
            { name: 'ID del Emoji', value: `\`${emoji.id}\``, inline: true },
            { name: 'Eliminado por', value: executor, inline: true }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
    const logChannel = newEmoji.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }


    const fetchedLogs = await newEmoji.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.EmojiUpdate
    }).catch(console.error);

    const emojiLog = fetchedLogs?.entries.first();
    let executor = 'Desconocido';
    if (emojiLog && emojiLog.target.id === newEmoji.id) {
        executor = emojiLog.executor.tag;
    }


    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('Emoji Actualizado 🔄')
        .setDescription(`Un emoji ha sido actualizado en el servidor.`)
        .addFields(
            { name: 'Nombre Anterior', value: `\`${oldEmoji.name}\``, inline: true },
            { name: 'Nuevo Nombre', value: `\`${newEmoji.name}\``, inline: true },
            { name: 'ID del Emoji', value: `\`${newEmoji.id}\``, inline: true },
            { name: 'Actualizado por', value: executor, inline: true }
        )
        .setThumbnail(newEmoji.url)
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('channelCreate', async channel => {
    const logChannel = channel.guild.channels.cache.find(ch => ch.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }


    const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate
    }).catch(console.error);

    const channelLog = fetchedLogs?.entries.first();
    const executor = channelLog?.executor.tag || 'Desconocido';


    const permissionsOverview = channel.permissionOverwrites.cache.map(overwrite => {
        const role = channel.guild.roles.cache.get(overwrite.id);
        const canView = overwrite.allow.has(PermissionsBitField.Flags.ViewChannel);
        return canView ? `✅ ${role.name}` : '';
    }).filter(name => name).join('\n') || 'Ningún rol con acceso explícito de vista.';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🆕 Canal Creado')
        .setDescription(`¡Se ha creado un nuevo canal!`)
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F1000566451213701180.gif%3Fv%3D1&w=128&q=75')
        .addFields(
            { name: 'Nombre', value: channel.name, inline: true },
            { name: 'Tipo', value: ChannelType[channel.type], inline: true },
            { name: 'Categoría', value: channel.parent?.name || 'Ninguna', inline: true },
            { name: 'Creado por', value: executor, inline: true },
            { name: 'Roles con Acceso de Vista', value: permissionsOverview, inline: false },
            { name: 'ID del Canal', value: channel.id, inline: false }
        )
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('channelDelete', async channel => {
    const logChannel = channel.guild.channels.cache.find(ch => ch.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }

    let executor = 'Desconocido';


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
        .setTitle('Canal Eliminado')
        .setDescription(`**Nombre:** ${channel.name}\n**Tipo:** ${ChannelType[channel.type]}\n**Eliminado por:** ${executor}`)
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
        console.error('Canal audit-log no encontrado');
        return;
    }

    let executor = 'Desconocido';


    const fetchedLogs = await newChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate
    }).catch(console.error);

    if (fetchedLogs && fetchedLogs.entries.size > 0) {
        const channelLog = fetchedLogs.entries.first();
        if (channelLog && channelLog.target.id === newChannel.id) {
            executor = channelLog.executor.tag || 'Desconocido';
        }
    }

    const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('Canal Actualizado')
        .setDescription(`Un canal ha sido actualizado en el servidor.`)
        .addFields(
            { name: 'ID del Canal', value: newChannel.id, inline: true },
            { name: 'Actualizado por', value: executor, inline: true }
        )
        .setThumbnail('https://discords.com/_next/image?url=https%3A%2F%2Fcdn.discordapp.com%2Femojis%2F1000566451213701180.gif%3Fv%3D1&w=128&q=75')
        .setTimestamp()
        .setFooter({ text: `Registro de Actualización de Canal`, iconURL: newChannel.guild.iconURL({ dynamic: true }) });


    if (oldChannel.name !== newChannel.name) {
        embed.addFields(
            { name: 'Nombre Anterior', value: oldChannel.name, inline: true },
            { name: 'Nuevo Nombre', value: newChannel.name, inline: true }
        );
    }

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('messageDelete', async message => {
    if (message.mentions.users.size > 0 && Date.now() - message.createdTimestamp < 5000) {
        const logChannel = message.guild.channels.cache.find(channel => channel.name === 'audit-log');
        if (!logChannel) {
            console.error('Canal audit-log no encontrado');
            return;
        }

        let executor = 'Desconocido';
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

            executor = message.author.tag + ' (Auto-eliminación)';
        }

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('Ghost Ping Detectado 🚫')
            .setDescription(`Un mensaje que mencionaba a un usuario fue eliminado rápidamente.`)
            .addFields(
                { name: 'Autor', value: message.author.tag, inline: true },
                { name: 'Contenido', value: message.content, inline: true },
                { name: 'Eliminado por', value: executor, inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(console.error);
    }
});

client.on('messageDeleteBulk', async messages => {
    const logChannel = messages.first().guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }

    const fetchedLogs = await messages.first().guild.fetchAuditLogs({
        limit: 1,
        type: 'MESSAGE_BULK_DELETE'
    }).catch(console.error);

    const deletionLog = fetchedLogs?.entries.first();
    let executor = 'Desconocido';
    if (deletionLog) {
        executor = deletionLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('Mensajes Eliminados en Masa 🚫')
        .setDescription(`${messages.size} mensajes fueron eliminados en masa.`)
        .addFields(
            { name: 'Canal', value: messages.first().channel.name, inline: true },
            { name: 'Eliminado por', value: executor, inline: true }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberAdd', member => {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }

    const accountCreationDate = member.user.createdAt;
    const accountAge = new Date() - accountCreationDate;
    const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 7 días

    let accountAgeWarning = '';
    if (accountAge < sevenDaysInMilliseconds) {
        accountAgeWarning = '⚠️ **Esta cuenta tiene menos de 7 días. ¡Admins, por favor tomen nota!** ⚠️';
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`**${member.user.tag}** se ha unido`)
        .setDescription(`¡Resumen de la cuenta de ${member.user.tag}! 
        
        **${accountAgeWarning}**`)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Miembro #', value: `${member.guild.memberCount}`, inline: true },
            { name: 'Cuenta Creada', value: `${accountCreationDate.toDateString()}`, inline: true }
        )

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberRemove', member => {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Miembro Abandonó el Servidor')
        .setDescription(`**${member.user.tag}** ha salido de **${member.guild.name}**.`)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Usuario', value: `${member.user.tag}`, inline: true },
            { name: 'ID del Miembro', value: `${member.id}`, inline: true },
            { name: 'Total de Miembros Ahora', value: `${member.guild.memberCount}`, inline: true }
        )


    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildBanRemove', async (ban) => {
    const logChannel = ban.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
        return;
    }

    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove
    }).catch(console.error);

    const unbanLog = fetchedLogs?.entries.first();
    let executor = 'Desconocido';
    if (unbanLog) {
        executor = unbanLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setColor('#32a852')
        .setTitle('Usuario Desbaneado')
        .setDescription(`**${ban.user.tag}** ha sido desbaneado de **${ban.guild.name}**.`)
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: 'Usuario Desbaneado', value: `${ban.user.tag}`, inline: true },
            { name: 'ID de Usuario', value: `${ban.user.id}`, inline: true },
            { name: 'Desbaneado por', value: executor, inline: true }
        )

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildBanAdd', async (ban) => {
    const logChannel = ban.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal ban-log no encontrado');
        return;
    }


    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: 22
    }).catch(console.error);

    const banLog = fetchedLogs?.entries.first();
    let executor = banLog?.executor?.tag || 'Desconocido';
    let reason = banLog?.reason || 'Sin motivo proporcionado';

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Usuario Baneado')
        .setDescription(`**${ban.user.tag}** ha sido baneado del servidor.`)
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: 'Usuario', value: `${ban.user.tag}`, inline: true },
            { name: 'ID de Usuario', value: `${ban.user.id}`, inline: true },
            { name: 'Baneado por', value: executor, inline: true },
            { name: 'Motivo', value: reason, inline: false },
            { name: 'Hora del Ban', value: `<t:${Math.floor(kickLog.createdTimestamp / 1000)}:F>`, inline: false }
        )

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

client.on('guildMemberRemove', async member => {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'audit-log');
    if (!logChannel) {
        console.error('Canal audit-log no encontrado');
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
        const reason = kickLog.reason || 'Sin motivo proporcionado';

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('Usuario Expulsado')
            .setDescription(`**${member.user.tag}** ha sido expulsado del servidor.`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'Usuario', value: `${member.user.tag}`, inline: true },
                { name: 'ID de Usuario', value: `${member.user.id}`, inline: true },
                { name: 'Expulsado por', value: executor, inline: true },
                { name: 'Motivo de Expulsión', value: reason, inline: false },
                { name: 'Hora de Expulsión', value: `<t:${Math.floor(kickLog.createdTimestamp / 1000)}:F>`, inline: false }
            )

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error obteniendo logs:', error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith("giveaway-join")) {
            const giveawayId = customId.split("-").slice(2).join("-");

            const giveaway = await Giveaway.findOne({ id: giveawayId });

            if (!giveaway) {
                await interaction.reply({ content: "Este sorteo ya no existe.", ephemeral: true });
            }

            if (giveaway.participants.includes(interaction.user.id)) {

                const buttonRed = new ButtonBuilder().setCustomId(`leave-giveaway-${giveawayId}`).setLabel("Salir del Sorteo").setStyle(ButtonStyle.Danger)
                const row = new ActionRowBuilder().addComponents(buttonRed)
                await interaction.reply({ content: "Ya te has unido a este sorteo.", ephemeral: true, components: [row] });


            } else {
                giveaway.participants.push(interaction.user.id);
                await giveaway.save();

                interaction.reply({ content: "¡Te has unido al sorteo exitosamente!", ephemeral: true });
            }
        } else if (customId.startsWith("leave-giveaway")) {
            const giveawayId = customId.split("-").slice(2).join("-");
            const giveaway = await Giveaway.findOne({ id: giveawayId });

            giveaway.participants = giveaway.participants.filter(participantId => participantId !== interaction.user.id);
            await giveaway.save();

            await interaction.reply({
                content: "¡Has salido del sorteo!",
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
                    const announcement = `🎉 ¡Felicidades a los ganadores: ${winnersText}!`;

                    const embed = new EmbedBuilder().setDescription(`Ganador(es): ${winnersText}`).setColor("Green").setTitle("Sorteo Finalizado").setFooter({ text: `${giveaway.id}` });
                    await message.edit({ embeds: [embed], components: [] });

                    await channel.send(announcement);

                    giveaway.ended = true;
                    await giveaway.save();
                } catch (error) {
                    console.error("Error en la comprobación del sorteo:", error);
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
                .setTitle('¡Gracias por añadirme! 🎉')
                .setDescription(`¡Hola ${owner.user.username}! Gracias por invitarme a tu servidor.`)
                .addFields(
                    {
                        name: '🛠 ¿Qué puedo hacer?',
                        value: `Soy un bot profesional **solo de moderación** con más de **15 comandos** y **5 sistemas** listos para ayudarte a gestionar y entretener tu servidor.`
                    },
                    {
                        name: '🛒 ¿Quieres un bot como yo?',
                        value: `Puedes obtener tu propio bot personalizado aquí: [ESTE SERVIDOR DE DISCORD](https://discord.gg/EXEv9pKpT4)`
                    },
                    {
                        name: '💡 ¿Cómo usarme?',
                        value: `Puedes usarme con **comandos de barra**. (¡El soporte para prefijos está en beta!)`
                    }
                )
                .setFooter({ text: 'Gracias por confiar en mí 🤖' });

            await owner.send({ embeds: [embed] });
            console.log(`Mensaje de bienvenida enviado a ${owner.user.tag}`);
        }
    } catch (error) {
        console.error(`Error enviando mensaje de bienvenida: ${error.message}`);
    }
});

client.on('guildDelete', async (guild) => {
    try {
        const owner = await guild.members.fetch(guild.ownerId);

        if (owner) {
            const embed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('¡Hasta pronto! 😢')
                .setDescription(`Hola ${owner.user.username}, fui eliminado de tu servidor.`)
                .addFields(
                    {
                        name: '¿Quieres tu propio bot?',
                        value: `Visita [ESTE SERVIDOR DE DISCORD](https://discord.gg/EXEv9pKpT4) y obtén un bot profesional como yo.`
                    }
                )
                .setFooter({ text: 'Gracias por usarme ❤️' });

            await owner.send({ embeds: [embed] });
            console.log(`Mensaje de despedida enviado a ${owner.user.tag}`);
        }
    } catch (error) {
        console.error(`Error enviando mensaje de despedida: ${error.message}`);
    }
});

client.login(token);