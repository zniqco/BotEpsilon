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
    '`cookie_token` varchar(64) NOT NULL,' +
    '`cached_uid` varchar(12) NOT NULL,' +
    '`cached_region` varchar(24) NOT NULL,' +
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
                    option.setName('cookie')
                        .setDescription('ltoken')
                        .setRequired(true)
                        .setMaxLength(1024)))
        .addSubcommand(subcommand =>
            subcommand.setName('unregister')
                .setDescription('유저 등록을 해제 합니다.')),
    commandHandler: {
        'register': {
            ephemeral: true,
            execute: async function (interaction) {
                const cookie = interaction.options.getString('cookie');
                const cookies = utility.parseCookie(cookie);

                if (!cookies.ltoken || !cookies.ltuid || !cookies.cookie_token)
                    return await interaction.editReply({ content: '쿠키가 올바르지 않습니다.' });

                const region = 'os_asia';
                const recordRow = await hoyolab.getGameRecordRow(cookies.ltoken, cookies.ltuid, 2, region);

                if (!recordRow)
                    return await interaction.editReply({ content: '계정이 존재하지 않습니다.' });

                const infoResult = await hoyolab.get(cookies.ltoken, cookies.ltuid, 'https://sg-hk4e-api.hoyolab.com/event/sol/info?lang=ko-kr&act_id=e202102251931481');

                if (!infoResult)
                    return await interaction.editReply({ content: '출석 체크 정보가 존재하지 않습니다.' });

                await database.run('REPLACE INTO `genshin_user` (`user_id`, `guild_id`, `ltoken`, `ltuid`, `cookie_token`) VALUES (?, ?, ?, ?, ?)', [
                    interaction.user.id, interaction.guildId, cookies.ltoken, cookies.ltuid, cookies.cookie_token
                ]);

                await interaction.editReply({ content: '등록에 성공했습니다.' });
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
