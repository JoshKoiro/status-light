class StateManager {
    constructor(lifxService, teamsService, discordService, logger) {
        this.lifx = lifxService;
        this.teams = teamsService;
        this.discord = discordService;
        this.logger = logger;
        this.currentState = null;
        this.priorities = process.env.SERVICE_PRIORITY.split(',');
    }

    async updateState() {
        try {
            const [teamsStatus, discordStatus] = await Promise.all([
                this.teams.getStatus(),
                this.discord.getStreamingStatus()
            ]);

            const newState = this.determineState(teamsStatus, discordStatus);
            if (this.shouldUpdateLight(newState)) {
                await this.lifx.setState(newState.color);
                this.currentState = newState;
                this.logger.info(`State updated to: ${JSON.stringify(newState)}`);
            }
        } catch (error) {
            this.logger.error(`Failed to update state: ${error.message}`);
        }
    }

    determineState(teamsStatus, discordStatus) {
        const states = {
            teams: {
                active: teamsStatus.availability !== 'Offline',
                color: process.env[`TEAMS_${teamsStatus.availability.toUpperCase()}`]
            },
            discord: {
                active: discordStatus.streaming,
                color: discordStatus.streaming ? process.env.DISCORD_STREAMING : process.env.DISCORD_NOT_STREAMING
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

        return { service: 'none', color: 'off', timestamp: new Date() };
    }

    shouldUpdateLight(newState) {
        if (!this.currentState) return true;
        return this.currentState.color !== newState.color;
    }

    getCurrentState() {
        return this.currentState;
    }
}

module.exports = StateManager;