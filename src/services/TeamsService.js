// src/services/TeamsService.js
const https = require('https');

class TeamsService {
    constructor(logger, serviceStatus) {
        this.logger = logger;
        this.serviceStatus = serviceStatus;
        this.lastStatus = null;
        this.init();
    }

    init() {
        if (!process.env.MS_GRAPH_API_KEY) {
            this.logger.warn('Microsoft Graph API key not configured');
            this.serviceStatus.updateStatus('teams', false, 'API key not configured');
            return;
        }
        this.serviceStatus.updateStatus('teams', true);
    }

    async getStatus() {
        if (!this.serviceStatus.getStatus('teams').configured) {
            const status = { availability: 'Offline', activity: 'NotConfigured', timestamp: new Date() };
            this.lastStatus = status;
            return status;
        }

        return new Promise((resolve, reject) => {
            const options = {
                method: 'GET',
                hostname: 'graph.microsoft.com',
                path: '/beta/me/presence',
                headers: {
                    'Authorization': `Bearer ${process.env.MS_GRAPH_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                const chunks = [];
                
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                
                res.on('end', () => {
                    try {
                        const body = Buffer.concat(chunks);
                        const results = JSON.parse(body);

                        if (results.error) {
                            this.logger.error(`Teams API error: ${results.error.message}`);
                            this.serviceStatus.updateStatus('teams', false, results.error.message);
                            const errorStatus = { availability: 'Offline', activity: 'Error', timestamp: new Date() };
                            this.lastStatus = errorStatus;
                            resolve(errorStatus);
                            return;
                        }

                        const status = {
                            availability: results.availability,
                            activity: results.activity,
                            timestamp: new Date()
                        };

                        this.lastStatus = status;
                        this.serviceStatus.updateStatus('teams', true);
                        resolve(status);
                    } catch (error) {
                        this.logger.error(`Failed to parse Teams response: ${error.message}`);
                        this.serviceStatus.updateStatus('teams', false, error.message);
                        const errorStatus = { availability: 'Offline', activity: 'Error', timestamp: new Date() };
                        this.lastStatus = errorStatus;
                        resolve(errorStatus);
                    }
                });
            });

            req.on('error', (error) => {
                this.logger.error(`Teams request failed: ${error.message}`);
                this.serviceStatus.updateStatus('teams', false, error.message);
                const errorStatus = { availability: 'Offline', activity: 'Error', timestamp: new Date() };
                this.lastStatus = errorStatus;
                resolve(errorStatus);
            });

            req.end();
        });
    }

    getLastStatus() {
        return this.lastStatus;
    }
}

module.exports = TeamsService;