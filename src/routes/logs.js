const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.get('/', async (req, res) => {
    const { limit = 100, from, to } = req.query;
    
    try {
        const logPath = path.join('logs', 'combined.log');
        const content = await fs.readFile(logPath, 'utf8');
        const logs = content
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line))
            .filter(log => {
                if (from && new Date(log.timestamp) < new Date(from)) return false;
                if (to && new Date(log.timestamp) > new Date(to)) return false;
                return true;
            })
            .slice(-limit);
            
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;