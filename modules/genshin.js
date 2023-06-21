const { SlashCommandBuilder } = require('discord.js');
const schedule = require('node-schedule');
const utility = require('../utility.js');
const database = require('../database.js');
const hoyolab = require('./utility/hoyolab.js');

database.runSync('CREATE TABLE IF NOT EXISTS `genshin_user` (' + 
    '`user_id` varchar(24) NOT NULL,' +
    '`guild_id` varchar(24) NOT NULL,' +
    '`ltoken` varchar(64) NOT NULL,' +
    '`ltuid` varchar(12) NOT NULL,' +
    'PRIMARY KEY (`user_id`))');

schedule.scheduleJob({ hour: 2, minute: 25, tz: 'Asia/Seoul' }, async function () {
    const rows = await database.all('SELECT `ltoken`, `ltuid` FROM `genshin_user`');

    for (const row of rows) {
        await hoyolab.post(row.ltoken, row.ltuid, 'https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=ko-kr&act_id=e202102251931481');
        await utility.delay(300);
    }
});

module.exports = {
    commandData: new SlashCommandBuilder()
        .setName('genshin')
        .setDescription('원신')
        .addSubcommand(subcommand =>
            subcommand.setName('register')
                .setDescription('유저를 등록합니다.')
                .addStringOption(option =>
                    option.setName('ltoken')
                        .setDescription('ltoken')
                        .setRequired(true)
                        .setMaxLength(64))
                .addStringOption(option =>
                    option.setName('ltuid')
                        .setDescription('ltuid')
                        .setRequired(true)
                        .setMaxLength(12)))
        .addSubcommand(subcommand =>
            subcommand.setName('unregister')
                .setDescription('유저 등록을 해제 합니다.')),
    commandHandler: {
        'register': {
            ephemeral: true,
            execute: async function (interaction) {
                const ltoken = interaction.options.getString('ltoken').replace(/[^a-zA-Z0-9]+/g, '');
                const ltuid = interaction.options.getString('ltuid').replace(/[^0-9]+/g, '');
                const result = await hoyolab.get(ltoken, ltuid, 'https://sg-hk4e-api.hoyolab.com/event/sol/info?lang=ko-kr&act_id=e202102251931481');

                if (!result)
                    return await interaction.editReply({ content: '계정 정보가 올바르지 않습니다.' });

                await database.run('REPLACE INTO `genshin_user` (`user_id`, `guild_id`, `uid`, `ltoken`, `ltuid`) VALUES (?, ?, ?, ?, ?)', [
                    interaction.user.id, interaction.guildId, uid, ltoken, ltuid,
                ]);

                return await interaction.editReply({ content: '등록에 성공했습니다.'});
            },
        },
        'unregister': {
            ephemeral: true,
            execute: async function (interaction) {
                const result = await database.run('DELETE FROM `genshin_user` WHERE `user_id` = ?', [
                    interaction.user.id,
                ]);

                if (result.changes > 0)
                    await interaction.editReply({ content: `등록이 해제되었습니다.` });
                else
                    await interaction.editReply({ content: `등록되지 않은 계정입니다.` });
            },
        },
    },
};
