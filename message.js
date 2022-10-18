const discord = require('./discord.js');
const database = require('./database.js');

discord.client.on('messageCreate', message => {
    if (message && !message.reference && message.author.id != discord.client.user.id) {
        // MahjongSoul Room number Utility
        let roomNumber = '';

        const globalRoomLink = message.content.match(/(https|http):\/\/mahjongsoul\.game\.yo-star\.com(\/index.html|\/|)\?room=([0-9]{5})/);

        if (globalRoomLink) {
            roomNumber = globalRoomLink[3];
        } else {
            const japanRoomLink = message.content.match(/(https|http):\/\/game\.mahjongsoul\.com(\/index.html|\/|)\?room=([0-9]{5})/);

            if (japanRoomLink)
                roomNumber = japanRoomLink[3];
        }
        
        if (roomNumber.length > 0) {
            message.reply({
                content: `:flag_jp:  <https://game.mahjongsoul.com/?room=${roomNumber}>\n` +
                    `:globe_with_meridians:  <https://mahjongsoul.game.yo-star.com/?room=${roomNumber}>`
            });

            return;
        }

        // Memo
        if (message.content.length <= 32) {
            (async () => {
                await database.connect(async connection => {
                    const [result] = await connection.query('SELECT `contents` FROM `bot_epsilon_memo` WHERE `guild_id` = ? AND `text` = ?', [
                        message.guildId,
                        message.content,
                    ]);

                    if (result && result[0] && result[0].contents) {
                        await message.reply({
                            content: result[0].contents
                        });
                    }
                });
            })();
        }
    }
});
