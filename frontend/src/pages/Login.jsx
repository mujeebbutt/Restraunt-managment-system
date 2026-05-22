import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, settingsAPI } from '../services/api';

const Login = () => {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({
    shop_name: 'HFC POS System',
    logo_path: '',
    tagline: 'Enter your staff PIN to login'
  });
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (localStorage.getItem('rms_token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const data = await settingsAPI.getPublic();
        setBranding(data);
      } catch (err) {
        console.warn('Failed to fetch public settings:', err);
      }
    };
    fetchBranding();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Please enter your access passcode');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authAPI.login(pin);
      localStorage.setItem('rms_token', data.access_token);
      localStorage.setItem('rms_staff', JSON.stringify(data.staff));
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid passcode or inactive account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl flex flex-col gap-6 transform hover:scale-[1.01] transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          {branding.logo_path ? (
            <img 
              className="w-16 h-16 object-contain rounded-2xl mb-3 shadow-md" 
              src={`http://localhost:8000/${branding.logo_path}`} 
              alt={branding.shop_name} 
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
              <span className="material-symbols-outlined text-[36px] text-white">restaurant_menu</span>
            </div>
          )}
          <h1 className="font-headline-lg text-primary text-[30px] font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {branding.shop_name}
          </h1>
          <p className="font-body-md text-slate-500 mt-1">
            {branding.tagline}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Staff Passcode / PIN
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-slate-400 select-none">
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={pin}
                onChange={(e) => {
                  setError('');
                  setPin(e.target.value);
                }}
                className="w-full h-[52px] pl-12 pr-12 text-lg font-bold border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error text-sm font-semibold bg-error-container/50 border border-error/20 p-3 rounded-xl animate-shake">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-indigo-700 text-white h-[52px] rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[22px]">sync</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>AUTHENTICATE STAFF</span>
              </>
            )}
          </button>
        </form>
      </div>
      
      {/* Footer Info */}
      <p className="text-[12px] text-white/50 mt-8 text-center tracking-wide">
        {branding.shop_name} POS v1.1.0
      </p>
    </div>
  );
};

export default Login;
