// src/routes/services.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const stateManager = req.app.get('stateManager');
    const teamsService = req.app.get('teamsService');
    const discordService = req.app.get('discordService');
    const lifxService = req.app.get('lifxService');
    const serviceStatus = req.app.get('serviceStatus');

    const status = {
        timestamp: new Date(),
        currentState: stateManager.getCurrentState(),
        services: {
            lifx: {
                configured: serviceStatus.getStatus('lifx').configured,
                lastState: lifxService.getLastState(),
                error: serviceStatus.getStatus('lifx').error
            },
            teams: {
                configured: serviceStatus.getStatus('teams').configured,
                lastStatus: teamsService.getLastStatus(),
                error: serviceStatus.getStatus('teams').error
            },
            discord: {
                configured: serviceStatus.getStatus('discord').configured,
                lastStatus: discordService.getLastStatus(),
                error: serviceStatus.getStatus('discord').error
            }
        },
        config: {
            servicePriority: process.env.SERVICE_PRIORITY.split(','),
            pollingInterval: parseInt(process.env.POLLING_INTERVAL) || 5000
        }
    };

    res.json(status);
});

module.exports = router;