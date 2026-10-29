import { useState, useEffect } from 'react';
import { checkBackendStatus, getServices, getBarbers } from './api/barberApi';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import JetstreamNavbar from './components/jetstream/JetstreamNavbar';
import AuthPage from './components/jetstream/AuthPage';
import './App.css';

function MainApp() {
  const { user, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('shop'); // 'shop' | 'auth'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot-password' | 'profile'
  const [status, setStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('services');

  useEffect(() => {
    let ignore = false;

    async function startFetching() {
      try {
        const [statusRes, servicesRes, barbersRes] = await Promise.all([
          checkBackendStatus(),
          getServices(),
          getBarbers(),
        ]);

        if (!ignore) {
          setStatus(statusRes);
          setServices(servicesRes);
          setBarbers(barbersRes);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load data from backend:', err);
          setError(
            err.response?.data?.message ||
            err.message ||
            'Could not connect to the backend server.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    startFetching();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [statusRes, servicesRes, barbersRes] = await Promise.all([
        checkBackendStatus(),
        getServices(),
        getBarbers(),
      ]);
      setStatus(statusRes);
      setServices(servicesRes);
      setBarbers(barbersRes);
      setError(null);
    } catch (err) {
      console.error('Failed to reload data from backend:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Could not connect to the backend server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAuth = (mode = 'login') => {
    // Route Guard: If user is authenticated, they cannot access login or signup pages
    if (isAuthenticated) {
      setAuthMode('profile');
    } else {
      setAuthMode(mode);
    }
    setCurrentView('auth');
  };

  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gray-100 font-sans">
        <JetstreamNavbar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          onOpenAuth={handleOpenAuth}
        />
        <AuthPage
          initialMode={authMode}
          onBackToShop={() => setCurrentView('shop')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* Jetstream Navigation Bar */}
      <JetstreamNavbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero & Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 sm:p-8 mb-8 text-center relative overflow-hidden">
          <div className="inline-block p-3 rounded-2xl bg-indigo-50 border border-indigo-100 mb-4">
            <span className="text-4xl">💈</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Berber Shop
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base mb-6">
            React (Vite) frontend styled with authentic <strong className="text-indigo-600 font-semibold">Laravel Jetstream</strong> components & connected to Laravel 10 Sanctum Backend.
          </p>

          {/* User Welcome Banner if logged in */}
          {isAuthenticated && (
            <div className="mb-6 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2 rounded-lg text-sm">
              <span>👋 Welcome back, <strong>{user?.name}</strong>!</span>
              <button
                onClick={() => handleOpenAuth('profile')}
                className="underline text-indigo-700 hover:text-indigo-900 font-semibold ml-2 cursor-pointer"
              >
                View Account
              </button>
            </div>
          )}

          {/* Backend Connection Status Badge */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                status
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              ></span>
              <span>
                {status
                  ? `${status.message} (${status.app})`
                  : loading
                  ? 'Checking backend...'
                  : 'Backend offline'}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 cursor-pointer transition"
            >
              {loading ? 'Refreshing...' : '↻ Re-test API'}
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-300 text-red-800 text-sm">
            <strong className="font-bold">Connection Error:</strong> {error}
          </div>
        )}

        {/* Catalog Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-gray-800 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✂️ Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('barbers')}
              className={`px-6 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
                activeTab === 'barbers'
                  ? 'bg-gray-800 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💈 Barbers ({barbers.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-500">Loading catalog from Laravel API...</p>
          </div>
        ) : (
          <div>
            {/* Services Grid */}
            {activeTab === 'services' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                        <span className="text-base font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          {item.price}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{item.description}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 font-medium bg-gray-100 px-2.5 py-1 rounded">
                        ⏱ {item.duration}
                      </span>
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            handleOpenAuth('login');
                          } else {
                            alert(`Booking requested for ${item.name}!`);
                          }
                        }}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Book Now →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Barbers Grid */}
            {activeTab === 'barbers' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 font-bold text-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-200 shadow-sm">
                      {barber.name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{barber.name}</h3>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">
                      {barber.title}
                    </p>
                    <div className="flex justify-center items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-100 font-medium">
                      <span className="flex items-center gap-1">⭐ {barber.rating}</span>
                      <span>•</span>
                      <span>💼 {barber.experience}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
