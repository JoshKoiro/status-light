const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.post('/keys', async (req, res) => {
    const { service, apiKey } = req.body;
    const validServices = ['lifx', 'teams', 'discord'];
    
    if (!validServices.includes(service)) {
        return res.status(400).json({ error: 'Invalid service' });
    }

    try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = await fs.readFile(envPath, 'utf8');
        
        const keyMap = {
            lifx: 'LIFX_API_KEY',
            teams: 'MS_GRAPH_API_KEY',
            discord: 'DISCORD_API_KEY'
        };

        const envVar = keyMap[service];
        const regex = new RegExp(`${envVar}=.*`);
        
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${envVar}=${apiKey}`);
        } else {
            envContent += `\n${envVar}=${apiKey}`;
        }

        await fs.writeFile(envPath, envContent);
        process.env[envVar] = apiKey;
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;  // Make sure this line is present