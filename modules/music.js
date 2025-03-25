const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'music',
    description: '음악 재생',
    commands: [
        {
            name: 'play',
            description: '유튜브에 있는 음악을 재생합니다.',
            optionGenerator: o =>
                o.addStringOption(option =>
                    option.setName('link')
                        .setDescription('유튜브 링크')
                        .setRequired(true)
                        .setMinLength(12)
                        .setMaxLength(96)),
            callback: async function (interaction) {
                const link = interaction.options.getString('link');
                let videoId;

                try {
                    const { hostname, searchParams } = new URL(link);

                    if (hostname !== "www.youtube.com" && hostname !== "youtube.com" && hostname !== "youtu.be")
                        throw new Error();

                    videoId = searchParams.get("v");
                } catch (e) {
                    return await interaction.editReply(`주소 '${link}'를 인식할 수 없습니다.`);
                }

                await interaction.editReply(`${videoId}`);
            },
        },
    ],
};
