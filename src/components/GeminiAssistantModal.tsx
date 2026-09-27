import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bot,
  Send,
  Sparkles,
  Zap,
  RotateCcw,
  MapPin,
  Flame,
  Activity,
  Navigation,
} from 'lucide-react';
import type { ViewModeType, WeatherData, AqiData, FireHotspot, EarthquakeData } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  modelUsed?: string;
  actionTaken?: {
    action: string;
    targetLocation?: { name: string; lat: number; lon: number };
  };
}

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat: number | null;
  currentLon: number | null;
  currentLocationName: string;
  currentMode: ViewModeType;
  weather?: WeatherData | null;
  aqi?: AqiData | null;
  fires?: FireHotspot[];
  earthquakes?: EarthquakeData[];
  onExecuteAction?: (action: any) => void;
}

export type GeminiModelChoice = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3.1-flash-lite';

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentLat,
  currentLon,
  currentLocationName,
  currentMode,
  weather,
  aqi,
  fires = [],
  earthquakes = [],
  onExecuteAction,
}) => {
  // Chat tab state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I am your Gemini Planetary Intelligence Assistant. Ask me anything about global weather phenomena, atmospheric physics, active wildfires, tectonic plates, or command me to fly anywhere on Earth.",
      timestamp: Date.now(),
      modelUsed: 'gemini-2.5-flash',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-2.5-flash');
  const [systemRole, setSystemRole] = useState<'planetary' | 'climate' | 'navigator'>('planetary');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputPrompt('');
    setIsSending(true);

    try {
      // Build conversation history format
      const historyPayload = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          model: selectedModel,
          systemRole,
          currentContext: {
            lat: currentLat,
            lon: currentLon,
            name: currentLocationName,
            mode: currentMode,
            weather: weather
              ? {
                  temp: weather.temp,
                  feels_like: weather.feels_like,
                  temp_min: weather.temp_min,
                  temp_max: weather.temp_max,
                  humidity: weather.humidity,
                  wind_speed: weather.wind_speed,
                  wind_deg: weather.wind_deg,
                  pressure: weather.pressure,
                  weather_main: weather.weather_main,
                  weather_desc: weather.weather_desc,
                  clouds: weather.clouds,
                }
              : null,
            aqi: aqi
              ? {
                  aqi: aqi.aqi,
                  label: aqi.label,
                  pm2_5: aqi.pm2_5,
                  pm10: aqi.pm10,
                  no2: aqi.no2,
                  healthRecommendation: aqi.healthRecommendation,
                }
              : null,
            firesCount: fires.length,
            earthquakesCount: earthquakes.length,
            strongestEarthquake:
              earthquakes.length > 0
                ? {
                    mag: Math.max(...earthquakes.map((e) => e.magnitude)),
                    place: earthquakes[0]?.place,
                  }
                : null,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const botMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.replyText || "I've processed your request.",
        timestamp: Date.now(),
        modelUsed: data.modelUsed || selectedModel,
        actionTaken: data.actionData,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (data.actionData && onExecuteAction) {
        onExecuteAction(data.actionData);
      }
    } catch (err: any) {
      console.error('[GeminiChat] error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Could not complete request: ${err?.message || 'Network error'}. Rate limit or network delay occurred.`,
          timestamp: Date.now(),
          modelUsed: selectedModel,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: "Conversation thread cleared. How can I assist your planetary exploration?",
        timestamp: Date.now(),
        modelUsed: selectedModel,
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl h-[650px] max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-sky-500/30 bg-slate-950/90 text-white shadow-2xl shadow-sky-500/10"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)',
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Gemini Planetary Copilot</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Online • Free Tier
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Natural Language Planetary Intelligence & Autonomous Earth Navigation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model & Persona Selection Bar */}
        <div className="px-5 py-2 border-b border-white/5 bg-black/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-[11px] font-mono">Model:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedModel('gemini-2.5-flash')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  selectedModel === 'gemini-2.5-flash'
                    ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
                }`}
                title="Ultra-fast, zero-cost Gemini reasoning"
              >
                2.5-flash (Standard)
              </button>
              <button
                onClick={() => setSelectedModel('gemini-2.5-pro')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  selectedModel === 'gemini-2.5-pro'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
                }`}
                title="Deep analysis for complex climate systems"
              >
                2.5-pro (Deep)
              </button>
              <button
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
                }`}
                title="Low latency quick queries"
              >
                3.1-flash-lite
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-[11px] font-mono">Role:</span>
            <select
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-md px-2 py-0.5 text-[11px] text-sky-300 font-mono focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="planetary">Planetary Analyst</option>
              <option value="climate">Climate & Weather Specialist</option>
              <option value="navigator">Tactical Navigator</option>
            </select>

            <button
              onClick={handleClearHistory}
              title="Clear Conversation Thread"
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Real-Time Telemetry Bar */}
        <div className="px-5 py-2 bg-gradient-to-r from-sky-950/40 via-purple-950/20 to-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono text-emerald-300 font-semibold tracking-wide">
              REAL-TIME TELEMETRY FEED
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              • {currentLocationName || 'Global Grid'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
            {weather ? (
              <span className="text-sky-300">
                🌡️ {Math.round(weather.temp)}°C ({weather.weather_desc}) • 💨 {Math.round(weather.wind_speed * 3.6)} km/h
              </span>
            ) : (
              <span className="text-neutral-500">Telemetry ready</span>
            )}
            {aqi && (
              <span className="text-amber-300">
                🍃 AQI {aqi.aqi} ({aqi.label})
              </span>
            )}
            {fires.length > 0 && (
              <span className="text-orange-400">
                🔥 {fires.length} Fires
              </span>
            )}
            {earthquakes.length > 0 && (
              <span className="text-rose-400">
                ⚡ {earthquakes.length} Quakes
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Chat Thread */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-mono text-neutral-400">
                  {msg.role === 'user' ? 'You' : `Gemini (${msg.modelUsed || selectedModel})`}
                </span>
                <span className="text-[9px] text-neutral-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-sky-500 text-black font-medium shadow-md shadow-sky-500/20 rounded-tr-sm'
                    : 'bg-white/[0.07] border border-white/10 text-slate-100 shadow-lg rounded-tl-sm'
                }`}
              >
                {msg.text}

                {/* Action pill if assistant performed an action */}
                {msg.actionTaken && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Action: {msg.actionTaken.action}</span>
                    {msg.actionTaken.targetLocation && (
                      <span className="text-white">({msg.actionTaken.targetLocation.name})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="mr-auto flex items-center gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-neutral-300 font-mono">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Gemini is analyzing with {selectedModel}...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Quick Chips */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/20 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-500 shrink-0 font-mono text-[10px]">Real-Time Data:</span>
          <button
            onClick={() => handleSendMessage(`What is the current exact temperature, humidity, wind, and weather for ${currentLocationName}?`)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 text-slate-300 shrink-0 transition-colors"
          >
            🌡️ Live Weather & Temp
          </button>
          <button
            onClick={() => handleSendMessage(`Break down the real-time Air Quality Index, PM2.5, PM10, and health advisory for ${currentLocationName}`)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/10 text-slate-300 shrink-0 transition-colors"
          >
            🍃 Live AQI & PM2.5
          </button>
          <button
            onClick={() => handleSendMessage('Report the active global NASA FIRMS wildfires and latest USGS earthquakes')}
            disabled={isSending}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-orange-500/20 hover:text-orange-300 border border-white/10 text-slate-300 shrink-0 transition-colors"
          >
            🔥 Active Hazards Report
          </button>
          <button
            onClick={() => handleSendMessage('Fly to Tokyo and report its current weather')}
            disabled={isSending}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 border border-white/10 text-slate-300 shrink-0 transition-colors"
          >
            ✈️ Fly to Tokyo
          </button>
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask Gemini (e.g. "Fly to Paris", "Explain the Pacific Ring of Fire")...`}
            className="flex-1 bg-white/[0.06] border border-white/10 focus:border-sky-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-400 focus:outline-none transition-colors"
            disabled={isSending}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isSending}
            className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-black font-semibold transition-all cursor-pointer shadow-md shadow-sky-500/20"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
