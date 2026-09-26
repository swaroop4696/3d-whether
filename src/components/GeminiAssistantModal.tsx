import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  X,
  Bot,
  Send,
  Sparkles,
  Zap,
  Cpu,
  RotateCcw,
  Sliders,
  ChevronDown,
  Activity,
  Layers,
  MapPin,
} from 'lucide-react';
import type { ViewModeType } from '../types';

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
  onExecuteAction?: (action: any) => void;
}

export type GeminiModelChoice = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentLat,
  currentLon,
  currentLocationName,
  currentMode,
  onExecuteAction,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'live'>('chat');

  // Chat tab state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I am your Gemini Planetary Intelligence Assistant. Ask me anything about global weather systems, seismic activity, active wildfires, or tell me to fly anywhere on the 3D globe.",
      timestamp: Date.now(),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-3.5-flash');
  const [systemRole, setSystemRole] = useState<'planetary' | 'climate' | 'navigator'>('planetary');

  // Live API Voice tab state
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error'>('idle');
  const [liveErrorMessage, setLiveErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<Array<{ sender: 'user' | 'gemini'; text: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingAudioRef = useRef(false);

  // Auto-scroll chat messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen && isLiveActive) {
      stopLiveSession();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    const text = inputPrompt.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
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
          text: `⚠️ Could not complete request: ${err?.message || 'Network error'}. If using a Pro model, ensure an API key is configured.`,
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

  // Convert Float32 buffer to 16kHz PCM Int16 Base64
  const pcmToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Play queued 24kHz raw PCM chunks from Live API
  const playNextAudioChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setLiveStatus('listening');
      return;
    }

    if (!outputAudioContextRef.current) {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }

    const ctx = outputAudioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    isPlayingAudioRef.current = true;
    setLiveStatus('speaking');

    const floatData = audioQueueRef.current.shift()!;
    const audioBuffer = ctx.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      playNextAudioChunk();
    };
    source.start(0);
  };

  const startLiveSession = async () => {
    try {
      setLiveStatus('connecting');
      setLiveErrorMessage(null);

      // 1. Get user microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Setup AudioContext for input capture
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      // Analyser for UI visualizer
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        if (isLiveActive) {
          requestAnimationFrame(updateLevel);
        }
      };

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(inputCtx.destination);

      // 3. Connect to server WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      ws.onopen = () => {
        console.log('[GeminiLive] Connected to Live API bridge');
        setLiveStatus('listening');
        setIsLiveActive(true);
        requestAnimationFrame(updateLevel);

        // Send initial context to the live model
        ws.send(
          JSON.stringify({
            type: 'init_context',
            context: {
              currentLocation: currentLocationName,
              lat: currentLat,
              lon: currentLon,
              viewMode: currentMode,
            },
          })
        );
      };

      processor.onaudioprocess = (e) => {
        if (isMuted || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = pcmToBase64(inputData);
        ws.send(JSON.stringify({ audio: base64Audio }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.interrupted) {
            audioQueueRef.current = [];
            isPlayingAudioRef.current = false;
            setLiveStatus('listening');
            return;
          }

          if (msg.audio) {
            // Convert base64 PCM back to Float32
            const binary = window.atob(msg.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const int16Array = new Int16Array(bytes.buffer);
            const floatArray = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
              floatArray[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
            }

            audioQueueRef.current.push(floatArray);
            if (!isPlayingAudioRef.current) {
              playNextAudioChunk();
            }
          }

          if (msg.text) {
            setLiveTranscript((prev) => [...prev, { sender: 'gemini', text: msg.text }]);
          }

          if (msg.action && onExecuteAction) {
            onExecuteAction(msg.action);
          }
        } catch (err) {
          console.warn('[GeminiLive] parse message error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[GeminiLive] WebSocket error:', err);
        setLiveStatus('error');
        setLiveErrorMessage('Live Voice connection failed. Check your GEMINI_API_KEY environment variable.');
      };

      ws.onclose = () => {
        console.log('[GeminiLive] WebSocket closed');
        stopLiveSession();
      };
    } catch (err: any) {
      console.error('[GeminiLive] Start error:', err);
      setLiveStatus('error');
      setLiveErrorMessage(err?.message || 'Could not access microphone or initiate Live API.');
      stopLiveSession();
    }
  };

  const stopLiveSession = () => {
    setIsLiveActive(false);
    setLiveStatus('idle');
    setAudioLevel(0);

    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-2xl h-[85vh] max-h-[720px] rounded-3xl bg-[#090d16]/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500/30 to-indigo-500/30 border border-sky-400/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Gemini Planetary Copilot</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Online
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Multi-Turn Reasoning Chatbot & Real-Time Live Voice (gemini-3.8-live)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Tabs */}
            <div className="flex p-0.5 rounded-xl bg-black/50 border border-white/10">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-sky-500 text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'live'
                    ? 'bg-purple-500 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isLiveActive ? 'animate-pulse text-amber-300' : ''}`} />
                <span>Live Voice</span>
                <span className="text-[9px] px-1 rounded bg-black/40 text-purple-200">Live API</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Multi-Turn Chatbot */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Model & Persona Selection Bar */}
            <div className="px-5 py-2 border-b border-white/5 bg-black/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 text-[11px] font-mono">Model:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedModel('gemini-3.5-flash')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                      selectedModel === 'gemini-3.5-flash'
                        ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
                    }`}
                    title="Fast & general reasoning (gemini-3.5-flash)"
                  >
                    3.5-flash (General)
                  </button>
                  <button
                    onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                      selectedModel === 'gemini-3.1-pro-preview'
                        ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
                    }`}
                    title="Deep reasoning for complex planetary tasks (gemini-3.1-pro-preview)"
                  >
                    3.1-pro (Complex)
                  </button>
                  <button
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                      selectedModel === 'gemini-3.1-flash-lite'
                        ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
                    }`}
                    title="Ultra-fast responses (gemini-3.1-flash-lite)"
                  >
                    3.1-flash-lite (Fast)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-400 text-[11px] font-mono">Role:</span>
                <select
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value as any)}
                  className="bg-black/40 border border-white/10 rounded-md px-2 py-0.5 text-[11px] text-slate-200 outline-none cursor-pointer"
                >
                  <option value="planetary">Planetary Analyst</option>
                  <option value="climate">Climate & Weather Specialist</option>
                  <option value="navigator">Tactical Navigator</option>
                </select>

                <button
                  onClick={handleClearHistory}
                  title="Clear Conversation Thread"
                  className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
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
                        ? 'bg-sky-500 text-black font-medium shadow-md shadow-sky-500/20 rounded-tr-none'
                        : 'bg-white/[0.07] border border-white/10 text-slate-100 shadow-lg rounded-tl-none'
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
                <div className="mr-auto flex items-center gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-neutral-400">
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>Gemini is thinking with {selectedModel}...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-white/10 bg-black/30 flex items-center gap-2">
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
                placeholder={`Ask ${selectedModel} (e.g. "What causes atmospheric rivers?", "Fly to Tokyo")...`}
                className="flex-1 bg-white/[0.06] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-400 outline-none transition-all"
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputPrompt.trim() || isSending}
                className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none text-black font-bold transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Live API Voice Conversation (gemini-3.8-live) */}
        {activeTab === 'live' && (
          <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-purple-950/20 to-black/40">
            {/* Live Model Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Real-Time Model: gemini-3.8-live</span>
            </div>

            {/* Central Animated Voice Orb */}
            <div className="relative flex flex-col items-center justify-center my-auto">
              <div
                className={`relative flex items-center justify-center w-36 h-36 rounded-full transition-all duration-300 ${
                  isLiveActive
                    ? liveStatus === 'speaking'
                      ? 'bg-gradient-to-tr from-purple-600 to-amber-500 shadow-[0_0_60px_rgba(168,85,247,0.5)] scale-110'
                      : 'bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-[0_0_40px_rgba(56,189,248,0.4)] scale-100'
                    : 'bg-white/10 border border-white/20'
                }`}
                style={{
                  transform: isLiveActive ? `scale(${1 + audioLevel * 0.005})` : 'scale(1)',
                }}
              >
                {/* Ripple rings */}
                {isLiveActive && (
                  <>
                    <div
                      className="absolute inset-0 rounded-full border border-sky-400/40 animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                    <div
                      className="absolute -inset-4 rounded-full border border-purple-400/30 animate-pulse"
                      style={{ animationDuration: '1.5s' }}
                    />
                  </>
                )}

                <Mic className={`w-12 h-12 ${isLiveActive ? 'text-white' : 'text-neutral-400'}`} />
              </div>

              {/* Status Indicator */}
              <div className="mt-6 flex flex-col items-center gap-1">
                <span className="text-sm font-bold text-white capitalize flex items-center gap-2">
                  {liveStatus === 'connecting' && <span className="animate-spin text-sky-400">⏳</span>}
                  {liveStatus === 'listening' && <span className="text-emerald-400">● Listening... Speak naturally</span>}
                  {liveStatus === 'speaking' && <span className="text-amber-300">● Gemini is speaking...</span>}
                  {liveStatus === 'idle' && <span className="text-neutral-400">Press Start to begin voice session</span>}
                  {liveStatus === 'error' && <span className="text-red-400">Connection Failed</span>}
                </span>

                <span className="text-xs text-neutral-400 font-mono">
                  {isLiveActive ? `Mic Input: ${audioLevel}% • 16kHz Stream` : 'Low-latency full-duplex audio stream'}
                </span>
              </div>

              {liveErrorMessage && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-xs text-red-200 text-center max-w-md">
                  {liveErrorMessage}
                </div>
              )}
            </div>

            {/* Live Conversation Transcript Feed */}
            {liveTranscript.length > 0 && (
              <div className="w-full max-h-32 overflow-y-auto mb-4 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1 custom-scrollbar">
                {liveTranscript.slice(-4).map((t, idx) => (
                  <div key={idx} className="flex gap-2 text-neutral-300">
                    <span className="font-bold text-purple-300 capitalize">{t.sender}:</span>
                    <span className="text-white">{t.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Live Controls */}
            <div className="flex items-center gap-3 w-full max-w-sm">
              {!isLiveActive ? (
                <button
                  onClick={startLiveSession}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 hover:from-purple-400 hover:to-sky-400 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-purple-500/25 active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Live Voice Conversation</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={stopLiveSession}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-sm transition-all cursor-pointer"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>End Voice Session</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
