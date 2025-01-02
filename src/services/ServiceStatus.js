// src/services/ServiceStatus.js
// New file to handle service status tracking
class ServiceStatus {
    constructor() {
        this.statuses = {
            lifx: { configured: false, error: null },
            teams: { configured: false, error: null },
            discord: { configured: false, error: null }
        };
    }

    updateStatus(service, isConfigured, error = null) {
        this.statuses[service] = {
            configured: isConfigured,
            error: error
        };
    }

    getStatus(service) {
        return this.statuses[service];
    }

    getAllStatuses() {
        return this.statuses;
    }
}

module.exports = ServiceStatus;
