const lifxSDK = require('api')('@lifx/v1#3lxxs239lhh5auae');

class LIFXService {
    constructor(logger) {
        this.logger = logger;
        this.lastState = null;
        this.init();
    }

    init() {
        lifxSDK.auth(process.env.LIFX_API_KEY);
    }

    async setState(color, brightness = process.env.LIGHT_BRIGHTNESS, duration = process.env.COLOR_CHANGE_SPEED) {
        const reqObj = {
            power: color === 'off' ? 'off' : 'on',
            color: color === 'off' ? 'white' : color,
            brightness: parseFloat(brightness),
            duration: parseInt(duration),
            fast: false
        };

        try {
            await lifxSDK.setState(reqObj, {
                selector: `label:${process.env.LIGHT_NAME}`,
                accept: 'text/plain'
            });
            this.lastState = { ...reqObj, timestamp: new Date() };
            this.logger.info(`Light state updated: ${JSON.stringify(reqObj)}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to update light state: ${error.message}`);
            return false;
        }
    }

    getLastState() {
        return this.lastState;
    }
}

module.exports = LIFXService;