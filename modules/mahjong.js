const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../database.js');
const baseUma = [15, 5, -5, -15];
const baseRating = 1000;
const ratingMultiplier = 10;

database.runSync('CREATE TABLE IF NOT EXISTS `mahjong_rank` (' + 
    '`guild_id` varchar(24) NOT NULL,' +
    '`user_id` varchar(24) NOT NULL,' +
    '`rating` INTEGER NOT NULL,' +
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
                const result = await database.all('SELECT `user_id`, `rating` FROM `mahjong_rank` WHERE `guild_id` = ? ORDER BY `rating` DESC LIMIT 20', [
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
                                value: result.map((x, i) => `${i + 1}위 / ${x.rating / ratingMultiplier} / <@${x.user_id}>`).join('\n')
                            })
                    ]
                });
            },
        },
        'rank-write': {
            execute: async function (interaction) {
                const players = getPlayersFromInteraction(interaction);

                if (players.some(x => x.point % 100 !== 0)) {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 실패',
                                    value: '점수는 100 단위여야 합니다.'
                                })
                        ]
                    });
                } else if (players.reduce((a, b) => a + b.point, 0) !== 100000) {
                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 실패',
                                    value: '점수의 합이 100000이 아닙니다.'
                                })
                        ]
                    });
                } else if ((new Set(players.map(x => x.id))).size !== players.length) {
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
                        guildId, Date.now(), players[0].id, players[0].point, players[1].id, players[1].point, players[2].id, players[2].point, players[3].id, players[3].point
                    ]);

                    const table = await submitRank(interaction.guildId, players);

                    return await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .addFields({
                                    name: '등록 성공',
                                    value: table.map((x, i) => `${i + 1}위 / ${x.uma / 10} (${x.point}) / <@${x.id}>`).join('\n')
                                })
                        ]
                    });
                }
            },
        }
    },
};

function getPlayersFromInteraction(interaction) {
    return [...Array(4).keys()]
        .map(x => {
            return {
                id: interaction.options.getUser(`user-${x + 1}`).id,
                point: interaction.options.getInteger(`point-${x + 1}`),
                index: x
            }
        });
}

function getSortedPlayers(players) {
    return players
        .slice()
        .sort((a, b) => {
            if (a.point != b.point)
                return b.point - a.point;

            return a.index - b.index;
        })
        .map((x, i) => {
            x.uma = (x.point - 25000) / 100 + baseUma[i] * 10;

            return x;
        });
}

async function submitRank(guildId, players) {
    const table = getSortedPlayers(players);

    for (const p of table) {
        const row = await database.get('SELECT `rating` FROM `mahjong_rank` WHERE `guild_id` = ? AND `user_id` = ?', [guildId, p.id]);
        const rating = row ? row.rating : (baseRating * ratingMultiplier);

        p.rating = rating;
    }

    const count = table.length;
    const k = (40 * ratingMultiplier) / (count - 1);

    for (let i = 0; i < count; i++) {
        const s0 = table[i].rating;

        table[i].updateRating = 0;

        for (let j = 0; j < count; j++) {
            if (i !== j) {
                const s1 = table[j].rating;
                const delta = (i < j) ? 1 : 0;
                const c = 1 / (1 + Math.pow(10, (s1 - s0) / (400 * ratingMultiplier)));

                table[i].updateRating += Math.round(k * (delta - c));
            }
        }
    }

    for (const p of table) {
        await database.run('INSERT INTO `mahjong_rank` (`guild_id`, `user_id`, `rating`) VALUES (?, ?, ?) ON CONFLICT(`guild_id`, `user_id`) DO UPDATE SET `rating` = `rating` + ?', [
            guildId, p.id, baseRating * ratingMultiplier + p.updateRating, p.updateRating,
        ]);
    }

    return table;
}

/*
async function migrateRanking() {
    const games = await database.all('SELECT * FROM `mahjong_session` ORDER BY `game_id` ASC');

    await database.run('DELETE FROM `mahjong_rank`');

    for (const game of games) {
        const players = [
            {
                id: game.user_east,
                point: game.point_east,
                index: 0,
            },
            {
                id: game.user_south,
                point: game.point_south,
                index: 1,
            },
            {
                id: game.user_west,
                point: game.point_west,
                index: 2,
            },
            {
                id: game.user_north,
                point: game.point_north,
                index: 3,
            },
        ];

        const table = await submitRank(game.guild_id, players);

        console.log(table.map((x, i) => `${i + 1}위 / ${x.uma / 10} (${x.point}) / ${x.updateRating} / <@${x.id}>`).join('\n'));
    }
}

(async () => {
    await migrateRanking();
})();
*/
