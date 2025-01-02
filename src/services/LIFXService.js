const lifxSDK = require('api')('@lifx/v1#3lxxs239lhh5auae');

class LIFXService {
    constructor(logger, serviceStatus) {
        this.logger = logger;
        this.serviceStatus = serviceStatus;
        this.lastState = null;
        this.lifxSDK = lifxSDK;
        this.init();
    }

    async init() {
        if (!process.env.LIFX_API_KEY) {
            this.logger.warn('LIFX API key not configured');
            this.serviceStatus.updateStatus('lifx', false, 'API key not configured');
            return;
        }

        if (!process.env.LIFX_LIGHT_ID) {
            this.logger.warn('LIFX light ID not configured');
            this.serviceStatus.updateStatus('lifx', false, 'Light ID not configured');
            return;
        }

        this.lifxSDK.auth(process.env.LIFX_API_KEY);
        
        try {
            await this.verifyLight();
            this.serviceStatus.updateStatus('lifx', true);
        } catch (error) {
            this.logger.error(`Failed to verify LIFX light ID: ${error.message}`);
            this.serviceStatus.updateStatus('lifx', false, 'Invalid light ID or API key');
        }
    }

    async verifyLight() {
        try {
            const response = await fetch('https://api.lifx.com/v1/lights/all', {
                headers: {
                    'Authorization': `Bearer ${process.env.LIFX_API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const lights = await response.json();
            const targetLight = lights.find(light => light.id === process.env.LIFX_LIGHT_ID);
            
            if (!targetLight) {
                throw new Error(`Light ID ${process.env.LIFX_LIGHT_ID} not found`);
            }

            this.logger.info(`Found LIFX light: ${targetLight.label} (ID: ${targetLight.id})`);
            return lights;
        } catch (error) {
            this.logger.error(`Failed to list LIFX lights: ${error.message}`);
            throw error;
        }
    }

    async setState(color, brightness = process.env.LIGHT_BRIGHTNESS, duration = process.env.COLOR_CHANGE_SPEED) {
        if (!this.serviceStatus.getStatus('lifx').configured) {
            this.logger.warn('Attempted to set LIFX state but service is not configured');
            return false;
        }

        const reqObj = {
            power: color === 'off' ? 'off' : 'on',
            color: color === 'off' ? 'white' : color,
            brightness: parseFloat(brightness),
            duration: parseInt(duration),
            fast: false
        };

        try {
            await this.lifxSDK.setState(reqObj, {
                selector: `id:${process.env.LIFX_LIGHT_ID}`,
                accept: 'text/plain'
            });
            this.lastState = { ...reqObj, timestamp: new Date() };
            this.logger.info(`Light state updated: ${JSON.stringify(reqObj)}`);
            this.serviceStatus.updateStatus('lifx', true);
            return true;
        } catch (error) {
            this.logger.error(`Failed to update light state: ${error.message}`);
            this.serviceStatus.updateStatus('lifx', false, error.message);
            return false;
        }
    }

    getLastState() {
        return this.lastState;
    }
}

module.exports = LIFXService;