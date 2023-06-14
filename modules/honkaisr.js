const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const schedule = require('node-schedule');
const utility = require('../utility.js');
const database = require('../database.js');
const hoyolab = require('./utility/hoyolab.js');

database.runSync('CREATE TABLE IF NOT EXISTS `honkaisr_user` (' + 
    '`user_id` varchar(24) NOT NULL,' +
    '`guild_id` varchar(24) NOT NULL,' +
    '`ltoken` varchar(64) NOT NULL,' +
    '`ltuid` varchar(12) NOT NULL,' +
    'PRIMARY KEY (`user_id`))');

schedule.scheduleJob({ hour: 2, minute: 5, tz: 'Asia/Seoul' }, async function () {
    const rows = await database.all('SELECT `ltoken`, `ltuid` FROM `honkaisr_user`');

    for (const row of rows) {
        await hoyolab.post(row.ltoken, row.ltuid, 'https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=ko-kr&act_id=e202303301540311');
        await utility.delay(300);
    }
});

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
    commandExecutor: async function (interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'register': {
                await interaction.deferReply({ ephemeral: true });

                const ltoken = interaction.options.getString('ltoken').replace(/[^a-zA-Z0-9]+/g, '');
                const ltuid = interaction.options.getString('ltuid').replace(/[^0-9]+/g, '');
                const result = await hoyolab.get(ltoken, ltuid, 'https://sg-public-api.hoyolab.com/event/luna/os/info?lang=ko-kr&act_id=e202303301540311');

                if (!result)
                    return await interaction.editReply({ content: '계정 정보가 올바르지 않습니다.' });

                await database.run('REPLACE INTO `honkaisr_user` (`user_id`, `guild_id`, `ltoken`, `ltuid`) VALUES (?, ?, ?, ?)', [
                    interaction.user.id, interaction.guildId, ltoken, ltuid,
                ]);

                return await interaction.editReply({ content: '등록에 성공했습니다.' });
            }

            case 'unregister': {
                await interaction.deferReply({ ephemeral: true });

                const result = await database.run('DELETE FROM `honkaisr_user` WHERE `user_id` = ?', [
                    interaction.user.id,
                ]);

                if (result.changes > 0)
                    return await interaction.editReply({ content: `등록이 해제되었습니다.` });
                else
                    return await interaction.editReply({ content: `등록되지 않은 계정입니다.` });
            }

            case 'info': {
                await interaction.deferReply();

                const user = interaction.options.getUser('user');
                const userRow = await database.get('SELECT `ltoken`, `ltuid` FROM `honkaisr_user` WHERE `user_id` = ?', [
                    user.id
                ]);

                if (!userRow)
                    return await interaction.editReply({ content: `봇에 등록되지 않은 유저입니다.` });

                const recordRow = await hoyolab.getGameRecordRow(userRow.ltoken, userRow.ltuid, 6, 'prod_official_asia');

                if (!recordRow)
                    return await interaction.editReply({ content: '계정이 존재하지 않습니다.' });

                const uid = recordRow.game_role_id;
                const index = await hoyolab.clientGet(userRow.ltoken, userRow.ltuid,
                    `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/index?server=prod_official_asia&role_id=${uid}`);

                if (!index)
                    return await interaction.editReply({ content: 'index 정보를 가져올 수 없습니다.' });

                const note = await hoyolab.clientGet(userRow.ltoken, userRow.ltuid,
                    `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/note?server=prod_official_asia&role_id=${uid}`);

                if (!note)
                    return await interaction.editReply({ content: 'note 정보를 가져올 수 없습니다.' });

                return await interaction.editReply({ embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `Lv. ${recordRow.level} ${recordRow.nickname} (${uid})` })
                        .setTimestamp()
                        .addFields(
                            { name: '활동 일수', value: index.stats.active_days.toString(), inline: true },
                            { name: '개방된 캐릭터', value: index.stats.avatar_num.toString(), inline: true },
                            { name: '업적 달성 개수', value: index.stats.achievement_num.toString(), inline: true },
                            { name: '오픈 전리품', value: index.stats.chest_num.toString(), inline: true },
                            { name: '망각의 정원', value: index.stats.abyss_process.replace(/<\/?[^>]+>/gi, ''), inline: true },
                            { name: '개척력', value: `${note.current_stamina}/${note.max_stamina}`, inline: true },
                        )
                        .addFields(
                            {
                                name: `실행 의뢰 (${note.accepted_epedition_num}/${note.total_expedition_num})`,
                                value: note.expeditions.map(x => {
                                    const name = x.name.replace(/<\/?[^>]+>/gi, '');

                                    if (x.remaining_time > 0) {
                                        const hour = Math.floor(x.remaining_time / 3600);
                                        const minute = Math.floor(x.remaining_time / 60) % 60;

                                        return `${name} (${hour}시간 ${minute}분 남음)`;
                                    } else {
                                        return `${name} (수령 대기 중)`;
                                    }
                                }).join('\n'),
                            },
                        )
                ]});
            }
        }
    }
};
