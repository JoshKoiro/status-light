const { useState, useEffect } = React;

const ConfigUI = () => {
  const [status, setStatus] = useState({
    health: 'loading',
    currentState: null,
    lastUpdate: null
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
        const response = await fetch('/api/health');
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
        setLogs(data);
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

  const Alert = ({ type, title, children }) => (
    <div className={`p-4 rounded-md mb-4 ${type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p>{children}</p>
    </div>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Status Light Configuration</h1>
      
      {/* Status Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${status.health === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>Status: {status.health}</span>
        </div>
        {status.currentState && (
          <div className="text-sm text-gray-600">
            Current State: {status.currentState}
            <br />
            Last Update: {new Date(status.lastUpdate).toLocaleString()}
          </div>
        )}
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
        <Alert 
          type={message.type} 
          title={message.type === 'success' ? 'Success' : 'Error'}
        >
          {message.text}
        </Alert>
      )}

      {/* Logs Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>
        <div className="border rounded">
          {logs.map((log, index) => (
            <div
              key={index}
              className="p-2 text-sm border-b last:border-b-0 hover:bg-gray-50"
            >
              <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
              <span className="mx-2">|</span>
              <span className="font-medium">{log.service}</span>
              <span className="mx-2">|</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Render the React component
ReactDOM.render(<ConfigUI />, document.getElementById('root'));