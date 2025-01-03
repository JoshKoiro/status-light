// src/services/DiscordService.js
const { Client, GatewayIntentBits, Events } = require('discord.js');

class DiscordService {
    constructor(logger, serviceStatus) {
        this.logger = logger;
        this.serviceStatus = serviceStatus;
        this.lastStatus = null;
        this.debugMode = true;
        this.isConfigured = false;
        
        this.logger.debug('Creating Discord service');
        
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMembers
            ]
        });
        
        this.init();
    }

    init() {
        this.logger.debug('Initializing Discord service with configuration: ' + JSON.stringify({
            hasApiKey: !!process.env.DISCORD_API_KEY,
            hasUserId: !!process.env.DISCORD_USER_ID,
            userIdValue: process.env.DISCORD_USER_ID
        }, null, 2));

        if (!process.env.DISCORD_API_KEY) {
            this.logger.warn('Discord API key not configured in environment');
            this.serviceStatus.updateStatus('discord', false, 'API key not configured');
            return;
        }

        if (!process.env.DISCORD_USER_ID) {
            this.logger.warn('Discord user ID not configured in environment');
            this.serviceStatus.updateStatus('discord', false, 'User ID not configured');
            return;
        }

        if (!/^\d+$/.test(process.env.DISCORD_USER_ID)) {
            this.logger.error('Invalid Discord user ID format - must be numeric');
            this.logger.debug('Invalid user ID value: ' + process.env.DISCORD_USER_ID);
            this.serviceStatus.updateStatus('discord', false, 'Invalid user ID format');
            return;
        }

        this.userId = process.env.DISCORD_USER_ID;
        this.logger.debug('Discord service initialization passed validation checks');

        this.client.on(Events.READY, () => {
            this.logger.info(`Discord client ready, tracking user ID: ${this.userId}`);
            const guilds = Array.from(this.client.guilds.cache.values());
            this.logger.debug('Connected guilds: ' + JSON.stringify(guilds.map(g => ({
                name: g.name,
                id: g.id,
                memberCount: g.memberCount
            })), null, 2));
            
            this.isConfigured = true;
            this.serviceStatus.updateStatus('discord', true);
            this.logger.debug('Discord service marked as configured');
        });

        this.client.on(Events.VOICE_STATE_UPDATE, (oldState, newState) => {
            if (newState.member.user.id === this.userId) {
                this.logger.debug('Voice state change detected for tracked user: ' + JSON.stringify({
                    old: {
                        inChannel: !!oldState.channelId,
                        channelName: oldState.channel?.name || 'None',
                        streaming: !!oldState.streaming,
                        selfVideo: !!oldState.selfVideo,
                        selfMute: !!oldState.selfMute
                    },
                    new: {
                        inChannel: !!newState.channelId,
                        channelName: newState.channel?.name || 'None',
                        streaming: !!newState.streaming,
                        selfVideo: !!newState.selfVideo,
                        selfMute: !!newState.selfMute
                    }
                }, null, 2));
            }
        });

        this.client.on(Events.PRESENCE_UPDATE, (oldPresence, newPresence) => {
            if (newPresence?.userId === this.userId) {
                this.logger.debug('Presence update detected for tracked user: ' + JSON.stringify({
                    status: newPresence.status,
                    activities: newPresence.activities.map(a => ({
                        type: a.type,
                        name: a.name,
                        details: a.details || 'No details',
                        state: a.state || 'No state',
                        streaming: !!a.streaming
                    }))
                }, null, 2));
            }
        });

        this.client.on('error', (error) => {
            this.logger.error(`Discord client error: ${error.message}`);
            this.logger.debug('Error details: ' + JSON.stringify(error, null, 2));
            this.serviceStatus.updateStatus('discord', false, error.message);
        });

        setInterval(() => {
            const status = {
                ready: this.client.isReady(),
                configured: this.isConfigured,
                ws: {
                    status: this.client.ws.status,
                    ping: this.client.ws.ping
                },
                guilds: Array.from(this.client.guilds.cache.values()).map(g => ({
                    name: g.name,
                    id: g.id,
                    memberCount: g.memberCount
                }))
            };
            
            this.logger.debug('Discord Connection Status: ' + JSON.stringify(status, null, 2));
            
            if (status.ready && !this.isConfigured) {
                this.logger.debug('Client ready but not marked as configured, updating status...');
                this.isConfigured = true;
                this.serviceStatus.updateStatus('discord', true);
            }
        }, 10000);

        this.logger.debug('Attempting to log in to Discord...');
        this.client.login(process.env.DISCORD_API_KEY)
            .then(() => {
                this.logger.debug('Discord login successful');
            })
            .catch(error => {
                this.logger.error(`Discord login failed: ${error.message}`);
                this.logger.debug('Login error details: ' + JSON.stringify(error, null, 2));
                this.serviceStatus.updateStatus('discord', false, error.message);
            });
    }

    async getStreamingStatus() {
        if (!this.serviceStatus.getStatus('discord').configured || !this.isConfigured) {
            this.logger.debug('Discord service not configured. Status: ' + JSON.stringify({
                serviceStatus: this.serviceStatus.getStatus('discord'),
                internalConfigured: this.isConfigured,
                clientReady: this.client?.isReady()
            }, null, 2));
            const status = { 
                streaming: false, 
                activityType: null,
                voice: { inChannel: false },
                timestamp: new Date() 
            };
            this.lastStatus = status;
            return status;
        }

        try {
            const guilds = this.client.guilds.cache;
            this.logger.debug(`Checking ${guilds.size} guilds for user ${this.userId}`);

            let isActive = false;
            let activityType = null;
            let voiceState = { inChannel: false };

            for (const guild of guilds.values()) {
                try {
                    const member = await guild.members.fetch(this.userId);
                    
                    if (member) {
                        // Check voice state first
                        if (member.voice?.channelId) {
                            voiceState = {
                                inChannel: true,
                                channelId: member.voice.channelId,
                                channelName: member.voice.channel?.name,
                                streaming: !!member.voice.streaming,
                                selfVideo: !!member.voice.selfVideo
                            };

                            // Only set activity type if in a voice channel
                            if (member.voice.streaming) {
                                isActive = true;
                                activityType = 'screen_share';
                            }
                            if (member.voice.selfVideo) {
                                isActive = true;
                                activityType = 'camera';
                            }
                        }

                        // Only check for streaming activity if in a voice channel
                        if (voiceState.inChannel && member.presence) {
                            const isStreaming = member.presence.activities?.some(
                                activity => activity.type === 'STREAMING' ||
                                          (activity.type === 'CUSTOM' && activity.streaming)
                            );
                            
                            if (isStreaming) {
                                isActive = true;
                                activityType = 'streaming';
                            }
                        }
                    }
                } catch (memberError) {
                    this.logger.warn(`Could not fetch member in guild ${guild.name}: ${memberError.message}`);
                    continue;
                }
            }
            
            const status = {
                streaming: isActive,
                activityType: activityType,
                voice: voiceState,
                timestamp: new Date()
            };

            this.logger.debug('Final status values: ' + JSON.stringify({
                isActive,
                activityType,
                voiceState,
                timestamp: new Date().toISOString()
            }, null, 2));

            this.lastStatus = status;
            this.serviceStatus.updateStatus('discord', true);
            return status;

        } catch (error) {
            this.logger.error(`Failed to get Discord status: ${error.message}`);
            this.logger.debug('Error stack: ' + error.stack);
            this.serviceStatus.updateStatus('discord', false, error.message);
            return { 
                streaming: false, 
                activityType: null, 
                voice: { inChannel: false },
                timestamp: new Date() 
            };
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