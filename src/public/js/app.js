const { useState, useEffect } = React;

const ConfigUI = () => {
  const [status, setStatus] = useState({
    health: 'loading',
    currentState: null,
    lastUpdate: null,
    services: {}
  });
  
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState(null);

  const updateApiKey = async (service, key) => {
    try {
      const response = await fetch('/api/config/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, apiKey: key })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: `${service} API key updated successfully` });
      } else {
        setMessage({ type: 'error', text: 'Failed to update API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/logs?limit=10');
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };

    fetchStatus();
    fetchLogs();
    
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Status Light Configuration</h1>
      
      {/* Current State */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current State</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          {status.currentState ? (
            <div>
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">Service:</div>
                <div>{status.currentState.service}</div>
                <div className="font-medium">Color:</div>
                <div>{status.currentState.color}</div>
                <div className="font-medium">Last Updated:</div>
                <div>{formatTimestamp(status.currentState.timestamp)}</div>
              </div>
            </div>
          ) : (
            <div>No active state</div>
          )}
        </div>
      </div>

      {/* Service Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        {Object.entries(status.services || {}).map(([serviceName, serviceData]) => (
          <div key={serviceName} className="mb-4 bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-lg capitalize">{serviceName}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                serviceData.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {serviceData.configured ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {serviceData.error && (
              <div className="text-red-600 text-sm mt-1">{serviceData.error}</div>
            )}
            {serviceData.lastState && (
              <div className="text-sm text-gray-600 mt-1">
                Last Updated: {formatTimestamp(serviceData.lastState.timestamp)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* API Key Configuration */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Keys</h2>
        {['lifx', 'teams', 'discord'].map(service => (
          <div key={service} className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {service.toUpperCase()} API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 p-2 border rounded"
                placeholder={`Enter ${service} API key`}
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={(e) => {
                  const input = e.target.parentElement.querySelector('input');
                  updateApiKey(service, input.value);
                }}
              >
                Update
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-md mb-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <h3 className="font-semibold">{message.type === 'success' ? 'Success' : 'Error'}</h3>
          <p>{message.text}</p>
        </div>
      )}

      {/* Logs */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>
        <div className="border rounded">
          {logs.length > 0 ? logs.map((log, index) => (
            <div
              key={index}
              className="p-2 text-sm border-b last:border-b-0 hover:bg-gray-50"
            >
              <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
              <span className="mx-2">|</span>
              <span className={`font-medium ${
                log.level === 'error' ? 'text-red-600' : 
                log.level === 'warn' ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {log.level}
              </span>
              <span className="mx-2">|</span>
              <span>{log.message}</span>
            </div>
          )) : (
            <div className="p-4 text-center text-gray-500">No logs available</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Render the React component
ReactDOM.render(<ConfigUI />, document.getElementById('root'));