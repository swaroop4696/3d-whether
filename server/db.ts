import fs from 'fs';
import path from 'path';

export interface DbSchema {
  reports: any[];
  observations: any[];
  favorites: any[];
  lastUpdated: string;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'database.json');

// Initial baseline citizen reports
const SEED_REPORTS = [
  {
    id: 'report-stubble-sangrur',
    timestamp: Date.now() - 1000 * 60 * 35,
    sourceType: 'stubble_burning',
    title: 'Multiple Paddy Straw Stubble Fires Detected in Fields along NH-44',
    description: 'Intense seasonal stubble burning observed across farm parcels; thick particulate smoke drifting southeast toward Patiala.',
    lat: 30.2458,
    lon: 75.8421,
    locationName: 'Sangrur-Dhuri Belt, Punjab',
    state: 'Punjab',
    corridorId: 'corridor-nh44',
    sensorReadings: { pm25: 412, pm10: 680 },
    aiVerification: {
      verified: true,
      confidenceScore: 94,
      severityScore: 92,
      detectedPlumeType: 'Agricultural Biomass Combustion (Cellulose & Potassium Tracer)',
      estimatedPm25Spike: 320,
      aiReasoning: 'Cross-verified with NASA VIIRS 375m thermal infrared sensor active fire hotspots.',
    },
    status: 'authority_dispatched',
    reportedBy: 'Kisan Environmental Vigilance Forum',
    authorityNoticeSentTo: 'Punjab Pollution Control Board (PPCB) Flying Squad',
  },
  {
    id: 'report-industrial-meerut',
    timestamp: Date.now() - 1000 * 60 * 110,
    sourceType: 'industrial_plume',
    title: 'Dense Chemical Smoke & Unfiltered Flue Discharge from Rolling Mill',
    description: 'Black unscrubbed smoke releasing directly into urban atmosphere after dusk; strong acrid sulfur odor.',
    lat: 28.9845,
    lon: 77.7064,
    locationName: 'Partapur Industrial Area, Meerut',
    state: 'Uttar Pradesh',
    corridorId: 'corridor-nh44',
    sensorReadings: { pm25: 360, pm10: 520, so2: 84 },
    aiVerification: {
      verified: true,
      confidenceScore: 91,
      severityScore: 84,
      detectedPlumeType: 'Coal Fly Ash & Sulfur Dioxide Plume',
      estimatedPm25Spike: 280,
      aiReasoning: 'Photographic evidence confirms unscrubbed coal exhaust exceeding opacity standards.',
    },
    status: 'ai_verified',
    reportedBy: 'Meerut Citizen Environmental Cell',
    authorityNoticeSentTo: 'UPPCB Regional Officer Meerut',
  },
];

function initDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      const initial: DbSchema = {
        reports: SEED_REPORTS,
        observations: [],
        favorites: [
          { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
          { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074 },
          { name: 'Brasília', country: 'Brazil', lat: -15.7975, lon: -47.8919 },
          { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
        ],
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      reports: Array.isArray(parsed.reports) ? parsed.reports : SEED_REPORTS,
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Db] Error reading database file, using in-memory state:', err);
    return {
      reports: SEED_REPORTS,
      observations: [],
      favorites: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

let dbMemory: DbSchema = initDb();

function persistDb(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    dbMemory.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(dbMemory, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Db] Failed to persist database:', err);
  }
}

export const database = {
  getReports(): any[] {
    return dbMemory.reports;
  },

  addReport(report: any): any[] {
    const newReport = {
      ...report,
      id: report.id || `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: report.timestamp || Date.now(),
      persistedInDb: true,
    };
    dbMemory.reports = [newReport, ...dbMemory.reports];
    persistDb();
    return dbMemory.reports;
  },

  deleteReport(id: string): any[] {
    dbMemory.reports = dbMemory.reports.filter((r) => r.id !== id);
    persistDb();
    return dbMemory.reports;
  },

  getObservations(): any[] {
    return dbMemory.observations;
  },

  addObservation(obs: any): any[] {
    const newObs = {
      ...obs,
      id: `obs-${Date.now()}`,
      timestamp: Date.now(),
    };
    dbMemory.observations = [newObs, ...dbMemory.observations.slice(0, 99)];
    persistDb();
    return dbMemory.observations;
  },

  getFavorites(): any[] {
    return dbMemory.favorites;
  },

  addFavorite(fav: any): any[] {
    if (!dbMemory.favorites.some((f) => f.name === fav.name)) {
      dbMemory.favorites = [fav, ...dbMemory.favorites];
      persistDb();
    }
    return dbMemory.favorites;
  },
};
