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

        if (!process.env.DISCORD_USER_ID) {
            this.logger.warn('Discord user ID not configured');
            this.serviceStatus.updateStatus('discord', false, 'User ID not configured');
            return;
        }

        // Validate that DISCORD_USER_ID is a valid snowflake (numeric string)
        if (!/^\d+$/.test(process.env.DISCORD_USER_ID)) {
            this.logger.error('Invalid Discord user ID format');
            this.serviceStatus.updateStatus('discord', false, 'Invalid user ID format');
            return;
        }

        this.userId = process.env.DISCORD_USER_ID;

        this.client.on('ready', () => {
            this.logger.info(`Discord client ready, tracking user ID: ${this.userId}`);
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

    async getStreamingStatus() {
        if (!this.serviceStatus.getStatus('discord').configured) {
            const status = { streaming: false, timestamp: new Date() };
            this.lastStatus = status;
            return status;
        }

        try {
            const guilds = this.client.guilds.cache;
            let isStreaming = false;
            let activityType = null;

            // Check each guild the bot is in for the user's presence
            for (const guild of guilds.values()) {
                try {
                    const member = await guild.members.fetch(this.userId);
                    if (member && member.presence) {
                        isStreaming = member.presence.activities?.some(
                            activity => activity.type === 'STREAMING'
                        ) || false;
                        activityType = member.presence.activities?.[0].type || null;
                        if (isStreaming) break;
                    }
                } catch (memberError) {
                    this.logger.warn(`Could not fetch member in guild ${guild.name}: ${memberError.message}`);
                    continue;
                }
            }
            
            const status = {
                activity: activityType,
                streaming: isStreaming,
                timestamp: new Date()
            };

            this.lastStatus = status;
            this.logger.info(`Discord status updated for user ${this.userId}: ${JSON.stringify(status)}`);
            this.serviceStatus.updateStatus('discord', true);
            return status;
        } catch (error) {
            this.logger.error(`Failed to get Discord status for user ${this.userId}: ${error.message}`);
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