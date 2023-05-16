const { SlashCommandBuilder } = require('discord.js');
const { delay } = require('../utility.js');
const axios = require('axios').default;
const schedule = require('node-schedule');
const database = require('../database.js');

const statusUrl = 'https://sg-public-api.hoyolab.com/event/luna/os/info?lang=ko-kr&act_id=e202303301540311';
const attendanceUrl = 'https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=ko-kr&act_id=e202303301540311';

database.runSync('CREATE TABLE IF NOT EXISTS `honkaisr_user` (\n' + 
    '`user_id` varchar(24) NOT NULL,\n' +
    '`guild_id` varchar(24) NOT NULL,\n' +
    '`ltoken` varchar(64) NOT NULL,\n' +
    '`ltuid` varchar(12) NOT NULL,\n' +
    'PRIMARY KEY (`user_id`))');

schedule.scheduleJob({ hour: 7, minute: 5, tz: 'Asia/Seoul' }, async () => {
    const rows = await database.all('SELECT `ltoken`, `ltuid` FROM `honkaisr_user`');

    for (const row of rows) {
        await axios({
            method: 'POST',
            url: attendanceUrl,
            headers: {
                'Cookie': `ltoken=${row.ltoken};ltuid=${row.ltuid}`
            },
        });

        await delay(300);
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
                .setDescription('유저 등록을 해제 합니다.')),
    commandExecutor: async interaction => {
        switch (interaction.options.getSubcommand()) {
            case 'register':
                const ltoken = interaction.options.getString('ltoken');
                const ltuid = interaction.options.getString('ltuid');
                const statusResult = await axios({
                    method: 'GET',
                    url: statusUrl,
                    headers: {
                        'Cookie': `ltoken=${ltoken};ltuid=${ltuid}`
                    },
                });

                if (!statusResult.data || statusResult.data.retcode !== 0) {
                    await interaction.reply({ content: '계정 정보가 올바르지 않습니다.', ephemeral: true });
                    
                    break;
                }

                await database.run('REPLACE INTO `honkaisr_user` (`user_id`, `guild_id`, `ltoken`, `ltuid`) VALUES (?, ?, ?, ?)', [
                    interaction.user.id, interaction.guildId, ltoken, ltuid,
                ]);

                await interaction.reply({ content: '등록에 성공했습니다.', ephemeral: true });

                break;

            case 'unregister':
                const result = await database.run('DELETE FROM `honkaisr_user` WHERE `user_id` = ?', [
                    interaction.user.id,
                ]);

                if (result.changes > 0)
                    await interaction.reply({ content: `등록이 해제되었습니다.`, ephemeral: true });
                else
                    await interaction.reply({ content: `등록되지 않은 계정입니다.`, ephemeral: true });

                break;
        }
    }
};
