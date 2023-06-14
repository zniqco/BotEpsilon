const { SlashCommandBuilder } = require('discord.js');
const database = require('../database.js');

const maxTextLength = 32;
const maxContentsLength = 512;

database.runSync('CREATE TABLE IF NOT EXISTS `memo` (\n' + 
    '`guild_id` varchar(24) NOT NULL,\n' +
    '`text` varchar(128) NOT NULL,\n' +
    '`contents` varchar(512) NOT NULL,\n' +
    'PRIMARY KEY (`guild_id`, `text`))');

module.exports = {
    commandData: new SlashCommandBuilder()
        .setName('memo')
        .setDescription('메모')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('메모를 추가합니다.')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('메모 제목')
                        .setRequired(true)
                        .setMaxLength(maxTextLength))
                .addStringOption(option =>
                    option.setName('contents')
                        .setDescription('메모 내용')
                        .setRequired(true)
                        .setMaxLength(maxContentsLength)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('메모를 삭제합니다.')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('메모 제목')
                        .setRequired(true)
                        .setMaxLength(maxTextLength))),
    commandExecutor: async function (interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'add':
                const addText = interaction.options.getString('text');
                const addContents = interaction.options.getString('contents');

                if (addText.length > maxTextLength || addContents.length > maxContentsLength) {
                    await interaction.reply(`올바르지 않은 제목 혹은 내용입니다.`);
                } else {
                    await database.run('REPLACE INTO `memo` (`guild_id`, `text`, `contents`) VALUES (?, ?, ?)', [
                        interaction.guildId, addText, addContents,
                    ]);

                    await interaction.reply(`메모 '${addText}' 기록 되었습니다.`);
                }
                
                break;

            case 'remove':
                const deleteText = interaction.options.getString('text');

                if (deleteText.length > 32) {
                    await interaction.reply(`올바르지 않은 제목입니다.`);
                } else {
                    const result = await database.run('DELETE FROM `memo` WHERE `guild_id` = ? AND `text` = ?', [
                        interaction.guildId, deleteText,
                    ]);

                    if (result.changes > 0)
                        await interaction.reply(`메모 '${deleteText}' 삭제 되었습니다.`);
                    else
                        await interaction.reply(`메모가 존재하지 않습니다.`);
                }

                break;
        }
    },
    messageReceiver: function (message) {
        if (message.content.length <= 32) {
            (async () => {
                const result = await database.get('SELECT `contents` FROM `memo` WHERE `guild_id` = ? AND `text` = ?', [
                    message.guildId, message.content,
                ]);

                if (result && result.contents) {
                    await message.reply({ content: result.contents });
                }
            })();
        }
    }
};
