const { Events, ChannelType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const ModmailData = require('../schemas/modmail');

const guildId = '1371235050695426098'; // ID DE TU SERVIDOR
const modmailCategory = '1373060086003535913'; // ID DE LA CATEGORIA DONDE SE CREARA LAS SOLICITUDES DEL MODMAIL
const userIDs = ['1323441887503450228']; // IDS DE LOS USUARIOS PARA ACCEDER AL MODMAIL SIN NECESITAR UN ROL
const roleIDs = ['1373060192807424000', '1373060220410007612']; // IDS DE LOS ROLES DEL STAFF DEL MODMAIL

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const userId = message.author.id;
    const guild = await message.client.guilds.fetch(guildId);
    const UserMessage = message.content;

    if (message.author.bot) return;

    if (message.channel.type === ChannelType.DM) {
      try {
        const modmailData = await ModmailData.findOne({ userId: userId });
        const welcomeStatus = modmailData?.welcome ?? false;
        const modmailReason = modmailData?.issue ?? null;
        const modmailChannel = modmailData?.channel ?? null;

        if (!welcomeStatus) {
          const welcomeEmbed = new EmbedBuilder()
            .setTitle('Bienvenido')
            .setColor('Green')
            .setDescription('Bienvenido a nuestro sistema de Modmail.\nSi deseas contactar a nuestro equipo, por favor envía en el siguiente mensaje tu problema o envía `cancelar` para cancelar el Modmail.')
            .setTimestamp();

          await message.channel.send({ embeds: [welcomeEmbed] });

          await ModmailData.updateOne(
            { userId: userId },
            { $set: { welcome: true } },
            { upsert: true }
          );

          return;
        }

        if (!modmailReason) {
          if (UserMessage !== 'cancelar') {
            await ModmailData.updateOne(
              { userId: userId },
              { $set: { issue: UserMessage } },
              { upsert: true }
            );

            const Category = await guild.channels.fetch(modmailCategory);

            const channel = await guild.channels.create({
              name: `${message.author.tag}`,
              type: ChannelType.GuildText,
              parent: Category,
            });

            await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });

            for (const userID of userIDs) {
              await channel.permissionOverwrites.edit(userID, { ViewChannel: true });
            }

            for (const roleID of roleIDs) {
              await channel.permissionOverwrites.edit(roleID, { ViewChannel: true });
            }

            await ModmailData.updateOne(
              { userId: userId },
              { $set: { channel: channel.id } },
              { upsert: true }
            );

            const startEmbed = new EmbedBuilder()
              .setTitle('¡Conectado!')
              .setColor('Green')
              .setDescription('Ahora estás conectado con nuestro staff.')
              .setTimestamp();

            await message.channel.send({ embeds: [startEmbed] });

            const infoEmbed = new EmbedBuilder()
              .setTitle('Modmail')
              .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
              .setDescription(`${message.author} (${message.author.tag}) necesita nuestra ayuda!\n\nProblema: \`${UserMessage}\``)
              .setColor('Green')
              .setTimestamp();

            const closeButton = new ButtonBuilder()
              .setCustomId('close_modmail')
              .setLabel('Cerrar ModMail')
              .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            const infoMessage = await channel.send({
              embeds: [infoEmbed],
              components: [row]
            });

            await infoMessage.pin();
          } else {
            await ModmailData.deleteOne({ userId: userId });

            const cancelEmbed = new EmbedBuilder()
              .setTitle('Cancelado')
              .setColor('Red')
              .setDescription('Has cancelado el modmail.');

            await message.channel.send({ embeds: [cancelEmbed] });
          }

          return;
        } else {
          const userChannel = await message.client.channels.fetch(modmailChannel);

          const embedMessage = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
            .setDescription(message.content)
            .setTimestamp();

          try {
            await userChannel.send({ embeds: [embedMessage] });
            await message.react('✅');
          } catch (err) {
            console.log(`Ocurrió un error al enviar el mensaje de modmail de ${message.author.tag}.\nError:\n${err}`);
            await message.channel.send('Ocurrió un error al enviar tu mensaje.');
            await message.react('❌');
          }

          return;
        }
      } catch (err) {
        await message.channel.send('Ocurrió un error, por favor intenta más tarde.');
        console.log(`Ocurrió un error en el chat con ${message.author.tag}\nError:\n${err}`);
        return;
      }
    }

    // En el canal del servidor
    try {
      if (message.channel.type === ChannelType.GuildText) {
        const modmailServerData = await ModmailData.findOne({ channel: message.channel.id });
        const modmailUserId = modmailServerData?.userId ?? null;
        const modmailChannelId = modmailServerData?.channel ?? null;

        if (!modmailChannelId) return;

        const user = await message.client.users.fetch(modmailUserId);

        if (message.content === '!ping') {
          const wakeup = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
            .setTitle('¡Despierta!')
            .setDescription('Por favor responde en este modmail, o este modmail será cerrado pronto.')
            .setColor('Red')
            .setTimestamp();

          await user.send({ embeds: [wakeup] });
          wakeup.setDescription('¡El mensaje fue enviado al usuario!');
          await message.reply({ embeds: [wakeup] });
          return;
        }

        if (message.content === '!close') {
          const close = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
            .setTitle('Cerrar')
            .setColor('Red')
            .setDescription('El modmail ha sido cerrado. Elimina el ticket con !delete')
            .setTimestamp();

          await message.reply({ embeds: [close] });
          await user.send({ embeds: [close] });
          return;
        }

        if (message.content === '!delete') {
          const deleteEmbed = new EmbedBuilder()
            .setTitle('Eliminar')
            .setDescription('El ticket será eliminado en 5 segundos.')
            .setColor('Red')
            .setTimestamp();

          await user.send({ embeds: [deleteEmbed] });
          await message.reply({ embeds: [deleteEmbed] });

          setTimeout(async () => {
            deleteEmbed.setDescription('El ticket ha sido eliminado.');

            await message.channel.delete();
            await ModmailData.deleteOne({ userId: user.id });
            await user.send({ embeds: [deleteEmbed] });
          }, 5000);
        } else {
          const embedMessage = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
            .setDescription(message.content)
            .setTimestamp();

          try {
            await user.send({ embeds: [embedMessage] });
            await message.react('✅');
          } catch (err) {
            await message.reply('Ocurrió un error, por favor intenta más tarde.');
            await message.react('❌');
            console.log(`Error al enviar modmail de ${message.author.tag} a ${user.tag}\n${err}`);
          }
        }
      }
    } catch (err) {
      console.log(`Ocurrió un error al manejar el mensaje de modmail de ${message.author.tag}\nError:\n${err}`);
      await message.reply('Ocurrió un error al enviar tu mensaje.');
      await message.react('❌');
    }
  }
};
