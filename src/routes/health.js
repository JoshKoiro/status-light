const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const health = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date(),
        services: {
            lifx: req.app.get('lifxService').getLastState(),
            teams: req.app.get('teamsService').getLastStatus(),
            discord: req.app.get('discordService').getLastStatus()
        }
    };

    res.json(health);
});

module.exports = router;  // Make sure this line is present