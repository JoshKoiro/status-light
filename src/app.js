require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./utils/logger');

const LIFXService = require('./services/LIFXService');
const TeamsService = require('./services/TeamsService');
const DiscordService = require('./services/DiscordService');
const StateManager = require('./services/StateManager');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
const lifxService = new LIFXService(logger);
const teamsService = new TeamsService(logger);
const discordService = new DiscordService(logger);
const stateManager = new StateManager(lifxService, teamsService, discordService, logger);

// Store services in app for route access
app.set('lifxService', lifxService);
app.set('teamsService', teamsService);
app.set('discordService', discordService);
app.set('stateManager', stateManager);

// Routes
app.use('/api/config', require('./routes/config'));
app.use('/api/health', require('./routes/health'));
app.use('/api/logs', require('./routes/logs'));

// Start polling
const pollInterval = parseInt(process.env.POLLING_INTERVAL) || 5000;
setInterval(() => {
    stateManager.updateState();
}, pollInterval);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    logger.info(`Server started on port ${port}`);
});