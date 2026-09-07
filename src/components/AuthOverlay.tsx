import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, LogIn, Sparkles, Compass, ShieldCheck, AlertCircle, Key } from 'lucide-react';
import { signInWithGoogle, signInAsGuest } from '../services/firebaseAuth';
import { setCustomOwmKey, getCustomOwmKey } from '../services/weatherService';
import type { AuthUser } from '../types';

interface AuthOverlayProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getCustomOwmKey());

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      console.log('[AuthOverlay] User triggered Google Sign-In with Popup');
      const user = await signInWithGoogle();
      onAuthenticated(user);
    } catch (err: any) {
      console.error('[AuthOverlay] Sign in error:', err);
      setErrorMsg(
        err.message || 'Authentication failed. You may also click "Explore as Guest" to test immediately.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    setLoading(true);
    console.log('[AuthOverlay] User triggered Guest Access');
    try {
      const guest = signInAsGuest('Atmosphere Pilot');
      onAuthenticated(guest);
    } catch (err: any) {
      console.error('[AuthOverlay] Guest login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    setCustomOwmKey(apiKeyInput);
    setShowKeyInput(false);
  };

  return (
    <div
      id="login-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050811]/85 backdrop-blur-xl p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#090e1f]/90 p-8 shadow-2xl shadow-sky-950/40 backdrop-blur-2xl"
      >
        {/* Glow ambient highlight */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-sky-500/10 border border-sky-400/20 shadow-inner">
            <Globe className="w-9 h-9 text-sky-400 animate-pulse" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
              GeoAtmosphere
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              3D Planetary Atmosphere & Air Quality Intelligence
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Sparkles className="w-3 h-3 text-sky-400" />
            Three.js Globe + OpenWeather + AQI Sync
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="text-amber-200/90 mt-0.5">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="relative z-10 mt-7 space-y-3">
          <button
            id="btn-google-login"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-sky-600/25 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In with Google</span>
              </>
            )}
          </button>

          <button
            id="btn-guest-login"
            onClick={handleGuestSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-all duration-150 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Continue as Guest Explorer</span>
          </button>
        </div>

        {/* Optional Custom API Key accordion */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 text-xs">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors mx-auto"
          >
            <Key className="w-3.5 h-3.5 text-sky-400" />
            <span>{showKeyInput ? 'Hide OpenWeatherMap key' : 'Custom OpenWeather API Key (Optional)'}</span>
          </button>

          {showKeyInput && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 space-y-2"
            >
              <input
                type="text"
                placeholder="Enter OpenWeatherMap API key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-sky-400"
              />
              <button
                onClick={handleSaveApiKey}
                className="w-full py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                Apply Key
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Without a key, the app seamlessly defaults to live Open-Meteo real-time telemetry.
              </p>
            </motion.div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Firebase v10 Auth
          </span>
          <span>•</span>
          <span>Fresnel 3D Shaders</span>
          <span>•</span>
          <span>Live GPS Sync</span>
        </div>
      </motion.div>
    </div>
  );
};
