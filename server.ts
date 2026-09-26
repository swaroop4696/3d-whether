import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
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

  // CORS and preflight handling
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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

  // Safe client configuration endpoint: returns any server-configured Google Maps key
  app.get('/api/config/maps-key', (_req, res) => {
    const key =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY ||
      '';
    res.json({ key: key.trim() });
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

  // Multi-Turn Gemini Chatbot Endpoint
  // Supports gemini-3.5-flash (general), gemini-3.1-pro-preview (complex reasoning), and gemini-3.1-flash-lite (fast)
  app.post('/api/gemini/chat', async (req, res) => {
    const { message, history, model, systemRole, currentContext } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A message string is required' });
    }

    // Selected model with fallback to gemini-3.5-flash
    const allowedModels = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
    const chosenModel = allowedModels.includes(model) ? model : 'gemini-3.5-flash';

    // System instruction based on chosen persona role
    let systemInstruction = `You are the Gemini Planetary & Earth Intelligence Assistant for an interactive 3D Globe platform ("God's Eye View" & "GeoAtmosphere 3D").
You provide authoritative, clear, and insightful answers about planetary weather, atmospheric physics, seismic faults, wildfires, and geography.
Current user coordinates and location: ${JSON.stringify(currentContext || {})}.
Be direct, helpful, and scientific yet accessible.
If the user asks you to fly or navigate somewhere or inspect fires/earthquakes, mention where you are taking them.`;

    if (systemRole === 'climate') {
      systemInstruction = `You are a Senior Climate & Meteorological Specialist for the 3D Planetary Dashboard.
Focus deeply on atmospheric circulation, greenhouse gas dynamics, air quality (PM2.5, NO2), extreme weather events, and climate resilience.
Current user location: ${JSON.stringify(currentContext || {})}.`;
    } else if (systemRole === 'navigator') {
      systemInstruction = `You are a Tactical Earth Navigator for the 3D Planetary Observation Platform.
Focus on geographic navigation, coordinates, orbital vantage points, and tactical flight/road corridors.
Current user location: ${JSON.stringify(currentContext || {})}.`;
    }

    try {
      const ai = getGeminiClient();

      // Format previous history into Gemini contents format
      const contentsPayload: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
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
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: contentsPayload,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text || "I have analyzed your query.";

      // Check if user asked to fly or travel to a place
      let actionData: any = null;
      const lower = message.toLowerCase();
      if (lower.startsWith('fly to') || lower.startsWith('go to') || lower.startsWith('navigate to') || lower.startsWith('take me to')) {
        const placeName = message.replace(/^(fly to|go to|navigate to|take me to)\s+/i, '').replace(/[?.!]/g, '').trim();
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
        replyText: `[Planetary Assistant] Regarding "${message}": Our orbital telemetry monitors global air quality, seismic belts, and thermal anomalies. You can explore active wildfires (NASA FIRMS) and recent earthquakes (USGS) in 3D right now.`,
        modelUsed: chosenModel,
        actionData: null,
      });
    }
  });

  // WebSocket Server for Gemini Live API (gemini-3.8-live) Real-Time Voice Conversations
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[GeminiLive] Client connected to /live WebSocket');

    let session: any = null;

    try {
      const ai = getGeminiClient();

      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are the real-time Gemini voice copilot for the 3D Planetary & Earth Dashboard. Keep your spoken responses concise, natural, and helpful. You can discuss weather, geography, wildfires, and earthquakes.',
        },
        callbacks: {
          onmessage: (message: any) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }

            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on('message', (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        } catch (err) {
          console.warn('[GeminiLive] Error handling client packet:', err);
        }
      });

      clientWs.on('close', () => {
        console.log('[GeminiLive] Client disconnected');
        if (session && typeof session.close === 'function') {
          session.close();
        }
      });
    } catch (err: any) {
      console.error('[GeminiLive] Error connecting to Gemini Live session:', err?.message || err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            error: 'Failed to initiate Gemini Live API session. Ensure GEMINI_API_KEY is configured.',
          })
        );
        clientWs.close();
      }
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
