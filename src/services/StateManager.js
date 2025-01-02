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
            // Get status from all services, even if not configured
            const teamsStatus = await this.teams.getStatus();
            const discordStatus = await this.discord.getStreamingStatus();

            const newState = this.determineState(teamsStatus, discordStatus);

            // Only update light if the state has changed and we have a configured LIFX service
            if (this.shouldUpdateLight(newState)) {
                const success = await this.lifx.setState(newState.color);
                if (success) {
                    this.currentState = newState;
                    this.logger.info(`State updated to: ${JSON.stringify(newState)}`);
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
            teams: {
                active: teamsStatus.availability !== 'Offline' && teamsStatus.availability !== 'NotConfigured',
                color: process.env[`TEAMS_${teamsStatus.availability.toUpperCase()}`] || 'off'
            },
            discord: {
                active: discordStatus.streaming,
                color: discordStatus.streaming ? 
                    (process.env.DISCORD_STREAMING || 'blue') : 
                    (process.env.DISCORD_NOT_STREAMING || 'off')
            }
        };

        // Use priority order to determine final state
        for (const service of this.priorities) {
            if (states[service].active) {
                return {
                    service,
                    color: states[service].color,
                    timestamp: new Date()
                };
            }
        }

        // Default state if no service is active
        return { 
            service: 'none', 
            color: 'off', 
            timestamp: new Date() 
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