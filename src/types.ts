export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export type PlaceCategory = 'street' | 'district' | 'city' | 'landmark' | 'address';

export interface LocationHierarchy {
  road?: string;
  houseNumber?: string;
  roadType?: string;
  neighbourhood?: string;
  suburb?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  fullHierarchy: string;
  displayName: string;
  placeType?: PlaceCategory;
}

export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  weather_main: string;
  weather_desc: string;
  weather_icon: string;
  clouds: number;
  visibility: number;
  sunrise?: number;
  sunset?: number;
  timezone?: number;
  locationHierarchy?: LocationHierarchy;
}

export interface AqiData {
  aqi: number; // European standard: 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
  usAqi: number; // US EPA standard index 0 - 500
  label: string; // e.g. Good, Moderate, Unhealthy for Sensitive Groups, etc.
  color: string;
  description: string;
  healthRecommendation: string;
  outdoorActivityRating: string;
  roadsideTrafficImpact: string;
  dominantPollutant: string;
  pm2_5: number;
  pm10: number;
  no2: number;
  co: number;
  so2: number;
  o3: number;
  nh3: number;
}

export interface CitySearchResult {
  name: string;
  country: string;
  admin1?: string;
  district?: string;
  road?: string;
  postcode?: string;
  type?: PlaceCategory;
  lat: number;
  lon: number;
}

export type WeatherParticleType = 'clear' | 'rain' | 'snow' | 'thunderstorm' | 'clouds' | 'wind';

export interface FireHotspot {
  id: string;
  lat: number;
  lon: number;
  brightness: number; // in Kelvin
  frp: number; // Fire Radiative Power (MW)
  confidence: 'nominal' | 'high' | 'low';
  acqDate: string;
  acqTime: string;
  satellite: 'VIIRS-NOAA20' | 'VIIRS-SNPP' | 'MODIS-Terra' | 'MODIS-Aqua';
  locationName?: string;
  country?: string;
}

export interface EarthquakeData {
  id: string;
  lat: number;
  lon: number;
  magnitude: number;
  depth: number; // in km
  place: string;
  time: number; // timestamp
  tsunami: number;
  status: string;
  url: string;
  felt?: number | null;
  mmi?: number | null;
  alert?: string | null;
}

export interface LiveFlight {
  icao24: string;
  callsign: string;
  originCountry: string;
  lat: number;
  lon: number;
  altitude: number; // in meters
  velocity: number; // m/s
  heading: number; // degrees 0-360
  verticalRate: number; // m/s
}

export type IntelligenceLayerType = 'fires' | 'earthquakes' | 'flights';

export type MeshIntelMode = 'flights' | 'fires' | 'earthquakes';

export type ViewModeType = 'globe' | 'godseye3d' | 'roadmap' | 'streetview';

export interface SpatialCopilotAction {
  replyText: string;
  action: 'flyTo' | 'setMode' | 'toggleLayer' | 'inspect' | 'none';
  targetLocation?: {
    name: string;
    lat: number;
    lon: number;
    zoom?: number;
  };
  mode?: ViewModeType;
  layerToggle?: {
    layer: IntelligenceLayerType;
    enabled: boolean;
  };
  insights?: string;
}

export type EmissionSourceType =
  | 'agricultural_stubble'
  | 'industrial_smokestack'
  | 'garbage_burning'
  | 'construction_dust'
  | 'vehicular_smog'
  | 'brick_kiln';

export interface CitizenEmissionReport {
  id: string;
  timestamp: number;
  sourceType: EmissionSourceType;
  title: string;
  description: string;
  lat: number;
  lon: number;
  locationName: string;
  state: string;
  corridorId?: string;
  imageUrl?: string;
  sensorReadings?: {
    pm25?: number;
    pm10?: number;
    voc?: number;
  };
  aiVerification?: {
    verified: boolean;
    confidenceScore: number;
    severityScore: number; // 1 - 100
    detectedPlumeType: string;
    estimatedPm25Spike: number; // µg/m³
    aiReasoning: string;
  };
  status: 'reported' | 'ai_verified' | 'authority_dispatched' | 'mitigated';
  reportedBy: string;
  authorityNoticeSentTo?: string;
}

export interface EconomicCorridor {
  id: string;
  name: string;
  code: string;
  description: string;
  lengthKm: number;
  statesCovered: string[];
  keyCities: { name: string; lat: number; lon: number; aqi: number }[];
  currentAverageAqi: number;
  predictedAqi24h: number;
  predictedAqi48h: number;
  predictedAqi72h: number;
  dominantPollutant: string;
  grapStage: 'Stage I (Poor)' | 'Stage II (Very Poor)' | 'Stage III (Severe)' | 'Stage IV (Severe+)';
  stubbleBurnRisk: 'Low' | 'Moderate' | 'High' | 'Extreme';
  activeInterventions: string[];
  federatedNodes: {
    state: string;
    leadAgency: string;
    deployedSmogGuns: number;
    mechanizedSweepers: number;
    interStateAlertStatus: 'normal' | 'yellow_alert' | 'red_alert';
  }[];
}

