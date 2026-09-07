import type {
  WeatherData,
  AqiData,
  CitySearchResult,
  WeatherParticleType,
  LocationHierarchy,
  PlaceCategory,
} from '../types';

// Optional custom key provided by user or environment
let customOwmApiKey: string = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

export function setCustomOwmKey(key: string) {
  customOwmApiKey = key.trim();
}

export function getCustomOwmKey(): string {
  return customOwmApiKey;
}

/**
 * Converts wind degrees (0°-360°) to 16-point compass cardinal direction
 */
export function getWindCardinal(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}

/**
 * Reverse geocodes exact coordinates into deep location hierarchy using Nominatim OpenStreetMap API:
 * Street/Road, Building Number, Road Type, Neighbourhood, Suburb, District, City, State, Country, Postal Code
 */
export async function fetchLocationHierarchy(lat: number, lon: number): Promise<LocationHierarchy> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GeoAtmosphere-3D-StreetRoads/3.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const road =
        addr.road ||
        addr.pedestrian ||
        addr.footway ||
        addr.street ||
        addr.path ||
        addr.highway ||
        addr.avenue ||
        addr.boulevard;

      const houseNumber = addr.house_number;
      const roadType = addr.highway || (road ? 'Street / Road' : undefined);
      const neighbourhood = addr.neighbourhood || addr.quarter || addr.subdivision;
      const suburb = addr.suburb || addr.residential || addr.city_district;
      const district = addr.city_district || addr.district || addr.borough || addr.subdistrict || addr.county;
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.hamlet;
      const county = addr.county || addr.state_district;
      const state = addr.state || addr.region || addr.province || addr.state_code;
      const country = addr.country || addr.country_name;
      const countryCode = addr.country_code ? addr.country_code.toUpperCase() : undefined;
      const postcode = addr.postcode;

      let placeType: PlaceCategory = 'city';
      if (road) placeType = 'street';
      else if (district || suburb || neighbourhood) placeType = 'district';
      else if (city) placeType = 'city';

      // Build specific-to-broad hierarchy string
      const roadDisplay = road ? (houseNumber ? `${road} #${houseNumber}` : road) : undefined;
      const districtDisplay = district && district !== city ? district : (suburb || neighbourhood);

      const hierarchyParts = [
        roadDisplay,
        districtDisplay,
        city,
        state && state !== city ? state : undefined,
        country,
      ].filter(Boolean);

      const fullHierarchy = hierarchyParts.length > 0
        ? hierarchyParts.join(', ')
        : data.display_name || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

      return {
        road: roadDisplay,
        houseNumber,
        roadType,
        neighbourhood,
        suburb,
        district,
        city: city || (road ? undefined : district || state),
        county,
        state,
        country,
        countryCode,
        postcode,
        fullHierarchy,
        displayName: data.display_name || fullHierarchy,
        placeType,
      };
    }
  } catch (err) {
    console.warn('[Reverse Geocode] Nominatim query failed:', err);
  }

  // Fallback if ocean or offline
  const isOcean = Math.abs(lat) < 70 && Math.abs(lon) > 170;
  const fallbackDesc = isOcean
    ? 'Maritime Coordinates'
    : `Coordinates ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

  return {
    fullHierarchy: fallbackDesc,
    displayName: fallbackDesc,
    placeType: 'landmark',
  };
}

/**
 * Gets user's current GPS location via navigator.geolocation
 */
export function getCurrentCoordinates(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('[Geolocation] GPS access denied or timed out:', error.message);
        resolve({ lat: 40.7128, lon: -74.006 });
      },
      options
    );
  });
}

/**
 * Maps WMO weather code to standard descriptive condition
 */
function mapWmoCode(code: number): { main: string; desc: string; icon: string } {
  if (code === 0) return { main: 'Clear', desc: 'Clear sky', icon: '01d' };
  if (code === 1) return { main: 'Clear', desc: 'Mainly clear', icon: '02d' };
  if (code === 2) return { main: 'Clouds', desc: 'Partly cloudy', icon: '03d' };
  if (code === 3) return { main: 'Clouds', desc: 'Overcast', icon: '04d' };
  if ([45, 48].includes(code)) return { main: 'Fog', desc: 'Foggy conditions', icon: '50d' };
  if ([51, 53, 55, 56, 57].includes(code)) return { main: 'Drizzle', desc: 'Light drizzle', icon: '09d' };
  if ([61, 63, 65, 66, 67].includes(code)) return { main: 'Rain', desc: 'Precipitation rain', icon: '10d' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { main: 'Snow', desc: 'Snowfall', icon: '13d' };
  if ([80, 81, 82].includes(code)) return { main: 'Rain', desc: 'Heavy shower rain', icon: '09d' };
  if ([95, 96, 99].includes(code)) return { main: 'Thunderstorm', desc: 'Thunderstorm with lightning', icon: '11d' };
  return { main: 'Atmosphere', desc: 'Misty atmospheric haze', icon: '50d' };
}

/**
 * Helper to compute US EPA piecewise sub-index
 */
function calcEpaSubIndex(c: number, bpLow: number, bpHigh: number, iLow: number, iHigh: number): number {
  return Math.round(((iHigh - iLow) / (bpHigh - bpLow)) * (c - bpLow) + iLow);
}

/**
 * Computes official US EPA AQI from PM2.5 (µg/m³)
 */
export function calculateUsAqiFromPm25(pm25: number): number {
  if (pm25 <= 12.0) return calcEpaSubIndex(pm25, 0.0, 12.0, 0, 50);
  if (pm25 <= 35.4) return calcEpaSubIndex(pm25, 12.1, 35.4, 51, 100);
  if (pm25 <= 55.4) return calcEpaSubIndex(pm25, 35.5, 55.4, 101, 150);
  if (pm25 <= 150.4) return calcEpaSubIndex(pm25, 55.5, 150.4, 151, 200);
  if (pm25 <= 250.4) return calcEpaSubIndex(pm25, 150.5, 250.4, 201, 300);
  if (pm25 <= 350.4) return calcEpaSubIndex(pm25, 250.5, 350.4, 301, 400);
  return calcEpaSubIndex(Math.min(pm25, 500.4), 350.5, 500.4, 401, 500);
}

/**
 * Computes comprehensive US EPA AQI, European AQI, Health recommendations, and Roadside impact
 */
export function evaluateAirQuality(
  pm2_5: number,
  pm10: number,
  no2: number,
  co: number,
  so2: number,
  o3: number
): {
  aqi: number;
  usAqi: number;
  label: string;
  color: string;
  description: string;
  healthRecommendation: string;
  outdoorActivityRating: string;
  roadsideTrafficImpact: string;
  dominantPollutant: string;
} {
  // Compute sub-indices
  const aqiPm25 = calculateUsAqiFromPm25(pm2_5);
  
  // PM10 sub-index
  let aqiPm10 = 0;
  if (pm10 <= 54) aqiPm10 = calcEpaSubIndex(pm10, 0, 54, 0, 50);
  else if (pm10 <= 154) aqiPm10 = calcEpaSubIndex(pm10, 55, 154, 51, 100);
  else if (pm10 <= 254) aqiPm10 = calcEpaSubIndex(pm10, 155, 254, 101, 150);
  else if (pm10 <= 354) aqiPm10 = calcEpaSubIndex(pm10, 255, 354, 151, 200);
  else aqiPm10 = calcEpaSubIndex(Math.min(pm10, 504), 355, 504, 201, 300);

  // NO2 traffic sub-index (1-hr in µg/m³)
  let aqiNo2 = 0;
  if (no2 <= 100) aqiNo2 = calcEpaSubIndex(no2, 0, 100, 0, 50);
  else if (no2 <= 188) aqiNo2 = calcEpaSubIndex(no2, 101, 188, 51, 100);
  else if (no2 <= 676) aqiNo2 = calcEpaSubIndex(no2, 189, 676, 101, 150);
  else aqiNo2 = 180;

  // O3 sub-index
  let aqiO3 = 0;
  if (o3 <= 108) aqiO3 = calcEpaSubIndex(o3, 0, 108, 0, 50);
  else if (o3 <= 140) aqiO3 = calcEpaSubIndex(o3, 109, 140, 51, 100);
  else if (o3 <= 170) aqiO3 = calcEpaSubIndex(o3, 141, 170, 101, 150);
  else aqiO3 = 180;

  // Maximum determines the overall US AQI
  const usAqi = Math.max(aqiPm25, aqiPm10, aqiNo2, aqiO3);

  // Find dominant pollutant
  let dominantPollutant = 'PM2.5';
  if (usAqi === aqiNo2 && aqiNo2 > aqiPm25) dominantPollutant = 'NO₂ (Vehicular Traffic)';
  else if (usAqi === aqiO3 && aqiO3 > aqiPm25) dominantPollutant = 'Ozone (O₃)';
  else if (usAqi === aqiPm10 && aqiPm10 > aqiPm25) dominantPollutant = 'PM10 (Dust)';

  // Roadside traffic impact assessment
  let roadsideTrafficImpact = 'Low roadside vehicle emissions. Clean air circulation along streets.';
  if (no2 > 50 || co > 1200) {
    roadsideTrafficImpact = 'Heavy vehicular exhaust and diesel particulate concentration along arterial roads.';
  } else if (no2 > 25 || co > 600) {
    roadsideTrafficImpact = 'Moderate roadside vehicle traffic emissions detected along street corridors.';
  }

  // Determine EPA categories, colors, and health recommendations
  if (usAqi <= 50) {
    return {
      aqi: 1,
      usAqi,
      label: 'Good',
      color: '#10b981', // emerald-500
      description: 'Air quality is satisfactory and poses little or no risk.',
      healthRecommendation: 'Ideal for all outdoor activities, running, cycling, and natural window ventilation.',
      outdoorActivityRating: 'Optimal for Outdoor Exertion',
      roadsideTrafficImpact,
      dominantPollutant,
    };
  }
  if (usAqi <= 100) {
    return {
      aqi: 2,
      usAqi,
      label: 'Moderate',
      color: '#eab308', // yellow-500
      description: 'Air quality is acceptable. A small number of sensitive individuals may experience mild irritation.',
      healthRecommendation: 'Unusually sensitive individuals should reduce prolonged outdoor exertion along busy roadways.',
      outdoorActivityRating: 'Safe for General Public',
      roadsideTrafficImpact,
      dominantPollutant,
    };
  }
  if (usAqi <= 150) {
    return {
      aqi: 3,
      usAqi,
      label: 'Unhealthy for Sensitive Groups',
      color: '#f97316', // orange-500
      description: 'Members of sensitive groups (respiratory, elderly, children) may experience health effects.',
      healthRecommendation: 'Sensitive individuals should wear an N95 mask near high-traffic street corridors.',
      outdoorActivityRating: 'Exercise with Caution',
      roadsideTrafficImpact,
      dominantPollutant,
    };
  }
  if (usAqi <= 200) {
    return {
      aqi: 4,
      usAqi,
      label: 'Unhealthy',
      color: '#ef4444', // red-500
      description: 'Everyone may begin to experience health effects; sensitive groups experience more serious effects.',
      healthRecommendation: 'Avoid prolonged outdoor physical exertion. Keep windows closed and run indoor air filtration.',
      outdoorActivityRating: 'Avoid Strenuous Outdoor Activities',
      roadsideTrafficImpact,
      dominantPollutant,
    };
  }
  if (usAqi <= 300) {
    return {
      aqi: 5,
      usAqi,
      label: 'Very Unhealthy',
      color: '#a855f7', // purple-500
      description: 'Health alert: risk of serious adverse health effects is increased for the entire population.',
      healthRecommendation: 'Stay indoors. Wear high-filtration masks if travelling on roads or public spaces.',
      outdoorActivityRating: 'Hazardous for Outdoor Exercise',
      roadsideTrafficImpact,
      dominantPollutant,
    };
  }
  return {
    aqi: 5,
    usAqi,
    label: 'Hazardous',
    color: '#881337', // rose-900 / maroon
    description: 'Health warning of emergency conditions: the entire population is significantly affected.',
    healthRecommendation: 'Emergency condition: avoid all outdoor exposure. Seal living quarters and run HEPA filters.',
    outdoorActivityRating: 'Stay Indoors',
    roadsideTrafficImpact,
    dominantPollutant,
  };
}

/**
 * Fetches Weather Data using OpenWeatherMap API (with Open-Meteo fallback)
 */
export async function fetchWeatherData(lat: number, lon: number, cityName?: string): Promise<WeatherData> {
  const apiKey = customOwmApiKey;
  const hierarchyPromise = fetchLocationHierarchy(lat, lon);

  if (apiKey) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
      const [response, hierarchy] = await Promise.all([fetch(url), hierarchyPromise]);
      if (response.ok) {
        const data = await response.json();
        const primaryCity = cityName || hierarchy.road || hierarchy.city || data.name || 'Current Location';
        return {
          city: primaryCity,
          country: data.sys?.country || hierarchy.country || '',
          lat: data.coord.lat,
          lon: data.coord.lon,
          temp: Math.round(data.main.temp * 10) / 10,
          feels_like: Math.round(data.main.feels_like * 10) / 10,
          temp_min: Math.round(data.main.temp_min * 10) / 10,
          temp_max: Math.round(data.main.temp_max * 10) / 10,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          wind_speed: Math.round(data.wind.speed * 3.6 * 10) / 10,
          wind_deg: data.wind.deg || 0,
          weather_main: data.weather[0]?.main || 'Clear',
          weather_desc: data.weather[0]?.description || 'Clear sky',
          weather_icon: data.weather[0]?.icon || '01d',
          clouds: data.clouds?.all ?? 15,
          visibility: data.visibility ? Math.round(data.visibility / 1000) : 10,
          sunrise: data.sys?.sunrise,
          sunset: data.sys?.sunset,
          timezone: data.timezone,
          locationHierarchy: hierarchy,
        };
      }
    } catch (err) {
      console.warn('[Weather API] OpenWeatherMap call failed, falling back to Open-Meteo:', err);
    }
  }

  // Live Open-Meteo high-precision forecast (100% keyless & real-time)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const [res, hierarchy] = await Promise.all([fetch(url), hierarchyPromise]);
    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const weatherInfo = mapWmoCode(current.weather_code);

      const resolvedCity = cityName || hierarchy.road || hierarchy.district || hierarchy.city || hierarchy.state || 'Global Station';

      return {
        city: resolvedCity,
        country: hierarchy.country || '',
        lat,
        lon,
        temp: Math.round(current.temperature_2m * 10) / 10,
        feels_like: Math.round(current.apparent_temperature * 10) / 10,
        temp_min: Math.round((data.daily?.temperature_2m_min?.[0] ?? current.temperature_2m - 3) * 10) / 10,
        temp_max: Math.round((data.daily?.temperature_2m_max?.[0] ?? current.temperature_2m + 4) * 10) / 10,
        humidity: current.relative_humidity_2m,
        pressure: Math.round(current.surface_pressure),
        wind_speed: Math.round(current.wind_speed_10m * 10) / 10,
        wind_deg: current.wind_direction_10m,
        weather_main: weatherInfo.main,
        weather_desc: weatherInfo.desc,
        weather_icon: weatherInfo.icon,
        clouds: current.cloud_cover ?? 20,
        visibility: 10,
        locationHierarchy: hierarchy,
      };
    }
  } catch (err) {
    console.error('[Weather API] Open-Meteo fallback error:', err);
  }

  const hierarchy = await hierarchyPromise;
  const tempBase = Math.round((28 - Math.abs(lat) * 0.4) * 10) / 10;
  return {
    city: cityName || hierarchy.road || hierarchy.city || 'Atmosphere Node',
    country: hierarchy.country || '',
    lat,
    lon,
    temp: tempBase,
    feels_like: tempBase - 1,
    temp_min: tempBase - 4,
    temp_max: tempBase + 3,
    humidity: 62,
    pressure: 1014,
    wind_speed: 18.5,
    wind_deg: 215,
    weather_main: 'Clouds',
    weather_desc: 'Scattered stratocumulus',
    weather_icon: '03d',
    clouds: 45,
    visibility: 10,
    locationHierarchy: hierarchy,
  };
}

/**
 * Fetches Full Air Quality (AQI) Data for EVERY location on Earth
 */
export async function fetchAqiData(lat: number, lon: number): Promise<AqiData> {
  const apiKey = customOwmApiKey;

  if (apiKey) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const item = json.list?.[0];
        if (item) {
          const comps = item.components;
          const pm2_5 = Math.round(comps.pm2_5 * 10) / 10;
          const pm10 = Math.round(comps.pm10 * 10) / 10;
          const no2 = Math.round(comps.no2 * 10) / 10;
          const co = Math.round(comps.co * 10) / 10;
          const so2 = Math.round((comps.so2 || 0) * 10) / 10;
          const o3 = Math.round((comps.o3 || 0) * 10) / 10;
          const nh3 = Math.round((comps.nh3 || 0) * 10) / 10;

          const evalResult = evaluateAirQuality(pm2_5, pm10, no2, co, so2, o3);
          return {
            ...evalResult,
            pm2_5,
            pm10,
            no2,
            co,
            so2,
            o3,
            nh3,
          };
        }
      }
    } catch (err) {
      console.warn('[AQI API] OpenWeather AQI fetch error, falling back to Open-Meteo:', err);
    }
  }

  // Open-Meteo Global Air Quality API (Every location on Earth, keyless & real-time)
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const pm2_5 = Math.round((current.pm2_5 ?? 14.2) * 10) / 10;
      const pm10 = Math.round((current.pm10 ?? 26.5) * 10) / 10;
      const no2 = Math.round((current.nitrogen_dioxide ?? 18.4) * 10) / 10;
      const co = Math.round(((current.carbon_monoxide ?? 280) / 1) * 10) / 10;
      const so2 = Math.round((current.sulphur_dioxide ?? 4.1) * 10) / 10;
      const o3 = Math.round((current.ozone ?? 52.8) * 10) / 10;

      const evalResult = evaluateAirQuality(pm2_5, pm10, no2, co, so2, o3);
      if (current.us_aqi && current.us_aqi > 0) {
        evalResult.usAqi = Math.round(current.us_aqi);
      }

      return {
        ...evalResult,
        pm2_5,
        pm10,
        no2,
        co,
        so2,
        o3,
        nh3: 2.1,
      };
    }
  } catch (err) {
    console.error('[AQI API] Fallback error:', err);
  }

  // Baseline evaluation
  const pm2_5 = 16.4;
  const pm10 = 28.1;
  const no2 = 21.6;
  const co = 320.0;
  const so2 = 5.4;
  const o3 = 48.2;
  const evalResult = evaluateAirQuality(pm2_5, pm10, no2, co, so2, o3);

  return {
    ...evalResult,
    pm2_5,
    pm10,
    no2,
    co,
    so2,
    o3,
    nh3: 1.8,
  };
}

/**
 * Searches real streets, roads, districts, cities, and landmarks worldwide using Photon (OSM)
 */
export async function searchLocations(query: string): Promise<CitySearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();

  // 1. Primary: Photon OpenStreetMap Global Geocoding API (Searches streets, districts, roads, places)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=10`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features) && data.features.length > 0) {
        const results: CitySearchResult[] = [];

        for (const f of data.features) {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          let placeType: PlaceCategory = 'city';
          if (p.osm_key === 'highway' || p.type === 'street') placeType = 'street';
          else if (p.osm_key === 'place' && ['suburb', 'quarter', 'neighbourhood', 'district'].includes(p.osm_value)) {
            placeType = 'district';
          } else if (p.osm_key === 'tourism' || p.osm_key === 'amenity' || p.osm_key === 'historic') {
            placeType = 'landmark';
          }

          results.push({
            name: p.name || cleanQuery,
            country: p.country || '',
            admin1: p.state || p.county,
            district: p.district || p.locality,
            road: p.street || (placeType === 'street' ? p.name : undefined),
            postcode: p.postcode,
            type: placeType,
            lat: coords[1],
            lon: coords[0],
          });
        }

        if (results.length > 0) return results;
      }
    }
  } catch (err) {
    console.warn('[Location Search] Photon query error, trying Nominatim fallback:', err);
  }

  // 2. Secondary: OpenStreetMap Nominatim Search
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      cleanQuery
    )}&format=json&addressdetails=1&limit=8`;
    const res = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'GeoAtmosphere-3D-StreetRoads/3.0' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const addr = item.address || {};
          let pType: PlaceCategory = 'city';
          if (addr.road || item.class === 'highway') pType = 'street';
          else if (addr.district || addr.suburb || addr.neighbourhood) pType = 'district';
          else if (item.class === 'tourism' || item.class === 'historic') pType = 'landmark';

          return {
            name: item.name || addr.road || addr.city || cleanQuery,
            country: addr.country || '',
            admin1: addr.state,
            district: addr.city_district || addr.suburb || addr.neighbourhood,
            road: addr.road,
            postcode: addr.postcode,
            type: pType,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        });
      }
    }
  } catch (err) {
    console.warn('[Location Search] Nominatim fallback error:', err);
  }

  // 3. Fallback: Curated famous real streets, districts, and cities
  const PRESETS: CitySearchResult[] = [
    // Real Streets & Roads
    { name: 'Broadway', country: 'United States', admin1: 'New York', district: 'Manhattan', road: 'Broadway', type: 'street', lat: 40.7580, lon: -73.9855 },
    { name: 'Champs-Élysées', country: 'France', admin1: 'Île-de-France', district: '8th Arrondissement', road: 'Avenue des Champs-Élysées', type: 'street', lat: 48.8698, lon: 2.3075 },
    { name: 'Abbey Road', country: 'United Kingdom', admin1: 'England', district: 'Westminster', road: 'Abbey Road', type: 'street', lat: 51.5320, lon: -0.1774 },
    { name: 'Shibuya Dogenzaka', country: 'Japan', admin1: 'Tokyo', district: 'Shibuya', road: 'Dogenzaka', type: 'street', lat: 35.6595, lon: 139.6985 },
    { name: 'Lombard Street', country: 'United States', admin1: 'California', district: 'Russian Hill', road: 'Lombard Street', type: 'street', lat: 37.8021, lon: -122.4187 },
    { name: 'Gran Vía', country: 'Spain', admin1: 'Madrid', district: 'Centro', road: 'Gran Vía', type: 'street', lat: 40.4203, lon: -3.7058 },
    { name: 'Sheikh Zayed Road', country: 'United Arab Emirates', admin1: 'Dubai', district: 'Downtown', road: 'Sheikh Zayed Road', type: 'street', lat: 25.2167, lon: 55.2744 },
    // Real Districts & Quarters
    { name: 'Manhattan', country: 'United States', admin1: 'New York', district: 'New York County', type: 'district', lat: 40.7831, lon: -73.9712 },
    { name: 'Montmartre', country: 'France', admin1: 'Île-de-France', district: '18th Arrondissement', type: 'district', lat: 48.8867, lon: 2.3431 },
    { name: 'Westminster', country: 'United Kingdom', admin1: 'Greater London', district: 'City of Westminster', type: 'district', lat: 51.4975, lon: -0.1357 },
    { name: 'Shinjuku', country: 'Japan', admin1: 'Tokyo', district: 'Shinjuku Ward', type: 'district', lat: 35.6938, lon: 139.7034 },
    { name: 'Beverly Hills', country: 'United States', admin1: 'California', district: 'Los Angeles County', type: 'district', lat: 34.0736, lon: -118.4004 },
    // Megacities
    { name: 'Tokyo', country: 'Japan', admin1: 'Tokyo', type: 'city', lat: 35.6762, lon: 139.6503 },
    { name: 'London', country: 'United Kingdom', admin1: 'England', type: 'city', lat: 51.5074, lon: -0.1278 },
    { name: 'Paris', country: 'France', admin1: 'Île-de-France', type: 'city', lat: 48.8566, lon: 2.3522 },
  ];

  const q = cleanQuery.toLowerCase();
  return PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      (p.road && p.road.toLowerCase().includes(q)) ||
      (p.district && p.district.toLowerCase().includes(q)) ||
      (p.admin1 && p.admin1.toLowerCase().includes(q))
  );
}

// Backward compatibility alias
export const searchCities = searchLocations;

/**
 * Maps weather condition to 3D particle simulation mode
 */
export function getParticleTypeFromWeather(weatherMain: string): WeatherParticleType {
  const main = weatherMain.toLowerCase();
  if (main.includes('rain') || main.includes('drizzle')) return 'rain';
  if (main.includes('snow')) return 'snow';
  if (main.includes('thunder') || main.includes('storm')) return 'thunderstorm';
  if (main.includes('cloud') || main.includes('fog') || main.includes('mist')) return 'clouds';
  if (main.includes('wind')) return 'wind';
  return 'clear';
}
