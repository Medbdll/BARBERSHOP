import { useState, useEffect } from 'react';
import { checkBackendStatus, getServices, getBarbers } from './api/barberApi';
import './App.css';

function App() {
  const [status, setStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('services');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Execute Axios calls concurrently
      const [statusRes, servicesRes, barbersRes] = await Promise.all([
        checkBackendStatus(),
        getServices(),
        getBarbers(),
      ]);

      setStatus(statusRes);
      setServices(servicesRes);
      setBarbers(barbersRes);
    } catch (err) {
      console.error('Failed to load data from backend:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Could not connect to the backend server.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
          💈 Berber Shop
        </h1>
        <p style={{ color: '#888', margin: 0 }}>
          Frontend (React + Vite) connected to Backend (Laravel API) with Axios
        </p>

        {/* Live Status Badge */}
        <div style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: status ? '#10b98118' : '#ef444418', border: `1px solid ${status ? '#10b981' : '#ef4444'}` }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: status ? '#10b981' : '#ef4444' }}></span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: status ? '#059669' : '#dc2626' }}>
            {status ? `${status.message} (${status.app})` : (loading ? 'Checking backend...' : 'Backend offline')}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              marginLeft: '12px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: '#fff',
            }}
          >
            {loading ? 'Refreshing...' : '↻ Re-test'}
          </button>
        </div>
      </header>

      {/* Error Notice */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <strong>Connection Error:</strong> {error}
        </div>
      )}

      {/* Tab Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('services')}
          style={{
            padding: '10px 24px',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '8px',
            cursor: 'pointer',
            border: activeTab === 'services' ? '2px solid #2563eb' : '1px solid #ddd',
            background: activeTab === 'services' ? '#2563eb' : '#fff',
            color: activeTab === 'services' ? '#fff' : '#333',
            transition: 'all 0.2s',
          }}
        >
          ✂️ Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('barbers')}
          style={{
            padding: '10px 24px',
            fontSize: '16px',
            fontWeight: 600,
            borderRadius: '8px',
            cursor: 'pointer',
            border: activeTab === 'barbers' ? '2px solid #2563eb' : '1px solid #ddd',
            background: activeTab === 'barbers' ? '#2563eb' : '#fff',
            color: activeTab === 'barbers' ? '#fff' : '#333',
            transition: 'all 0.2s',
          }}
        >
          💈 Barbers ({barbers.length})
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p>Fetching data from Laravel API via Axios...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'services' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {services.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827' }}>{item.name}</h3>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{item.price}</span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 10px' }}>{item.description}</p>
                  <span style={{ fontSize: '12px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', color: '#4b5563' }}>
                    ⏱ {item.duration}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'barbers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    👤
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#111827' }}>{barber.name}</h3>
                  <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '14px' }}>{barber.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '13px', color: '#4b5563' }}>
                    <span>⭐ {barber.rating}</span>
                    <span>•</span>
                    <span>💼 {barber.experience}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
