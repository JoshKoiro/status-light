// src/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const serviceStatus = req.app.get('serviceStatus');
    const stateManager = req.app.get('stateManager');
    
    const health = {
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date(),
        currentState: stateManager.getCurrentState(),
        services: {
            lifx: {
                ...req.app.get('lifxService').getLastState(),
                ...serviceStatus.getStatus('lifx')
            },
            teams: {
                ...req.app.get('teamsService').getLastStatus(),
                ...serviceStatus.getStatus('teams')
            },
            discord: {
                ...req.app.get('discordService').getLastStatus(),
                ...serviceStatus.getStatus('discord')
            }
        }
    };

    // Calculate overall health based on configured services only
    const configuredServices = Object.entries(health.services)
        .filter(([_, service]) => service.configured);
    
    // If no services are configured, system is unhealthy
    if (configuredServices.length === 0) {
        health.status = 'unhealthy';
    } else {
        // Check if any configured service has errors
        const hasErrors = configuredServices.some(([_, service]) => service.error !== null);
        health.status = hasErrors ? 'degraded' : 'healthy';
    }

    res.json(health);
});

module.exports = router;