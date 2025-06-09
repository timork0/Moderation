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
            .setTitle('Welcome')
            .setColor('Green')
            .setDescription('Welcome to our Modmail system.\nIf you wish to contact our Team, please send in the next message your issue or send `cancel` to cancel the Modmail.')
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
          if (UserMessage !== 'cancel') {
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
              .setTitle('Connected!')
              .setColor('Green')
              .setDescription('You are now connected to our staff.')
              .setTimestamp();

            await message.channel.send({ embeds: [startEmbed] });

            const infoEmbed = new EmbedBuilder()
              .setTitle('Modmail')
              .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
              .setDescription(`${message.author} (${message.author.tag}) needs our help!\n\nIssue: \`${UserMessage}\``)
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
              .setTitle('Cancel')
              .setColor('Red')
              .setDescription('You have canceled the modmail.');

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
            console.log(`An error occurred while sending ${message.author.tag} modmail message.\nError:\n${err}`);
            await message.channel.send('An error occurred while sending your message.');
            await message.react('❌');
          }

          return;
        }
      } catch (err) {
        await message.channel.send('An error occurred, please try again later.');
        console.log(`An error occurred while in chat with ${message.author.tag}\nError:\n${err}`);
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
            .setTitle('Wake up!')
            .setDescription('Please respond in this modmail, or this modmail will be closed soon.')
            .setColor('Red')
            .setTimestamp();

          await user.send({ embeds: [wakeup] });
          wakeup.setDescription('The message was sent to the user!');
          await message.reply({ embeds: [wakeup] });
          return;
        }

        if (message.content === '!close') {
          const close = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
            .setTitle('Close')
            .setColor('Red')
            .setDescription('The modmail is now closed. Delete the ticket with !delete')
            .setTimestamp();

          await message.reply({ embeds: [close] });
          await user.send({ embeds: [close] });
          return;
        }

        if (message.content === '!delete') {
          const deleteEmbed = new EmbedBuilder()
            .setTitle('Delete')
            .setDescription('The ticket will be deleted in 5 seconds.')
            .setColor('Red')
            .setTimestamp();

          await user.send({ embeds: [deleteEmbed] });
          await message.reply({ embeds: [deleteEmbed] });

          setTimeout(async () => {
            deleteEmbed.setDescription('The ticket is now deleted.');

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
            await message.reply('An error occurred, please try again later.');
            await message.react('❌');
            console.log(`Error while sending modmail from ${message.author.tag} to ${user.tag}\n${err}`);
          }
        }
      }
    } catch (err) {
      console.log(`An error occurred while handling modmail message from ${message.author.tag}\nError:\n${err}`);
      await message.reply('An error occurred while sending your message.');
      await message.react('❌');
    }
  }
};
