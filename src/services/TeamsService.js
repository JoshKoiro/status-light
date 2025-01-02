const https = require('https');

class TeamsService {
    constructor(logger) {
        this.logger = logger;
        this.lastStatus = null;
    }

    async getStatus() {
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
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        const body = Buffer.concat(chunks);
                        const results = JSON.parse(body);
                        
                        if (results.error) {
                            this.logger.error(`Teams API error: ${results.error.message}`);
                            reject(results.error);
                            return;
                        }

                        const status = {
                            availability: results.availability,
                            activity: results.activity,
                            timestamp: new Date()
                        };

                        this.lastStatus = status;
                        this.logger.info(`Teams status updated: ${JSON.stringify(status)}`);
                        resolve(status);
                    } catch (error) {
                        this.logger.error(`Failed to parse Teams response: ${error.message}`);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                this.logger.error(`Teams request failed: ${error.message}`);
                reject(error);
            });

            req.end();
        });
    }

    getLastStatus() {
        return this.lastStatus;
    }
}

module.exports = TeamsService;