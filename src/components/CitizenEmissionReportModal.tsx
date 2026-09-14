import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Flame,
  Factory,
  Trash2,
  Truck,
  Wind,
  ShieldCheck,
  Send,
  Sparkles,
  MapPin,
  Activity,
  FileText,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { CitizenEmissionReport, EmissionSourceType } from '../types';
import { addCitizenReport } from '../services/corridorAndEmissionService';

interface CitizenEmissionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: CitizenEmissionReport[];
  onReportsUpdated: (updated: CitizenEmissionReport[]) => void;
  currentLat: number | null;
  currentLon: number | null;
  currentLocationName: string;
  onFlyToLocation?: (lat: number, lon: number, name: string) => void;
}

const SOURCE_TYPE_CONFIG: Record<
  EmissionSourceType,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  agricultural_stubble: {
    label: 'Crop Stubble Burning',
    icon: Flame,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  industrial_smokestack: {
    label: 'Industrial Smokestack Flare',
    icon: Factory,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
  },
  garbage_burning: {
    label: 'Open Garbage Incineration',
    icon: Trash2,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
  },
  construction_dust: {
    label: 'Construction Fugitive Dust',
    icon: Wind,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/30',
  },
  brick_kiln: {
    label: 'Brick Kiln Coal Plume',
    icon: Factory,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
  },
  vehicular_smog: {
    label: 'Heavy Diesel Vehicular Smog',
    icon: Truck,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
  },
};

export const CitizenEmissionReportModal: React.FC<CitizenEmissionReportModalProps> = ({
  isOpen,
  onClose,
  reports,
  onReportsUpdated,
  currentLat,
  currentLon,
  currentLocationName,
  onFlyToLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'report'>('feed');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<CitizenEmissionReport | null>(
    reports[0] || null
  );

  // New report form state
  const [sourceType, setSourceType] = useState<EmissionSourceType>('agricultural_stubble');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(
    currentLocationName || 'Sangrur - Patiala Highway'
  );
  const [stateName, setStateName] = useState('Punjab');
  const [reportLat, setReportLat] = useState<number>(currentLat ?? 30.2458);
  const [reportLon, setReportLon] = useState<number>(currentLon ?? 75.8421);
  const [reporterName, setReporterName] = useState('Clean Air Citizen Scout #82');
  const [sensorPm25, setSensorPm25] = useState('420');
  const [sensorPm10, setSensorPm10] = useState('580');
  const [sensorVoc, setSensorVoc] = useState('16.4');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80'
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const filteredReports =
    filterSource === 'all'
      ? reports
      : reports.filter((r) => r.sourceType === filterSource);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitNewReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    // Simulate AI Vision & Satellite Validation Pipeline
    setTimeout(() => {
      const pm25Num = parseFloat(sensorPm25) || 350;
      const pm10Num = parseFloat(sensorPm10) || 500;
      const vocNum = parseFloat(sensorVoc) || 12;

      // Calculate automated severity
      const severity = Math.min(
        100,
        Math.round(40 + (pm25Num / 500) * 45 + (vocNum > 15 ? 15 : 5))
      );

      const newReport: CitizenEmissionReport = {
        id: `report-${Date.now()}`,
        timestamp: Date.now(),
        sourceType,
        title: title || `${SOURCE_TYPE_CONFIG[sourceType].label} Spotted`,
        description:
          description ||
          `Citizen field report with photo and IoT particulate sensor telemetry showing rapid localized PM2.5 surge.`,
        lat: reportLat,
        lon: reportLon,
        locationName,
        state: stateName,
        imageUrl: imagePreviewUrl,
        sensorReadings: {
          pm25: pm25Num,
          pm10: pm10Num,
          voc: vocNum,
        },
        aiVerification: {
          verified: true,
          confidenceScore: 94,
          severityScore: severity,
          detectedPlumeType: `${SOURCE_TYPE_CONFIG[sourceType].label} Thermal & Particulate Column`,
          estimatedPm25Spike: Math.round(pm25Num * 0.8),
          aiReasoning: `Multispectral plume signature corroborates high optical density. Micro-sensor PM2.5 exceeds standard threshold by ${(pm25Num / 60).toFixed(1)}x. Immediate mitigation ticket generated.`,
        },
        status: 'authority_dispatched',
        reportedBy: reporterName,
        authorityNoticeSentTo: `${stateName} State Pollution Control Board & District Rapid Taskforce`,
      };

      const updated = addCitizenReport(newReport);
      onReportsUpdated(updated);
      setSelectedReport(newReport);
      setIsVerifying(false);
      setIsSubmittedSuccess(true);

      setTimeout(() => {
        setIsSubmittedSuccess(false);
        setActiveTab('feed');
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-sky-400/30 shadow-2xl text-white font-sans"
        style={{
          background: 'linear-gradient(135deg, rgba(12, 18, 30, 0.96) 0%, rgba(6, 9, 18, 0.98) 100%)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Citizen Climate Watch
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-amber-300 bg-amber-500/20 border border-amber-400/30">
                  Federated Reporting
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Crowdsourced emissions, IoT sensor telemetry & AI-verified rapid authority dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center p-1 rounded-full bg-black/40 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                  activeTab === 'feed'
                    ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hotspot Feed ({reports.length})
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                  activeTab === 'report'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Report Emission
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Live Hotspot Feed */}
        {activeTab === 'feed' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
            {/* Left sidebar: Reports list */}
            <div className="md:col-span-5 border-r border-white/10 flex flex-col h-[70vh] bg-black/20">
              {/* Filter bar */}
              <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Filter className="w-3.5 h-3.5 text-sky-400" />
                  <span>Category:</span>
                </div>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all" className="bg-[#0c121e]">All Sources ({reports.length})</option>
                  <option value="agricultural_stubble" className="bg-[#0c121e]">Stubble Burning</option>
                  <option value="industrial_smokestack" className="bg-[#0c121e]">Industrial Flares</option>
                  <option value="garbage_burning" className="bg-[#0c121e]">Garbage Burning</option>
                  <option value="construction_dust" className="bg-[#0c121e]">Construction Dust</option>
                  <option value="brick_kiln" className="bg-[#0c121e]">Brick Kilns</option>
                </select>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredReports.map((item) => {
                  const cfg = SOURCE_TYPE_CONFIG[item.sourceType] || SOURCE_TYPE_CONFIG.agricultural_stubble;
                  const Icon = cfg.icon;
                  const isSelected = selectedReport?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedReport(item)}
                      className={`w-full text-left p-3 rounded-2xl transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400/50 shadow-lg'
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-medium text-white truncate max-w-[150px]">
                            {item.locationName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                        {item.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>PM2.5: <strong className="text-rose-400">{item.sensorReadings?.pm25 || '—'}</strong> µg</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          item.status === 'authority_dispatched'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.status === 'ai_verified'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right sidebar: Detailed Report View */}
            <div className="md:col-span-7 p-6 overflow-y-auto h-[70vh] flex flex-col justify-between">
              {selectedReport ? (
                <div className="space-y-5">
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Hotspot #{selectedReport.id.slice(-6)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {selectedReport.state} • {new Date(selectedReport.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {selectedReport.title}
                      </h3>
                      <p className="text-xs text-sky-300 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedReport.locationName} ({(selectedReport.lat ?? 0).toFixed(4)}°, {(selectedReport.lon ?? 0).toFixed(4)}°)
                      </p>
                    </div>

                    {onFlyToLocation && (
                      <button
                        onClick={() => {
                          onFlyToLocation(selectedReport.lat, selectedReport.lon, selectedReport.locationName);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs text-sky-200 font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>Fly on Globe</span>
                      </button>
                    )}
                  </div>

                  {/* Photo Evidence & Satellite Corroboration */}
                  {selectedReport.imageUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video max-h-52 bg-slate-900 group">
                      <img
                        src={selectedReport.imageUrl}
                        alt="Citizen emission evidence"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                        <div className="flex items-center justify-between w-full text-xs text-white">
                          <span className="font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
                            Citizen Verified Photo
                          </span>
                          <span className="text-amber-300 font-mono text-[11px]">
                            Reported by: {selectedReport.reportedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed">
                    <p>{selectedReport.description}</p>
                  </div>

                  {/* IoT Micro-Sensor Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-black/40 border border-rose-500/30 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">PM2.5 Concentration</span>
                      <span className="text-lg font-bold font-mono text-rose-400">
                        {selectedReport.sensorReadings?.pm25 ?? '—'}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">µg/m³</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">PM10 Coarse</span>
                      <span className="text-lg font-bold font-mono text-amber-400">
                        {selectedReport.sensorReadings?.pm10 ?? '—'}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">µg/m³</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">Volatile Organics</span>
                      <span className="text-lg font-bold font-mono text-purple-400">
                        {selectedReport.sensorReadings?.voc ?? '—'}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">ppm</span>
                    </div>
                  </div>

                  {/* AI Vision & Satellite Corroboration Card */}
                  {selectedReport.aiVerification && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 to-blue-950/40 border border-sky-400/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 font-mono">
                          <Sparkles className="w-4 h-4 text-sky-400" />
                          <span>Gemini AI Vision & Satellite Verification</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {selectedReport.aiVerification.confidenceScore}% Confidence
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed font-sans">
                        {selectedReport.aiVerification.aiReasoning}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400 border-t border-white/10">
                        <span>Severity Index: <strong className="text-rose-400">{selectedReport.aiVerification.severityScore}/100</strong></span>
                        <span>Estimated PM2.5 release: <strong className="text-amber-300">+{selectedReport.aiVerification.estimatedPm25Spike} µg/m³</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Official Rapid Intervention Dispatch */}
                  {selectedReport.authorityNoticeSentTo && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <span className="font-semibold text-rose-300 block">
                          Official Intervention Ticket Dispatched
                        </span>
                        <p className="text-slate-300">
                          Automated alert transmitted to: <strong>{selectedReport.authorityNoticeSentTo}</strong>. Mechanized smog suppression & drone inspection scheduled.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <p className="text-sm">Select an emission report from the left feed</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Submit New Emission Report */}
        {activeTab === 'report' && (
          <form onSubmit={handleSubmitNewReport} className="flex-1 p-6 overflow-y-auto space-y-4">
            {isSubmittedSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold">
                  Report verified by AI and dispatched to Pollution Control Board!
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Emission Category
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as EmissionSourceType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="agricultural_stubble" className="bg-[#0c121e]">
                    Crop Residue / Stubble Burning
                  </option>
                  <option value="industrial_smokestack" className="bg-[#0c121e]">
                    Industrial Smokestack / Night Flare
                  </option>
                  <option value="garbage_burning" className="bg-[#0c121e]">
                    Municipal Open Garbage Incineration
                  </option>
                  <option value="construction_dust" className="bg-[#0c121e]">
                    Construction Site Fugitive Dust
                  </option>
                  <option value="brick_kiln" className="bg-[#0c121e]">
                    Brick Kiln Dense Coal Flue
                  </option>
                  <option value="vehicular_smog" className="bg-[#0c121e]">
                    Heavy Diesel Vehicular Smog
                  </option>
                </select>
              </div>

              {/* Location Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Location / Highway Landmark
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Near Dhuri Toll, NH-7, Sangrur"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  State / Jurisdiction
                </label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="Punjab" className="bg-[#0c121e]">Punjab</option>
                  <option value="Haryana" className="bg-[#0c121e]">Haryana</option>
                  <option value="Delhi" className="bg-[#0c121e]">Delhi-NCR</option>
                  <option value="Uttar Pradesh" className="bg-[#0c121e]">Uttar Pradesh</option>
                  <option value="Rajasthan" className="bg-[#0c121e]">Rajasthan</option>
                  <option value="Gujarat" className="bg-[#0c121e]">Gujarat</option>
                  <option value="Maharashtra" className="bg-[#0c121e]">Maharashtra</option>
                  <option value="Karnataka" className="bg-[#0c121e]">Karnataka</option>
                  <option value="Other" className="bg-[#0c121e]">Other State</option>
                </select>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={reportLat}
                    onChange={(e) => setReportLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={reportLon}
                    onChange={(e) => setReportLon(parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Incident Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unpermitted nighttime coal flue discharge near industrial corridor"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Visual Description & Wind Direction
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe opacity of plume, smell, estimated burned acreage, or vehicle density..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400 resize-none"
              />
            </div>

            {/* IoT Sensor Readings */}
            <div>
              <label className="block text-xs font-medium text-sky-300 mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Hyper-Local IoT Micro-Sensor Telemetry (PurpleAir / Prana / DIY ESP32)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">PM2.5 (µg/m³)</span>
                  <input
                    type="number"
                    value={sensorPm25}
                    onChange={(e) => setSensorPm25(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">PM10 (µg/m³)</span>
                  <input
                    type="number"
                    value={sensorPm10}
                    onChange={(e) => setSensorPm10(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">VOCs (ppm)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={sensorVoc}
                    onChange={(e) => setSensorVoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload & Preview */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Photo Evidence (Drag-and-Drop or Select)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 border-2 border-dashed border-white/20 hover:border-sky-400/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-white/5">
                  <Upload className="w-5 h-5 text-sky-400" />
                  <span className="text-xs text-slate-300">Click to upload photo evidence</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, HEIC accepted</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>

                {imagePreviewUrl && (
                  <div className="w-32 h-24 rounded-xl overflow-hidden border border-white/20 shrink-0 relative">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                      Ready
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isVerifying}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-semibold text-xs transition-all shadow-xl active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>AI Verifying Plume & Satellite Anomaly...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit & Dispatch Rapid Intervention</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
