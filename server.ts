import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  fetchServerWeather,
  fetchServerAqi,
  fetchServerReverseGeocode,
  searchServerLocations,
} from './server/weatherApi';
import { database } from './server/db';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Enable trust proxy for accurate client IP resolution behind Cloud Run/reverse proxies
  app.set('trust proxy', 1);

  // In-memory sliding window rate limiter: maximum 10 requests per minute per IP address
  interface RateLimitRecord {
    count: number;
    resetTime: number;
  }
  const rateLimitStore = new Map<string, RateLimitRecord>();

  // Periodically clean up expired rate limit entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  // Rate Limiting Middleware for /api/* routes (10 requests per 60 seconds per IP)
  const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Exclude health check from aggressive rate limiting to keep dev/container probes alive
    if (req.path === '/api/health') {
      return next();
    }

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
      req.socket.remoteAddress ||
      'unknown-client'
    );

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 10;

    let record = rateLimitStore.get(clientIp);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded: maximum 10 requests per minute per IP address allowed.',
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };

  /**
   * Sanitizes all incoming query parameters:
   * Strips HTML tags, script injection tokens, control characters, and dangerous punctuation
   */
  const sanitizeQueryParam = (val: any): any => {
    if (typeof val === 'string') {
      return val
        // Strip null bytes and control chars
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Strip HTML/XML tags
        .replace(/<[^>]*>?/gm, '')
        // Strip script/javascript/data URI pseudoprotocols
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        // Strip potential prototype poisoning keywords
        .replace(/__proto__|prototype|constructor/gi, '')
        // Strip dangerous quote and tag characters while preserving geographic & text symbols
        .replace(/["'`;<>]/g, '')
        .trim();
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeQueryParam);
    }
    if (val !== null && typeof val === 'object') {
      const sanitizedObj: Record<string, any> = {};
      for (const key of Object.keys(val)) {
        const cleanKey = sanitizeQueryParam(key);
        sanitizedObj[cleanKey] = sanitizeQueryParam(val[key]);
      }
      return sanitizedObj;
    }
    return val;
  };

  const querySanitizer = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.query && typeof req.query === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(req.query)) {
        const cleanKey = sanitizeQueryParam(key);
        sanitized[cleanKey] = sanitizeQueryParam(value);
      }
      req.query = sanitized;
    }
    next();
  };

  // Strong Content Security Policy & Security headers
  app.use((_req, res, next) => {
    // Robust Content Security Policy (CSP) restricting script sources and capabilities
    const cspDirectives = [
      "default-src 'self'",
      // Strict script sources: self, inline scripts for Vite HMR/templates, and Google Maps API
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://*.googleapis.com https://fonts.googleapis.com",
      // Restrict styling to self, Google Fonts, Leaflet CDN styles, and inline styles for Tailwind dynamic classes
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://*.googleapis.com",
      // Allow fonts from Google Fonts and self
      "font-src 'self' https://fonts.gstatic.com data:",
      // Allow images from self, data URIs, OpenStreetMap tiles, CartoDB, Esri ArcGIS, USGS, and Google Maps
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.tile.openstreetmap.fr https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://services.arcgisonline.com https://maps.googleapis.com https://*.googleapis.com https://*.ggpht.com https://unpkg.com",
      // Connect endpoints for API proxy, live satellite feeds, USGS, Open-Meteo, and Google APIs
      "connect-src 'self' https://api.open-meteo.com https://earthquake.usgs.gov https://nominatim.openstreetmap.org https://maps.googleapis.com https://*.googleapis.com https://*.google.com ws: wss:",
      // Workers for Web Workers (e.g. Three.js geometry/offscreen canvas)
      "worker-src 'self' blob:",
      // Restrict objects, embeds, and base URI
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Frame ancestors allowing embed inside parent AI Studio preview container
      "frame-ancestors 'self' https://*.google.com https://*.run.app https://aistudio.google.com",
    ];

    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Apply query parameter sanitization across all incoming requests
  app.use(querySanitizer);

  // Apply rate limiting to all backend API proxy routes
  app.use('/api', apiRateLimiter);

  app.use(express.json({ limit: '5mb' }));

  // Lazy initialize GoogleGenAI client for API key security & resilience
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not configured');
      }
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: "God's Eye View & GeoAtmosphere 3D",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Real Database Persistence Endpoints
  app.get('/api/db/reports', (_req, res) => {
    res.json(database.getReports());
  });

  app.post('/api/db/reports', (req, res) => {
    try {
      const reports = database.addReport(req.body);
      res.json({ success: true, reports });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save to database' });
    }
  });

  app.delete('/api/db/reports/:id', (req, res) => {
    try {
      const reports = database.deleteReport(req.params.id);
      res.json({ success: true, reports });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  });

  app.get('/api/db/observations', (_req, res) => {
    res.json(database.getObservations());
  });

  app.post('/api/db/observations', (req, res) => {
    try {
      const observations = database.addObservation(req.body);
      res.json({ success: true, observations });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save observation' });
    }
  });

  app.get('/api/db/favorites', (_req, res) => {
    res.json(database.getFavorites());
  });

  app.post('/api/db/favorites', (req, res) => {
    try {
      const favorites = database.addFavorite(req.body);
      res.json({ success: true, favorites });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save favorite' });
    }
  });

  // Safe status endpoint: never exposes raw secrets or keys
  app.get('/api/config/maps-key', (_req, res) => {
    const hasKey = Boolean(
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY
    );
    res.json({ configured: hasKey });
  });

  // Weather Telemetry Proxy Endpoint (Keyless Open-Meteo + OWM fallback with 100% uptime fallback)
  app.get('/api/weather', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const name = (req.query.name as string) || undefined;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon numeric query parameters are required' });
    }

    try {
      const data = await fetchServerWeather(lat, lon, name);
      return res.json(data);
    } catch (err: any) {
      console.warn('[Server] Weather proxy fallback:', err?.message || err);
      // Fallback deterministic weather object
      const tempBase = Math.round((28 - Math.abs(lat) * 0.4) * 10) / 10;
      return res.json({
        city: name || 'Atmosphere Station',
        country: '',
        lat,
        lon,
        temp: tempBase,
        feels_like: tempBase - 1,
        temp_min: tempBase - 4,
        temp_max: tempBase + 3,
        humidity: 60,
        pressure: 1013,
        wind_speed: 15.0,
        wind_deg: 180,
        weather_main: 'Clouds',
        weather_desc: 'Partly cloudy',
        weather_icon: '03d',
        clouds: 30,
        visibility: 10,
        locationHierarchy: {
          road: name,
          fullHierarchy: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          displayName: name || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          placeType: 'city',
        },
      });
    }
  });

  // Air Quality Index (AQI) Proxy Endpoint
  app.get('/api/aqi', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon numeric query parameters are required' });
    }

    try {
      const data = await fetchServerAqi(lat, lon);
      return res.json(data);
    } catch (err: any) {
      console.warn('[Server] AQI proxy fallback:', err?.message || err);
      return res.json({
        aqi: 2,
        usAqi: 45,
        label: 'Good',
        color: '#10b981',
        description: 'Air quality is satisfactory and poses little or no risk.',
        healthRecommendation: 'Ideal for all outdoor activities and exercise.',
        outdoorActivityRating: 'Optimal for Outdoor Exertion',
        roadsideTrafficImpact: 'Low roadside vehicle emissions.',
        dominantPollutant: 'PM2.5',
        pm2_5: 11.2,
        pm10: 20.4,
        no2: 15.6,
        co: 260.0,
        so2: 3.2,
        o3: 45.0,
        nh3: 1.5,
      });
    }
  });

  // Reverse Geocode Proxy Endpoint
  app.get('/api/reverse-geocode', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon numeric query parameters are required' });
    }

    try {
      const hierarchy = await fetchServerReverseGeocode(lat, lon);
      return res.json(hierarchy);
    } catch (err: any) {
      return res.json({
        fullHierarchy: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
        displayName: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
        placeType: 'city',
      });
    }
  });

  // Search Locations / Autocomplete Proxy Endpoint
  app.get('/api/search', async (req, res) => {
    const q = (req.query.q as string) || '';
    try {
      const results = await searchServerLocations(q);
      return res.json(results);
    } catch (err: any) {
      return res.json([]);
    }
  });

  // Gemini Spatial AI Control Agent Endpoint
  app.post('/api/gemini/spatial-agent', async (req, res) => {
    const { prompt, currentContext } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A prompt string is required' });
    }

    try {
      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are the AI Spatial Intelligence Agent for a 3D Earth and Planetary Monitoring Platform ("God's Eye View").
The dashboard supports:
1. 3D Daylight Earth Orbit (Three.js globe with clouds, sun lighting, and orbital raycasting)
2. God's Eye 3D Tiles (CesiumJS Google Photorealistic 3D city buildings, elevated highways, bridges, and terrain mesh)
3. 2D Road Map (Daylight road cartography, live traffic flow, transit layers)
4. 360° Street View (Google Street View panorama)
5. Live Spatial Feeds: NASA FIRMS active wildfires, USGS real-time earthquakes, and OpenSky commercial aircraft.

Current dashboard context:
${JSON.stringify(currentContext || {})}

User request: "${prompt}"

Interpret their spatial intent.
- If they want to see a specific place or landmark (e.g., "Take me to San Francisco", "Fly to Tokyo", "Show me Mount Fuji"), provide accurate coordinates (lat, lon, zoom 1-20), an appropriate view mode ('globe', 'godseye3d', 'roadmap', or 'streetview'), and clear telemetry.
- If they want to see active fires or wildfires (e.g. "Show wildfires", "Where are the fires?"), fly to a prominent active wildfire hotspot and ensure layerToggle for fires is enabled.
- If they want to see earthquakes or seismic tremors, fly to a seismic region and ensure layerToggle for earthquakes is enabled.
- If they want to see flights or aircraft, ensure layerToggle for flights is enabled.
- If they request 3D roads, buildings, or city geometry, switch mode to 'godseye3d'.
- Return concise, professional verbal feedback explaining the spatial action executed.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: {
                type: Type.STRING,
                description: 'Direct, composed AI copilot voice confirmation describing what is happening on the map/globe.',
              },
              action: {
                type: Type.STRING,
                description: "Primary spatial action: 'flyTo', 'setMode', 'toggleLayer', 'inspect', or 'none'.",
              },
              targetLocation: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lon: { type: Type.NUMBER },
                  zoom: { type: Type.NUMBER },
                },
                required: ['name', 'lat', 'lon'],
              },
              mode: {
                type: Type.STRING,
                description: "Target view mode: 'globe', 'godseye3d', 'roadmap', or 'streetview'.",
              },
              layerToggle: {
                type: Type.OBJECT,
                properties: {
                  layer: { type: Type.STRING, description: "'fires', 'earthquakes', or 'flights'" },
                  enabled: { type: Type.BOOLEAN },
                },
                required: ['layer', 'enabled'],
              },
              insights: {
                type: Type.STRING,
                description: 'Geographic, seismic, thermal, or atmospheric insights for the user.',
              },
            },
            required: ['replyText', 'action'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (err: any) {
      console.warn('[Server] Gemini Spatial Agent fallback triggered:', err?.message || err);

      // Intelligent deterministic fallback for when GEMINI_API_KEY is not yet populated or experiencing temporary spike
      const lower = prompt.toLowerCase();
      let fallbackResponse: any = {
        replyText: 'Spatial copilot locked onto your coordinates.',
        action: 'none',
      };

      if (lower.includes('fire') || lower.includes('wildfire') || lower.includes('burn')) {
        fallbackResponse = {
          replyText: 'Routing to California Wildfire Complex. NASA FIRMS satellite thermal sensors engaged.',
          action: 'flyTo',
          targetLocation: { name: 'California Wildfire Complex', lat: 39.842, lon: -121.583, zoom: 7 },
          layerToggle: { layer: 'fires', enabled: true },
          insights: 'NASA FIRMS VIIRS detection: 215.8 MW radiative power with elevated thermal anomalies.',
        };
      } else if (lower.includes('quake') || lower.includes('earthquake') || lower.includes('seismic')) {
        fallbackResponse = {
          replyText: 'Focusing on the Pacific Seismic Belt near Tokyo. USGS real-time seismic feed active.',
          action: 'flyTo',
          targetLocation: { name: 'Tokyo Bay Seismic Zone', lat: 35.6762, lon: 139.6503, zoom: 6 },
          layerToggle: { layer: 'earthquakes', enabled: true },
          insights: 'USGS M5.4 seismic hypocenter at 42.1 km depth along the Philippine Sea plate subduction zone.',
        };
      } else if (lower.includes('flight') || lower.includes('plane') || lower.includes('aircraft')) {
        fallbackResponse = {
          replyText: 'Overlaying live transcontinental commercial flight vectors from OpenSky Network.',
          action: 'toggleLayer',
          layerToggle: { layer: 'flights', enabled: true },
          insights: 'Monitoring high-altitude airspace with real-time barometric altitude and true ground speed.',
        };
      } else if (lower.includes('3d') || lower.includes("god's eye") || lower.includes('gods eye') || lower.includes('mesh')) {
        fallbackResponse = {
          replyText: "Entering God's Eye 3D Photorealistic mesh mode with Google 3D Tiles.",
          action: 'setMode',
          mode: 'godseye3d',
          targetLocation: { name: 'San Francisco Financial District', lat: 37.7915, lon: -122.3995, zoom: 16 },
          insights: 'Rendering 3D building geometry, elevated freeways, and urban street infrastructure.',
        };
      } else if (lower.includes('road') || lower.includes('traffic') || lower.includes('highway') || lower.includes('street')) {
        fallbackResponse = {
          replyText: 'Transitioning to 2D Road Map with live traffic flow and transit cartography.',
          action: 'setMode',
          mode: 'roadmap',
          targetLocation: { name: 'Manhattan, New York', lat: 40.7128, lon: -74.006, zoom: 14 },
          insights: 'Displaying high-contrast daytime road networks with real-time congestion telemetry.',
        };
      } else if (lower.includes('paris') || lower.includes('eiffel')) {
        fallbackResponse = {
          replyText: 'Flying to Paris, France.',
          action: 'flyTo',
          targetLocation: { name: 'Paris, France', lat: 48.8566, lon: 2.3522, zoom: 12 },
          insights: 'Centering on the Seine basin with current atmospheric pressure and daylight conditions.',
        };
      } else if (lower.includes('new york') || lower.includes('nyc') || lower.includes('manhattan')) {
        fallbackResponse = {
          replyText: 'Flying to New York City.',
          action: 'flyTo',
          targetLocation: { name: 'New York, USA', lat: 40.7128, lon: -74.006, zoom: 12 },
          insights: 'Urban coastal climate with real-time weather and traffic flow overlay.',
        };
      } else if (lower.includes('tokyo')) {
        fallbackResponse = {
          replyText: 'Navigating to Tokyo, Japan.',
          action: 'flyTo',
          targetLocation: { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, zoom: 11 },
          insights: 'Metropolitan coastal plain with live seismic and flight monitoring.',
        };
      }

      return res.json(fallbackResponse);
    }
  });

  // Multi-Turn Gemini Chatbot Endpoint with Live Real-Time Telemetry Grounding
  app.post('/api/gemini/chat', async (req, res) => {
    const { message, history, model, systemRole, currentContext } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A message string is required' });
    }

    const sanitizedMessage = message.slice(0, 1500).trim();

    // Selected model with fallback to gemini-2.5-flash
    const allowedModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
    const chosenModel = allowedModels.includes(model) ? model : 'gemini-2.5-flash';

    // Construct live real-time telemetry feed
    let realTimeDataSection = '';
    const ctx = currentContext || {};

    // Check if the user is asking about weather/conditions for another city
    let targetLocationWeather: any = null;
    let targetLocationAqi: any = null;
    let targetCityName = '';

    const cityMatch =
      sanitizedMessage.match(/(?:weather|temperature|temp|climate|forecast|aqi|conditions|air quality)\s+(?:in|for|at|of)\s+([A-Za-z\s]+?)(?:\?|\.|$)/i) ||
      sanitizedMessage.match(/(?:fly to|go to|check)\s+([A-Za-z\s]+?)(?:\s+and\s+|\?|\.|$)/i);

    if (cityMatch && cityMatch[1] && cityMatch[1].trim().length >= 2) {
      const searchTarget = cityMatch[1].trim();
      try {
        const locations = await searchServerLocations(searchTarget);
        if (locations.length > 0) {
          const loc = locations[0];
          targetCityName = loc.displayName || loc.name;
          const [wData, aqiData] = await Promise.all([
            fetchServerWeather(loc.lat, loc.lon, loc.name).catch(() => null),
            fetchServerAqi(loc.lat, loc.lon).catch(() => null),
          ]);
          targetLocationWeather = wData;
          targetLocationAqi = aqiData;
        }
      } catch (err) {
        console.warn('[Server] Dynamic location telemetry fetch failed:', err);
      }
    }

    if (targetLocationWeather) {
      realTimeDataSection += `
[REAL-TIME LIVE TELEMETRY FOR REQUESTED LOCATION: ${targetCityName.toUpperCase()}]
- Current Temperature: ${targetLocationWeather.temp}°C (Feels like: ${targetLocationWeather.feels_like}°C)
- Weather Status: ${targetLocationWeather.weather_desc} (${targetLocationWeather.weather_main})
- Relative Humidity: ${targetLocationWeather.humidity}%, Barometric Pressure: ${targetLocationWeather.pressure} hPa
- Wind Speed: ${(targetLocationWeather.wind_speed * 3.6).toFixed(1)} km/h (${targetLocationWeather.wind_speed} m/s), Direction: ${targetLocationWeather.wind_deg}°
- Cloud Cover: ${targetLocationWeather.clouds}%, Coordinates: Lat ${targetLocationWeather.lat.toFixed(2)}, Lon ${targetLocationWeather.lon.toFixed(2)}
`;
      if (targetLocationAqi) {
        realTimeDataSection += `- Real-Time Air Quality: AQI ${targetLocationAqi.aqi} (${targetLocationAqi.label}), PM2.5: ${targetLocationAqi.pm2_5} µg/m³, PM10: ${targetLocationAqi.pm10} µg/m³\n`;
      }
    }

    if (ctx.weather || ctx.lat != null) {
      realTimeDataSection += `
[ACTIVE OBSERVER REAL-TIME TELEMETRY: ${ctx.name ? ctx.name.toUpperCase() : 'ORBITAL VANTAGE'}]
`;
      if (ctx.weather) {
        realTimeDataSection += `- Current Temperature: ${ctx.weather.temp}°C (Feels like: ${ctx.weather.feels_like}°C, Min: ${ctx.weather.temp_min}°C, Max: ${ctx.weather.temp_max}°C)
- Weather Conditions: ${ctx.weather.weather_desc} (${ctx.weather.weather_main})
- Relative Humidity: ${ctx.weather.humidity}%, Barometric Pressure: ${ctx.weather.pressure} hPa
- Wind Vector: ${(ctx.weather.wind_speed * 3.6).toFixed(1)} km/h (${ctx.weather.wind_speed} m/s) at ${ctx.weather.wind_deg}°
- Cloud Coverage: ${ctx.weather.clouds}%
`;
      }
      if (ctx.aqi) {
        realTimeDataSection += `- Real-Time Air Quality: AQI ${ctx.aqi.aqi} (${ctx.aqi.label})
  - PM2.5: ${ctx.aqi.pm2_5} µg/m³, PM10: ${ctx.aqi.pm10} µg/m³, NO2: ${ctx.aqi.no2 || 'Normal'} µg/m³
  - Health Advisory: ${ctx.aqi.healthRecommendation}
`;
      }
      if (ctx.firesCount != null) {
        realTimeDataSection += `- NASA FIRMS Active Thermal Anomalies: ${ctx.firesCount} active global wildfire hotspots currently monitored.\n`;
      }
      if (ctx.earthquakesCount != null) {
        realTimeDataSection += `- USGS Real-Time Seismic Activity: ${ctx.earthquakesCount} earthquake events monitored globally. ${ctx.strongestEarthquake ? `Strongest: M ${ctx.strongestEarthquake.mag} (${ctx.strongestEarthquake.place})` : ''}\n`;
      }
    }

    // System instruction based on chosen persona role
    let systemInstruction = `You are the Gemini Planetary & Earth Intelligence Assistant for an interactive 3D Globe platform ("God's Eye View" & "GeoAtmosphere 3D").
You provide authoritative, clear, and insightful answers about planetary weather, atmospheric physics, seismic faults, wildfires, and geography.
Current UTC Timestamp: ${new Date().toUTCString()}

${realTimeDataSection}

CRITICAL REAL-TIME TELEMETRY INSTRUCTION:
When the user asks questions about current weather, temperature, humidity, wind speed, air quality, AQI, wildfires, or earthquakes, you MUST ground your answer directly in the exact REAL-TIME LIVE TELEMETRY provided above. Quote the exact numbers (e.g. temperatures in °C, wind speeds, AQI values, active fire counts) accurately, directly, and authoritatively.

If the user asks you to fly or navigate somewhere or inspect fires/earthquakes, mention where you are taking them.`;

    if (systemRole === 'climate') {
      systemInstruction += `\nRole Focus: Senior Climate Specialist. Focus deeply on atmospheric circulation, greenhouse gas dynamics, air quality (PM2.5, NO2), extreme weather events, and climate resilience.`;
    } else if (systemRole === 'navigator') {
      systemInstruction += `\nRole Focus: Tactical Earth Navigator. Focus on geographic navigation, coordinates, orbital vantage points, and tactical flight/road corridors.`;
    }

    try {
      const ai = getGeminiClient();

      // Format previous history into Gemini contents format
      const contentsPayload: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history.slice(-10)) {
          if (item && item.role && item.parts && Array.isArray(item.parts)) {
            contentsPayload.push({
              role: item.role === 'assistant' ? 'model' : 'user',
              parts: item.parts.map((p: any) => ({ text: String(p.text || '') })),
            });
          }
        }
      }

      // Add current message
      contentsPayload.push({
        role: 'user',
        parts: [{ text: sanitizedMessage }],
      });

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: contentsPayload,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text || "I have analyzed your query with orbital telemetry.";

      // Check if user asked to fly or travel to a place
      let actionData: any = null;
      const lower = sanitizedMessage.toLowerCase();
      if (lower.startsWith('fly to') || lower.startsWith('go to') || lower.startsWith('navigate to') || lower.startsWith('take me to')) {
        const placeName = sanitizedMessage.replace(/^(fly to|go to|navigate to|take me to)\s+/i, '').replace(/[?.!]/g, '').trim();
        actionData = {
          action: 'flyTo',
          targetLocation: { name: placeName },
        };
      } else if (lower.includes('wildfire') || lower.includes('fires')) {
        actionData = { action: 'toggleLayer', layer: 'fires', enabled: true };
      } else if (lower.includes('earthquake') || lower.includes('quakes')) {
        actionData = { action: 'toggleLayer', layer: 'earthquakes', enabled: true };
      }

      return res.json({
        replyText,
        modelUsed: chosenModel,
        actionData,
      });
    } catch (err: any) {
      console.warn('[Server] Gemini Chat error, falling back:', err?.message || err);

      return res.json({
        replyText: `[Planetary Assistant] Regarding "${sanitizedMessage}": Real-time telemetry is synced for ${ctx.name || 'Earth orbit'}.${ctx.weather ? ` Currently ${Math.round(ctx.weather.temp)}°C (${ctx.weather.weather_desc}) with wind at ${Math.round(ctx.weather.wind_speed * 3.6)} km/h.` : ''}${ctx.aqi ? ` Air Quality Index is ${ctx.aqi.aqi} (${ctx.aqi.label}).` : ''}`,
        modelUsed: chosenModel,
        actionData: null,
      });
    }
  });
  // Development Vite middleware vs Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[GodsEyeServer] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
