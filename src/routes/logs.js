// src/routes/logs.js
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.get('/', async (req, res) => {
    const { limit = 100, from, to } = req.query;
    
    try {
        const logPath = path.join('logs', 'detailed.log');
        const content = await fs.readFile(logPath, 'utf8');
        
        // Split by newlines and parse each line as JSON
        const logs = content
            .split('\n')
            .filter(Boolean) // Remove empty lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(log => log !== null) // Remove failed parses
            .filter(log => {
                if (from && new Date(log.timestamp) < new Date(from)) return false;
                if (to && new Date(log.timestamp) > new Date(to)) return false;
                return true;
            })
            .slice(-limit);
            
        res.json({ logs });
    } catch (error) {
        // If file doesn't exist or other error
        res.status(500).json({ 
            error: 'Failed to retrieve logs',
            details: error.message,
            path: logPath
        });
    }
});

module.exports = router;