const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database.js');
const uma = [15, 5, -5, -15];

database.runSync('CREATE TABLE IF NOT EXISTS `mahjong_rank` (' + 
    '`guild_id` varchar(24) NOT NULL,' +
    '`user_id` varchar(24) NOT NULL,' +
    '`score` INTEGER NOT NULL,' +
    'PRIMARY KEY (`guild_id`, `user_id`))');

database.runSync('CREATE TABLE IF NOT EXISTS `mahjong_session` (' + 
    '`game_id` INTEGER PRIMARY KEY AUTOINCREMENT,' +
    '`guild_id` varchar(24) NOT NULL,' +
    '`time` INTEGER NOT NULL,' +
    '`user_east` varchar(24) NOT NULL,' +
    '`point_east` INTEGER NOT NULL,' +
    '`user_south` varchar(24) NOT NULL,' +
    '`point_south` INTEGER NOT NULL,' +
    '`user_west` varchar(24) NOT NULL,' +
    '`point_west` INTEGER NOT NULL,' +
    '`user_north` varchar(24) NOT NULL,' +
    '`point_north` INTEGER NOT NULL)');

module.exports = {
    commandData: new SlashCommandBuilder()
        .setName('mahjong')
        .setDescription('마작')
        .addSubcommand(subcommand =>
            subcommand.setName('rank-list')
                .setDescription('길드 랭킹을 확인 합니다.'))
        .addSubcommand(subcommand =>
            subcommand.setName('rank-write')
                .setDescription('길드 랭킹에 점수를 기록합니다.')
                .addUserOption(option =>
                    option.setName('user-1')
                        .setDescription('플레이어 (동)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('point-1')
                        .setDescription('점수 (동)')
                        .setRequired(true)
                        .setMinValue(-256000)
                        .setMaxValue(256000))
                .addUserOption(option =>
                    option.setName('user-2')
                        .setDescription('플레이어 (남)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('point-2')
                        .setDescription('점수 (남)')
                        .setRequired(true)
                        .setMinValue(-256000)
                        .setMaxValue(256000))
                .addUserOption(option =>
                    option.setName('user-3')
                        .setDescription('플레이어 (서)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('point-3')
                        .setDescription('점수 (서)')
                        .setRequired(true)
                        .setMinValue(-256000)
                        .setMaxValue(256000))
                .addUserOption(option =>
                    option.setName('user-4')
                        .setDescription('플레이어 (북)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('point-4')
                        .setDescription('점수 (북)')
                        .setRequired(true)
                        .setMinValue(-256000)
                        .setMaxValue(256000))),
    commandHandler: {
        'rank-list': {
            execute: async function (interaction) {
                const result = await database.all('SELECT `user_id`, `score` FROM `mahjong_rank` WHERE `guild_id` = ? ORDER BY `score` DESC LIMIT 20', [
                    interaction.guildId,
                ]);

                if (result.length <= 0) {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: `${interaction.guild.name} 랭킹`,
                                    value: '기록이 없습니다.'
                                })
                        ]
                    });
                }

                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .addFields({
                                name: `${interaction.guild.name} 랭킹`,
                                value: result.map((x, i) => `${i + 1}위 / ${x.score / 10} / <@${x.user_id}>`).join('\n')
                            })
                    ]
                });
            },
        },
        'rank-write': {
            execute: async function (interaction) {
                const baseTable = [...Array(4).keys()]
                    .map(x => {
                        return {
                            id: interaction.options.getUser(`user-${x + 1}`).id,
                            point: interaction.options.getInteger(`point-${x + 1}`),
                            index: x
                        }
                    })
                const table = baseTable
                    .slice()
                    .sort((a, b) => {
                        if (a.point != b.point)
                            return b.point - a.point;

                        return a.index - b.index;
                    })
                    .map((x, i) => {
                        x.score = (x.point - 25000) / 100 + uma[i] * 10;

                        return x;
                    });

                if (table.some(x => x.point % 100 !== 0)) {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 실패',
                                    value: '점수는 100 단위여야 합니다.'
                                })
                        ]
                    });
                } else if (table.reduce((a, b) => a + b.point, 0) !== 100000) {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 실패',
                                    value: '점수의 합이 100000이 아닙니다.'
                                })
                        ]
                    });
                } else if ((new Set(table.map(x => x.id))).size !== table.length) {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 실패',
                                    value: '중복 된 유저가 존재합니다.'
                                })
                        ]
                    });
                } else {
                    await database.run('INSERT INTO `mahjong_session` (`guild_id`, `time`, `user_east`, `point_east`, `user_south`, `point_south`, `user_west`, `point_west`, `user_north`, `point_north`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                        interaction.guildId, Date.now(), baseTable[0].id, baseTable[0].point, baseTable[1].id, baseTable[1].point, baseTable[2].id, baseTable[2].point, baseTable[3].id, baseTable[3].point
                    ]);

                    for (const p of table) {
                        await database.run('INSERT INTO `mahjong_rank` (`guild_id`, `user_id`, `score`) VALUES (?, ?, ?) ON CONFLICT(`guild_id`, `user_id`) DO UPDATE SET `score` = `score` + ?', [
                            interaction.guildId, p.id, p.score, p.score,
                        ]);
                    }

                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 성공',
                                    value: table.map((x, i) => `${i + 1}위 / ${x.score / 10} (${x.point}) / <@${x.id}>`).join('\n')
                                })
                        ]
                    });
                }
            },
        }
    },
};
