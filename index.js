const { config } = require('./config.json');
const discord = require('./discord.js');

require('./message.js');
require('./command.js');

// TODO: ./discord.js 안에서 처리하고 싶은데 js를 잘 모르겠음
discord.client.on('shardError', error => {
    console.error('A shardError is thrown and the process is killed. details:');
	console.error(error);
    process.exit(1);
});

try {
    discord.client.login(config.token);
} catch (e) {
	console.error(e);
    process.exit(1);
}
