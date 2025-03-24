module.exports = {
    name: 'mahjongsoul',
    description: '작혼',
    commands: [
        {
            name: 'room',
            description: '친선전 방 링크를 생성합니다.',
            optionGenerator: o =>
                o.addStringOption(option =>
                    option.setName('number')
                        .setDescription('방 번호')
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(5)),
            callback: async function (interaction) {
                const roomNumber = interaction.options.getString('number');

                if (/^\d+$/.test(roomNumber))
                    return await interaction.editReply(generateMessage(roomNumber));

                await interaction.editReply({ content: '올바른 방 번호가 아닙니다.' });
            },
        },
    ],
    messageReceiver: message => {
        const roomLinkMatch = message.content.match(/(https|http):\/\/(mahjongsoul\.game\.yo-star\.com(\/kr|)|game\.mahjongsoul\.com)\/(index\.html|)\?room=([0-9]{5})/);
    
        if (roomLinkMatch) {
            const roomNumber = roomLinkMatch[5];

            if (roomNumber.length > 0) {
                message.reply({
                    content: generateMessage(roomNumber)
                });

                return;
            }
        }
    }
};

function generateMessage(n) {
    return `:flag_kr:  <https://mahjongsoul.game.yo-star.com/?room=${n}>\n:flag_jp:  <https://game.mahjongsoul.com/?room=${n}>`
}
