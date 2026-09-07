import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Flame,
  Activity,
  Plane,
  Building2,
  Route,
  Mic,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import type { SpatialCopilotAction, ViewModeType, IntelligenceLayerType } from '../types';

interface SpatialCopilotBarProps {
  currentLat: number | null;
  currentLon: number | null;
  currentLocationName: string;
  currentMode: ViewModeType;
  onExecuteAction: (action: SpatialCopilotAction) => void;
}

const QUICK_PROMPTS = [
  { label: 'Wildfires', icon: Flame, prompt: 'Fly to active wildfire hotspots with NASA thermal sensors', color: 'text-orange-400' },
  { label: 'Earthquakes', icon: Activity, prompt: 'Show seismic earthquake epicenters along tectonic faults', color: 'text-amber-400' },
  { label: 'Live Flights', icon: Plane, prompt: 'Track commercial aircraft vectors on OpenSky', color: 'text-sky-400' },
  { label: '3D Cities', icon: Building2, prompt: 'Enter 3D God\'s Eye Photorealistic Tiles in San Francisco', color: 'text-emerald-400' },
  { label: 'Road Traffic', icon: Route, prompt: 'Inspect 2D road cartography and live traffic congestion in Tokyo', color: 'text-indigo-400' },
];

export const SpatialCopilotBar: React.FC<SpatialCopilotBarProps> = ({
  currentLat,
  currentLon,
  currentLocationName,
  currentMode,
  onExecuteAction,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState<SpatialCopilotAction | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (textToSubmit?: string) => {
    const query = (textToSubmit || prompt).trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/spatial-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          currentContext: {
            lat: currentLat,
            lon: currentLon,
            locationName: currentLocationName,
            mode: currentMode,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const actionData: SpatialCopilotAction = await res.json();
      setLatestResponse(actionData);
      onExecuteAction(actionData);
      setPrompt('');
    } catch (err: any) {
      console.error('[CopilotBar] Request error:', err);
      // Fallback deterministic action
      const fallback: SpatialCopilotAction = {
        replyText: 'Spatial copilot locked onto your navigation vector.',
        action: 'none',
      };
      setLatestResponse(fallback);
      onExecuteAction(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl select-none">
      <div className="p-2.5 rounded-3xl bg-[#0a0f1d]/90 border border-white/15 backdrop-blur-2xl shadow-2xl transition-all duration-300">
        {/* Latest Copilot Telemetry / Voice Readout */}
        {latestResponse && !isCollapsed && (
          <div className="mb-2 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5 text-xs">
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 mt-0.5 shrink-0">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                  AI Spatial Intelligence Copilot
                </span>
                <button
                  onClick={() => setLatestResponse(null)}
                  className="text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-slate-100 font-medium leading-relaxed mt-0.5">
                {latestResponse.replyText}
              </p>
              {latestResponse.insights && (
                <p className="text-[11px] text-neutral-400 mt-1 font-mono leading-normal">
                  {latestResponse.insights}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Input Form & Action Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center pl-2.5 text-amber-400 shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Command the globe (e.g., 'Fly to California wildfires', 'Show 3D roads in Tokyo')..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-slate-100 placeholder-neutral-400 font-normal py-1.5"
            disabled={isLoading}
          />

          {isLoading ? (
            <div className="p-2 rounded-xl bg-white/10 text-neutral-300 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={!prompt.trim()}
              className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
              title="Execute Spatial Command"
            >
              <Send className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand suggestions' : 'Collapse suggestions'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-white/10 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-1 shrink-0">
              Quick:
            </span>
            {QUICK_PROMPTS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => handleSubmit(item.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-[11px] font-medium text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <Icon className={`w-3 h-3 ${item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
