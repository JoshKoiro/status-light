// src/app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./utils/logger');

const ServiceStatus = require('./services/ServiceStatus');
const LIFXService = require('./services/LIFXService');
const TeamsService = require('./services/TeamsService');
const DiscordService = require('./services/DiscordService');
const StateManager = require('./services/StateManager');

// Import routes
const configRouter = require('./routes/config');
const healthRouter = require('./routes/health');
const logsRouter = require('./routes/logs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize ServiceStatus and services
const serviceStatus = new ServiceStatus();
const lifxService = new LIFXService(logger, serviceStatus);
const teamsService = new TeamsService(logger, serviceStatus);
const discordService = new DiscordService(logger, serviceStatus);
const stateManager = new StateManager(lifxService, teamsService, discordService, logger);

// Store services in app for route access
app.set('serviceStatus', serviceStatus);
app.set('lifxService', lifxService);
app.set('teamsService', teamsService);
app.set('discordService', discordService);
app.set('stateManager', stateManager);

// Routes
app.use('/api/config', configRouter);
app.use('/api/health', healthRouter);
app.use('/api/logs', logsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    logger.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

// Start polling
const pollInterval = parseInt(process.env.POLLING_INTERVAL) || 5000;
setInterval(() => {
    stateManager.updateState().catch(error => {
        logger.error(`Error in update cycle: ${error.message}`);
    });
}, pollInterval);

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Performing graceful shutdown...');
    discordService.shutdown();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Performing graceful shutdown...');
    discordService.shutdown();
    process.exit(0);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    logger.info(`Server started on port ${port}`);
});