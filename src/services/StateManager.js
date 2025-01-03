// src/services/StateManager.js
class StateManager {
    constructor(lifxService, teamsService, discordService, logger) {
        this.lifx = lifxService;
        this.teams = teamsService;
        this.discord = discordService;
        this.logger = logger;
        this.currentState = null;
        this.priorities = (process.env.SERVICE_PRIORITY || 'teams,discord').split(',');
    }

    async updateState() {
        try {
            this.logger.debug('Starting state update cycle...');
            
            const teamsStatus = await this.teams.getStatus();
            const discordStatus = await this.discord.getStreamingStatus();

            this.logger.debug('Raw status values: ' + JSON.stringify({
                teams: teamsStatus,
                discord: discordStatus
            }, null, 2));
            
            const newState = this.determineState(teamsStatus, discordStatus);

            if (this.shouldUpdateLight(newState)) {
                this.logger.debug('Light update needed. New state: ' + JSON.stringify(newState, null, 2));
                const success = await this.lifx.setState(newState.color);
                if (success) {
                    this.currentState = newState;
                    this.logger.info(`State updated successfully to: ${JSON.stringify(newState, null, 2)}`);
                } else {
                    this.logger.warn('Failed to update light state');
                }
            } else {
                this.logger.debug('No light update needed. Current state matches new state.');
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

        this.logger.debug('Service states: ' + JSON.stringify(states, null, 2));

        // Check priority order for any active state
        for (const service of this.priorities) {
            if (states[service].isOn) {
                const finalState = {
                    service,
                    color: states[service].color,
                    timestamp: new Date()
                };
                this.logger.debug(`Active state found for ${service}: ` + JSON.stringify(finalState, null, 2));
                return finalState;
            }
        }

        // Default to off if no services are active
        const defaultState = { 
            service: 'none', 
            color: 'off', 
            timestamp: new Date() 
        };
        this.logger.debug('No active states found, using default: ' + JSON.stringify(defaultState, null, 2));
        return defaultState;
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
        if (!this.currentState) {
            this.logger.debug('No current state, update needed');
            return true;
        }
        
        const shouldUpdate = (
            this.currentState.color !== newState.color || 
            this.currentState.service !== newState.service
        );

        this.logger.debug('State comparison: ' + JSON.stringify({
            current: this.currentState,
            new: newState,
            needsUpdate: shouldUpdate
        }, null, 2));

        return shouldUpdate;
    }

    getCurrentState() {
        return this.currentState;
    }
}

module.exports = StateManager;