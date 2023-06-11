const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const utility = require('../utility.js');
const axios = require('axios').default;
const schedule = require('node-schedule');
const md5 = require('md5');
const database = require('../database.js');

database.runSync('CREATE TABLE IF NOT EXISTS `honkaisr_user` (' + 
    '`user_id` varchar(24) NOT NULL,' +
    '`guild_id` varchar(24) NOT NULL,' +
    '`ltoken` varchar(64) NOT NULL,' +
    '`ltuid` varchar(12) NOT NULL,' +
    'PRIMARY KEY (`user_id`))');

schedule.scheduleJob({ hour: 6, minute: 5, tz: 'Asia/Seoul' }, async () => {
    const rows = await database.all('SELECT `ltoken`, `ltuid` FROM `honkaisr_user`');

    for (const row of rows) {
        await axios({
            method: 'POST',
            url: 'https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=ko-kr&act_id=e202303301540311',
            headers: {
                'Cookie': `ltoken=${row.ltoken};ltuid=${row.ltuid}`
            },
        });

        await utility.delay(300);
    }
});

function getDynamicSecret() {
    // https://github.com/thesadru/genshinstats/issues/54
    const t = Math.floor(Date.now() / 1000);
    const r = utility.randomString(6);
    const hash = md5(`salt=6s25p5ox5y14umn1p61aqyyvbvvl3lrt&t=${t}&r=${r}`);
    
    return `${t},${r},${hash}`;
}

module.exports = {
    commandData: new SlashCommandBuilder()
        .setName('honkaisr')
        .setDescription('붕괴: 스타레일')
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
                .setDescription('유저 등록을 해제 합니다.'))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('정보를 확인합니다.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('확인 대상')
                        .setRequired(true))),
    commandExecutor: async interaction => {
        switch (interaction.options.getSubcommand()) {
            case 'register':
            {
                await interaction.deferReply({ ephemeral: true });

                const ltoken = interaction.options.getString('ltoken').replace(/[^a-zA-Z0-9]+/g, '');
                const ltuid = interaction.options.getString('ltuid').replace(/[^0-9]+/g, '');
                const cookie = `ltoken=${ltoken};ltuid=${ltuid}`;
                const infoResult = await axios({
                    method: 'GET',
                    url: 'https://sg-public-api.hoyolab.com/event/luna/os/info?lang=ko-kr&act_id=e202303301540311',
                    headers: {
                        'Cookie': cookie
                    },
                });

                if (infoResult?.data?.retcode !== 0)
                    return await interaction.editReply({ content: '계정 정보가 올바르지 않습니다.' });

                await database.run('REPLACE INTO `honkaisr_user` (`user_id`, `guild_id`, `ltoken`, `ltuid`) VALUES (?, ?, ?, ?)', [
                    interaction.user.id, interaction.guildId, ltoken, ltuid,
                ]);

                return await interaction.editReply({ content: '등록에 성공했습니다.' });
            }

            case 'unregister':
            {
                await interaction.deferReply({ ephemeral: true });

                const result = await database.run('DELETE FROM `honkaisr_user` WHERE `user_id` = ?', [
                    interaction.user.id,
                ]);

                if (result.changes > 0)
                    return await interaction.editReply({ content: `등록이 해제되었습니다.` });
                else
                    return await interaction.editReply({ content: `등록되지 않은 계정입니다.` });
            }

            case 'info':
            {
                await interaction.deferReply();

                const user = interaction.options.getUser('user');
                const userRow = await database.get('SELECT `ltoken`, `ltuid` FROM `honkaisr_user` WHERE `user_id` = ?', [
                    user.id
                ]);

                if (!userRow)
                    return await interaction.editReply({ content: `봇에 등록되지 않은 유저입니다.` });

                // Record card
                const cookie = `ltoken=${userRow.ltoken};ltuid=${userRow.ltuid}`;
                const recordCardResult = await axios({
                    method: 'GET',
                    url: `https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${userRow.ltuid}`,
                    headers: {
                        'Cookie': cookie
                    },
                });                
                const recordRows = recordCardResult?.data?.data?.list?.filter(x => x.game_id == 6 && x.region == 'prod_official_asia');
                const recordRow = recordRows[0];

                if (!recordRow)
                    return await interaction.editReply({ content: '계정이 존재하지 않습니다.' });

                // Index
                const uid = recordRow.game_role_id;
                const indexResult = await axios({
                    method: 'GET',
                    url: `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/index?server=prod_official_asia&role_id=${uid}`,
                    headers: {
                        'x-rpc-client_type': 5,
                        'x-rpc-app_version': '1.5.0',
                        'x-rpc-language': 'ko-kr',
                        'DS': getDynamicSecret(),
                        'Cookie': cookie
                    },
                });
                const indexData = indexResult?.data?.data;

                if (!indexData)
                    return await interaction.editReply({ content: '"index" 정보를 가져올 수 없습니다.' });

                // Note
                const noteResult = await axios({
                    method: 'GET',
                    url: `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/note?server=prod_official_asia&role_id=${uid}`,
                    headers: {
                        'x-rpc-client_type': 5,
                        'x-rpc-app_version': '1.5.0',
                        'x-rpc-language': 'ko-kr',
                        'DS': getDynamicSecret(),
                        'Cookie': cookie
                    },
                });
                const noteData = noteResult?.data?.data;

                if (!noteData)
                    return await interaction.editReply({ content: '"note" 정보를 가져올 수 없습니다.' });

                const stats = indexData.stats;

                return await interaction.editReply({ embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `Lv. ${recordRow.level} ${recordRow.nickname} (UID: ${uid})` })
                        .setTimestamp()
                        .addFields(
                            { name: '활동 일수', value: stats.active_days.toString(), inline: true },
                            { name: '개방된 캐릭터', value: stats.avatar_num.toString(), inline: true },
                            { name: '업적 달성 개수', value: stats.achievement_num.toString(), inline: true },
                            { name: '오픈 전리품', value: stats.chest_num.toString(), inline: true },
                            { name: '망각의 정원', value: stats.abyss_process.replace(/<\/?[^>]+>/gi, ''), inline: true },
                            { name: '개척력', value: `${noteData.current_stamina}/${noteData.max_stamina}`, inline: true },
                        )
                ]});
            }
        }
    }
};
