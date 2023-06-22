const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios').default;
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
                        .setMaxLength(2048)))
        .addSubcommand(subcommand =>
            subcommand.setName('unregister')
                .setDescription('유저 등록을 해제 합니다.'))
        .addSubcommand(subcommand =>
            subcommand.setName('redeem')
                .setDescription('리딤 코드를 등록합니다.')
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('리딤 코드 (콤마로 구분 가능, 최대 3개)')
                        .setRequired(true)
                        .setMaxLength(128))),
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

                await database.run('REPLACE INTO `genshin_user` (`user_id`, `guild_id`, `ltoken`, `ltuid`, `cookie_token`, `cached_uid`, `cached_region`) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                    interaction.user.id, interaction.guildId, cookies.ltoken, cookies.ltuid, cookies.cookie_token, recordRow.game_role_id, recordRow.region,
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
        'redeem': {
            execute: async function (interaction) {
                const code = interaction.options.getString('code');
                const userRow = await database.get('SELECT `ltoken`, `ltuid`, `cookie_token`, `cached_uid`, `cached_region` FROM `genshin_user` WHERE `user_id` = ?', [
                    interaction.user.id
                ]);

                if (!userRow)
                    return await interaction.editReply({ content: `봇에 등록되지 않은 유저입니다.` });

                const codes = code.split(',', 3).map(x => x.trim()).filter((x, ii, a) => a.indexOf(x) == ii && x != '');
                const results = Array(codes.length).fill('...');

                await interaction.editReply(hoyolab.makeRedeemEmbeds(codes, results));

                for (var i = 0; i < codes.length; i++) {
                    let parsed = await hoyolab.webGet(userRow, 'https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey' + 
                        `?uid=${userRow.cached_uid}&region=${userRow.cached_region}&cdkey=${codes[i]}&lang=ko&game_biz=hk4e_global`);

                    results[i] = parsed ? parsed.message : '요청에 실패했습니다.';
    
                    await interaction.editReply(hoyolab.makeRedeemEmbeds(codes, results));

                    if (i != codes.length - 1)
                        await utility.delay(5000);
                }
            },
        },
    },
};
