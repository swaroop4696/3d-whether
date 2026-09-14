// Source: Google Maps Platform Code Assist
// Attribution ID: gmp_mcp_codeassist_v1_aistudio
// Pattern adapted from: https://github.com/bilawalsidhu/gods-eye-view (SECURITY.md & Keys Guide)

import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  X,
  KeyRound,
  Layers,
  Lock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import {
  getKeyRestrictionSpecs,
  getGoogleMapsApiKey,
  setGoogleMapsApiKey,
  loadGoogleMapsScript,
} from '../services/googleMapsLoader';

interface KeyRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const KeyRestrictionsModal: React.FC<KeyRestrictionsModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getGoogleMapsApiKey());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize input when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getGoogleMapsApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const specs = getKeyRestrictionSpecs();
  const currentKey = getGoogleMapsApiKey();
  const hasKey = Boolean(currentKey && currentKey.length > 5);

  const handleCopy = (text: string, index: number) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.warn('[Clipboard] Copy notice:', err);
      });
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveKey = async () => {
    setIsSaving(true);
    setGoogleMapsApiKey(apiKeyInput.trim());
    if (apiKeyInput.trim()) {
      await loadGoogleMapsScript(apiKeyInput.trim());
    }
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onKeyUpdated) onKeyUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div
        className="weather-gpt-glass max-w-xl w-full p-6 text-white space-y-5 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(13, 17, 26, 0.94)',
          backdropFilter: 'blur(36px)',
          WebkitBackdropFilter: 'blur(36px)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span>Google Maps API Key Restrictions</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono">
                  gods-eye-view model
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-light mt-0.5">
                Architecture and restrictions guide from bilawalsidhu/gods-eye-view
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Threat Model & Client-Side Disclosure Callout */}
        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-[12px] text-sky-200/90 leading-relaxed flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Client-Exposed Key Rule: </span>
            Browser maps require a client-side key visible in DevTools network requests. To prevent
            unauthorized usage and quota scraping, you <strong>must restrict this key</strong> in
            the Google Cloud Console using HTTP referrers and designated API bounds.
          </div>
        </div>

        {/* Section 1: Application Restrictions (HTTP Referrers) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-white/10 text-[10px] flex items-center justify-center font-mono">
                1
              </span>
              <span>Website Restrictions (HTTP Referrers)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Select: Websites</span>
          </div>
          <p className="text-[11px] text-slate-400 font-light">
            In Google Cloud Console → APIs &amp; Services → Credentials → Edit Key →{' '}
            <strong>Application restrictions</strong>, select <em>Websites</em> and add these
            exact URLs:
          </p>
          <div className="space-y-1.5 pt-1">
            {specs.httpReferrers.map((refUrl, idx) => (
              <div
                key={refUrl}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-slate-300"
              >
                <span className="truncate text-sky-300/90">{refUrl}</span>
                <button
                  onClick={() => handleCopy(refUrl, idx)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: API Restrictions */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 text-[10px] flex items-center justify-center font-mono">
              2
            </span>
            <span>API Restrictions (Only Authorized Products)</span>
          </label>
          <p className="text-[11px] text-slate-400 font-light">
            Under <strong>API restrictions</strong>, select <em>Restrict key</em> and select strictly
            these authorized APIs:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {specs.authorizedApis.map((apiName) => (
              <div
                key={apiName}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-200"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-sky-500/30 border border-sky-400 flex items-center justify-center text-sky-300 text-[9px]">
                  ✓
                </div>
                <span className="truncate">{apiName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Quota Backstop & Spending Caps */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-[11px] text-amber-200/90 flex items-start gap-2.5">
          <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-100">Spend Protection Backstop: </span>
            As highlighted in God&apos;s Eye View&apos;s security model, URL restrictions prevent third-party
            theft, but provider-side daily quotas and Google Cloud budget alerts are the ultimate
            financial backstop against accidental runaway costs.
          </div>
        </div>

        {/* In-App Key Configurator */}
        <div className="border-t border-white/[0.08] pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Maps API Key (Optional)</span>
            </label>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                hasKey
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
              }`}
            >
              {hasKey ? 'Google Maps Active' : 'Precision Engine Active (No Key Needed)'}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your URL-restricted Google Maps API key (or leave empty)..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
            <button
              onClick={handleSaveKey}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400/40 text-xs text-sky-300 font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Key</span>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            No API key is required to explore the full map and telemetry. The app automatically runs high-precision Leaflet &amp; OpenStreetMap cartography out-of-the-box.
          </p>
        </div>

        {/* Footer Link to Google Cloud Console */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <a
            href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            <span>Open Google Cloud Credentials Console</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
