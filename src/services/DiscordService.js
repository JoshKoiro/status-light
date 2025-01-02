const { Client, GatewayIntentBits } = require('discord.js');

class DiscordService {
    constructor(logger) {
        this.logger = logger;
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences]
        });
        this.lastStatus = null;
        this.init();
    }

    init() {
        this.client.on('ready', () => {
            this.logger.info('Discord client ready');
        });

        this.client.login(process.env.DISCORD_API_KEY);
    }

    async getStreamingStatus(userId) {
        try {
            const user = await this.client.users.fetch(userId);
            const presence = user.presence;
            
            const status = {
                streaming: presence?.activities?.some(activity => activity.type === 'STREAMING'),
                timestamp: new Date()
            };

            this.lastStatus = status;
            this.logger.info(`Discord status updated: ${JSON.stringify(status)}`);
            return status;
        } catch (error) {
            this.logger.error(`Failed to get Discord status: ${error.message}`);
            throw error;
        }
    }

    getLastStatus() {
        return this.lastStatus;
    }
}

module.exports = DiscordService;
