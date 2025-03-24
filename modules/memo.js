const { EmbedBuilder } = require('discord.js');
const database = require('../database.js');

const maxTextLength = 32;
const maxContentsLength = 512;

database.runSync('CREATE TABLE IF NOT EXISTS `memo` (\n' + 
    '`guild_id` varchar(24) NOT NULL,\n' +
    '`text` varchar(128) NOT NULL,\n' +
    '`contents` varchar(512) NOT NULL,\n' +
    'PRIMARY KEY (`guild_id`, `text`))');

module.exports = {
    name: 'memo',
    description: '메모',
    commands: [
        {
            name: 'add',
            description: '메모를 추가합니다.',
            optionGenerator: o =>
                o.addStringOption(option =>
                    option.setName('text')
                        .setDescription('메모 제목')
                        .setRequired(true)
                        .setMaxLength(maxTextLength))
                .addStringOption(option =>
                    option.setName('contents')
                        .setDescription('메모 내용')
                        .setRequired(true)
                        .setMaxLength(maxContentsLength)),
            callback: async function (interaction) {
                const text = interaction.options.getString('text');
                const contents = interaction.options.getString('contents');

                await database.run('REPLACE INTO `memo` (`guild_id`, `text`, `contents`) VALUES (?, ?, ?)', [
                    interaction.guildId, text, contents,
                ]);

                await interaction.editReply(`메모 '${text}' 기록 되었습니다.`);
            },
        },
        {
            name: 'view',
            description: '메모를 확인합니다.',
            optionGenerator: o =>
                o.addStringOption(option =>
                    option.setName('text')
                        .setDescription('메모 제목')
                        .setRequired(true)
                        .setMaxLength(maxTextLength)),
            callback: async function (interaction) {
                const text = interaction.options.getString('text');

                const result = await database.get('SELECT `contents` FROM `memo` WHERE `guild_id` = ? AND `text` = ?', [
                    interaction.guildId, text,
                ]);

                if (result && result.contents) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(text)
                                .setDescription(result.contents)
                        ]
                    });
                } else {
                    await interaction.deleteReply();
                }
            },
        },
        {
            name: 'remove',
            description: '메모를 삭제합니다.',
            optionGenerator: o =>
                o.addStringOption(option =>
                    option.setName('text')
                        .setDescription('메모 제목')
                        .setRequired(true)
                        .setMaxLength(maxTextLength)),
            callback: async function (interaction) {
                const text = interaction.options.getString('text');
                
                const result = await database.run('DELETE FROM `memo` WHERE `guild_id` = ? AND `text` = ?', [
                    interaction.guildId, text,
                ]);

                if (result.changes > 0)
                    await interaction.editReply(`메모 '${text}' 삭제 되었습니다.`);
                else
                    await interaction.editReply(`메모가 존재하지 않습니다.`);
            },
        },
    ],
};
