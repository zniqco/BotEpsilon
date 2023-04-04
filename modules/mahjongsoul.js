const { SlashCommandBuilder } = require('discord.js');

function generateMessage(n) {
    return `:flag_kr:  <https://mahjongsoul.game.yo-star.com/?room=${n}>\n:flag_jp:  <https://game.mahjongsoul.com/?room=${n}>`
}

module.exports = {
    commandData: new SlashCommandBuilder()
        .setName('mahjongsoul')
        .setDescription('작혼')
        .addSubcommand(subcommand =>
            subcommand.setName('room')
                .setDescription('친선전 방 링크를 생성합니다.')
                .addStringOption(option =>
                    option.setName('number')
                        .setDescription('방 번호')
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(5))),
    commandExecutor: async interaction => {
        switch (interaction.options.getSubcommand()) {
            case 'room':
                const roomNumber = interaction.options.getString('number');

                if (/^\d+$/.test(roomNumber)) {
                    await interaction.reply(generateMessage(roomNumber));

                    return;
                }

                await interaction.reply({ content: '올바른 방 번호가 아닙니다.', ephemeral: true });
                
                break;
        }
    },
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
