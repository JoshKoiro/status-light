// src/services/DiscordService.js
const { Client, GatewayIntentBits } = require('discord.js');

class DiscordService {
    constructor(logger, serviceStatus) {
        this.logger = logger;
        this.serviceStatus = serviceStatus;
        this.lastStatus = null;
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences]
        });
        this.init();
    }

    init() {
        if (!process.env.DISCORD_API_KEY) {
            this.logger.warn('Discord API key not configured');
            this.serviceStatus.updateStatus('discord', false, 'API key not configured');
            return;
        }

        this.client.on('ready', () => {
            this.logger.info('Discord client ready');
            this.serviceStatus.updateStatus('discord', true);
        });

        this.client.on('error', (error) => {
            this.logger.error(`Discord client error: ${error.message}`);
            this.serviceStatus.updateStatus('discord', false, error.message);
        });

        this.client.login(process.env.DISCORD_API_KEY).catch(error => {
            this.logger.error(`Discord login failed: ${error.message}`);
            this.serviceStatus.updateStatus('discord', false, error.message);
        });
    }

    async getStreamingStatus(userId) {
        if (!this.serviceStatus.getStatus('discord').configured) {
            const status = { streaming: false, timestamp: new Date() };
            this.lastStatus = status;
            return status;
        }

        try {
            const user = await this.client.users.fetch(userId);
            const presence = user.presence;
            
            const status = {
                streaming: presence?.activities?.some(activity => activity.type === 'STREAMING'),
                timestamp: new Date()
            };

            this.lastStatus = status;
            this.logger.info(`Discord status updated: ${JSON.stringify(status)}`);
            this.serviceStatus.updateStatus('discord', true);
            return status;
        } catch (error) {
            this.logger.error(`Failed to get Discord status: ${error.message}`);
            this.serviceStatus.updateStatus('discord', false, error.message);
            const errorStatus = { streaming: false, timestamp: new Date() };
            this.lastStatus = errorStatus;
            return errorStatus;
        }
    }

    getLastStatus() {
        return this.lastStatus;
    }

    shutdown() {
        if (this.client) {
            this.client.destroy();
        }
    }
}

module.exports = DiscordService;