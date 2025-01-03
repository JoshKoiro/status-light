// src/services/StateManager.js
class StateManager {
    constructor(lifxService, teamsService, discordService, logger) {
        this.lifx = lifxService;
        this.teams = teamsService;
        this.discord = discordService;
        this.logger = logger;
        this.currentState = null;
        this.priorities = (process.env.SERVICE_PRIORITY || 'teams,discord').split(',');
        this.logger.info('StateManager initialized with priorities:', this.priorities);
    }

    async updateState() {
        try {
            const teamsStatus = await this.teams.getStatus();
            const discordStatus = await this.discord.getStreamingStatus();
            
            // Log detailed state to file only
            this.logger.debug('Service status update', {
                teams: teamsStatus,
                discord: discordStatus
            });
            
            const newState = this.determineState(teamsStatus, discordStatus);

            if (this.shouldUpdateLight(newState)) {
                const success = await this.lifx.setState(newState.color);
                if (success) {
                    this.currentState = newState;
                    // Log state changes to console
                    this.logger.info(`Light state updated to ${newState.color} (${newState.service})`);
                } else {
                    this.logger.warn('Failed to update light state');
                }
            }

            return this.currentState;

        } catch (error) {
            this.logger.error(`Failed to update state: ${error.message}`);
            throw error;
        }
    }

    determineState(teamsStatus, discordStatus) {
        const states = {
            teams: this.getTeamsState(teamsStatus),
            discord: this.getDiscordState(discordStatus)
        };

        // Log detailed state to file only
        this.logger.debug('Service states', states);

        // Check priority order for any active state
        for (const service of this.priorities) {
            if (states[service].isOn) {
                return {
                    service,
                    color: states[service].color,
                    timestamp: new Date()
                };
            }
        }

        return { 
            service: 'none', 
            color: 'off', 
            timestamp: new Date() 
        };
    }

    getTeamsState(teamsStatus) {
        const color = process.env[`TEAMS_${teamsStatus.availability.toUpperCase()}`];
        return {
            isOn: !!color && color !== 'off',
            color: color || 'off',
            status: teamsStatus.availability
        };
    }

    getDiscordState(discordStatus) {
        let color = 'off';
        let isOn = false;

        if (discordStatus.activityType === 'camera' && process.env.DISCORD_CAMERA_ON) {
            color = process.env.DISCORD_CAMERA_ON;
            isOn = true;
        } else if (['screen_share', 'streaming'].includes(discordStatus.activityType) && process.env.DISCORD_STREAMING) {
            color = process.env.DISCORD_STREAMING;
            isOn = true;
        }

        return {
            isOn,
            color,
            activityType: discordStatus.activityType
        };
    }

    shouldUpdateLight(newState) {
        if (!this.currentState) return true;
        
        return (
            this.currentState.color !== newState.color || 
            this.currentState.service !== newState.service
        );
    }

    getCurrentState() {
        return this.currentState;
    }
}

module.exports = StateManager;