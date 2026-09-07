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
