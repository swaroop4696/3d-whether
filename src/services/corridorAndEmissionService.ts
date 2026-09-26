import type { CitizenEmissionReport, EconomicCorridor, EmissionSourceType } from '../types';

export const INDIAN_ECONOMIC_CORRIDORS: EconomicCorridor[] = [
  {
    id: 'corridor-nh44',
    name: 'Indo-Gangetic Plain Agri-Industrial Corridor (NH-44)',
    code: 'NH-44 IGP',
    description:
      'Critical agricultural & economic spine running from Punjab/Haryana through Delhi-NCR to Eastern UP. Highly vulnerable to seasonal crop residue stubble burning & thermal power plumes.',
    lengthKm: 980,
    statesCovered: ['Punjab', 'Haryana', 'Delhi', 'Uttar Pradesh'],
    keyCities: [
      { name: 'Amritsar', lat: 31.634, lon: 74.8723, aqi: 242 },
      { name: 'Ludhiana', lat: 30.901, lon: 75.8573, aqi: 318 },
      { name: 'Karnal', lat: 29.6857, lon: 76.9905, aqi: 365 },
      { name: 'Delhi', lat: 28.6139, lon: 77.209, aqi: 412 },
      { name: 'Agra', lat: 27.1767, lon: 78.0081, aqi: 335 },
      { name: 'Kanpur', lat: 26.4499, lon: 80.3319, aqi: 358 },
    ],
    currentAverageAqi: 338,
    predictedAqi24h: 385,
    predictedAqi48h: 420,
    predictedAqi72h: 445,
    dominantPollutant: 'PM2.5 (Organic Carbon / Black Carbon from Biomass)',
    grapStage: 'Stage III (Severe)',
    stubbleBurnRisk: 'Extreme',
    activeInterventions: [
      'Ban on non-essential C&D construction activities',
      'Continuous mechanized road vacuuming with water sprinklers',
      'Ban on diesel generator sets (>19kW non-retroaligned)',
      'Inter-state stubble burning monitoring taskforces active',
    ],
    federatedNodes: [
      {
        state: 'Punjab',
        leadAgency: 'PPCB (Punjab Pollution Control Board)',
        deployedSmogGuns: 48,
        mechanizedSweepers: 32,
        interStateAlertStatus: 'red_alert',
      },
      {
        state: 'Haryana',
        leadAgency: 'HSPCB (Haryana State Pollution Control Board)',
        deployedSmogGuns: 64,
        mechanizedSweepers: 52,
        interStateAlertStatus: 'red_alert',
      },
      {
        state: 'Delhi',
        leadAgency: 'DPCC (Delhi Pollution Control Committee)',
        deployedSmogGuns: 120,
        mechanizedSweepers: 96,
        interStateAlertStatus: 'red_alert',
      },
      {
        state: 'Uttar Pradesh',
        leadAgency: 'UPPCB (UP Pollution Control Board)',
        deployedSmogGuns: 55,
        mechanizedSweepers: 40,
        interStateAlertStatus: 'yellow_alert',
      },
    ],
  },
  {
    id: 'corridor-ncr-ring',
    name: 'Delhi-NCR Industrial & Urban Beltway (KMP Expressway)',
    code: 'NCR-RING',
    description:
      'High-density freight, manufacturing & warehousing loop connecting Gurugram, Manesar, Noida, Greater Noida, Ghaziabad, and Sonipat.',
    lengthKm: 270,
    statesCovered: ['Delhi', 'Haryana', 'Uttar Pradesh'],
    keyCities: [
      { name: 'Gurugram', lat: 28.4595, lon: 77.0266, aqi: 382 },
      { name: 'Manesar', lat: 28.3537, lon: 76.9406, aqi: 395 },
      { name: 'Noida', lat: 28.5355, lon: 77.391, aqi: 410 },
      { name: 'Greater Noida', lat: 28.4744, lon: 77.504, aqi: 425 },
      { name: 'Ghaziabad', lat: 28.6692, lon: 77.4538, aqi: 438 },
      { name: 'Faridabad', lat: 28.4089, lon: 77.3178, aqi: 375 },
    ],
    currentAverageAqi: 404,
    predictedAqi24h: 432,
    predictedAqi48h: 460,
    predictedAqi72h: 415,
    dominantPollutant: 'PM2.5 & NO2 (Vehicular Diesel & Industrial Flue)',
    grapStage: 'Stage IV (Severe+)',
    stubbleBurnRisk: 'High',
    activeInterventions: [
      'Strict entry ban on non-essential diesel trucks (BS-IV and below)',
      '50% Work-from-Home advisory for government and private offices',
      'Total halt on all earthwork, demolition, and batching plants',
      'Round-the-clock anti-smog water cannons stationed at Anand Vihar & Ghaziabad',
    ],
    federatedNodes: [
      {
        state: 'Delhi',
        leadAgency: 'DPCC Task Force',
        deployedSmogGuns: 140,
        mechanizedSweepers: 110,
        interStateAlertStatus: 'red_alert',
      },
      {
        state: 'Haryana',
        leadAgency: 'Gurugram Metropolitan Development Authority',
        deployedSmogGuns: 72,
        mechanizedSweepers: 58,
        interStateAlertStatus: 'red_alert',
      },
      {
        state: 'Uttar Pradesh',
        leadAgency: 'Ghaziabad Nagar Nigam & NOIDA Authority',
        deployedSmogGuns: 80,
        mechanizedSweepers: 62,
        interStateAlertStatus: 'red_alert',
      },
    ],
  },
  {
    id: 'corridor-dmic',
    name: 'Western Dedicated Freight & Expressway Corridor (DMIC)',
    code: 'DMIC-WDFC',
    description:
      'India’s premier multimodal trade artery linking the National Capital Region with maritime container ports across Rajasthan, Gujarat, and Maharashtra.',
    lengthKm: 1483,
    statesCovered: ['Delhi', 'Rajasthan', 'Gujarat', 'Maharashtra'],
    keyCities: [
      { name: 'Jaipur', lat: 26.9124, lon: 75.7873, aqi: 215 },
      { name: 'Ajmer', lat: 26.4499, lon: 74.6399, aqi: 195 },
      { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, aqi: 285 },
      { name: 'Vadodara', lat: 22.3072, lon: 73.1812, aqi: 268 },
      { name: 'Surat', lat: 21.1702, lon: 72.8311, aqi: 245 },
      { name: 'Mumbai', lat: 19.076, lon: 72.8777, aqi: 230 },
    ],
    currentAverageAqi: 239,
    predictedAqi24h: 265,
    predictedAqi48h: 290,
    predictedAqi72h: 275,
    dominantPollutant: 'PM10 & SO2 (Petrochemical & Textile Processing Emissions)',
    grapStage: 'Stage I (Poor)',
    stubbleBurnRisk: 'Low',
    activeInterventions: [
      'Mandatory continuous emission monitoring systems (CEMS) on industrial boilers',
      'Dust barriers along highway construction segments',
      'Port freight EV drayage incentive program',
    ],
    federatedNodes: [
      {
        state: 'Gujarat',
        leadAgency: 'GPCB (Gujarat Pollution Control Board)',
        deployedSmogGuns: 60,
        mechanizedSweepers: 45,
        interStateAlertStatus: 'yellow_alert',
      },
      {
        state: 'Maharashtra',
        leadAgency: 'MPCB (Maharashtra Pollution Control Board)',
        deployedSmogGuns: 85,
        mechanizedSweepers: 70,
        interStateAlertStatus: 'yellow_alert',
      },
    ],
  },
  {
    id: 'corridor-mumbai-pune-blr',
    name: 'NH-48 Western Tech & Industrial Corridor',
    code: 'NH-48 WTIC',
    description:
      'Heavy manufacturing, automotive clusters, and biotechnology hubs spanning Mumbai, Pune, Satara, Kolhapur, and Bengaluru.',
    lengthKm: 980,
    statesCovered: ['Maharashtra', 'Karnataka'],
    keyCities: [
      { name: 'Navi Mumbai', lat: 19.033, lon: 73.0297, aqi: 245 },
      { name: 'Pune', lat: 18.5204, lon: 73.8567, aqi: 210 },
      { name: 'Kolhapur', lat: 16.705, lon: 74.2433, aqi: 155 },
      { name: 'Belagavi', lat: 15.8497, lon: 74.4977, aqi: 135 },
      { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, aqi: 185 },
    ],
    currentAverageAqi: 186,
    predictedAqi24h: 205,
    predictedAqi48h: 220,
    predictedAqi72h: 190,
    dominantPollutant: 'PM2.5 & Ozone (Urban Photochemical Smog)',
    grapStage: 'Stage I (Poor)',
    stubbleBurnRisk: 'Low',
    activeInterventions: [
      'Traffic synchronization along expressway choke points',
      'Green buffer zones mandated around Chakan & Bhosari auto parks',
    ],
    federatedNodes: [
      {
        state: 'Maharashtra',
        leadAgency: 'MPCB Pune Division',
        deployedSmogGuns: 40,
        mechanizedSweepers: 35,
        interStateAlertStatus: 'normal',
      },
      {
        state: 'Karnataka',
        leadAgency: 'KSPCB Bengaluru Head Office',
        deployedSmogGuns: 55,
        mechanizedSweepers: 45,
        interStateAlertStatus: 'normal',
      },
    ],
  },
];

export const INITIAL_CITIZEN_REPORTS: CitizenEmissionReport[] = [
  {
    id: 'report-punjab-01',
    timestamp: Date.now() - 1000 * 60 * 35, // 35 min ago
    sourceType: 'agricultural_stubble',
    title: 'Severe Paddy Straw Fire Plume along NH-7',
    description:
      'Large-scale field burning across 12 acres producing heavy dark smoke drifting south-southeast towards Sangrur and Patiala highway.',
    lat: 30.2458,
    lon: 75.8421,
    locationName: 'Near Dhuri, Sangrur District',
    state: 'Punjab',
    corridorId: 'corridor-nh44',
    imageUrl:
      'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=800&q=80',
    sensorReadings: {
      pm25: 480,
      pm10: 620,
      voc: 18.5,
    },
    aiVerification: {
      verified: true,
      confidenceScore: 96,
      severityScore: 92,
      detectedPlumeType: 'Dense Organic Biomass Smoke (Cellulose & Black Carbon)',
      estimatedPm25Spike: 380,
      aiReasoning:
        'Thermal signature corroborated by NASA VIIRS satellite anomaly (FRP 42.8 MW). Visual analysis exhibits high-opacity convective plume with downwind dispersion along prevailing 14 km/h NW wind vector.',
    },
    status: 'authority_dispatched',
    reportedBy: 'Kisan Climate Watch (Community Sensor #PB-104)',
    authorityNoticeSentTo: 'Punjab Pollution Control Board (PPCB) Field Taskforce & District Magistrate Sangrur',
  },
  {
    id: 'report-delhi-ghazipur',
    timestamp: Date.now() - 1000 * 60 * 85, // 85 min ago
    sourceType: 'garbage_burning',
    title: 'Methane Flare & Municipal Waste Incineration',
    description:
      'Open burning on the eastern flank of Ghazipur border with strong pungent odor affecting Indirapuram and East Delhi.',
    lat: 28.6234,
    lon: 77.3298,
    locationName: 'Ghazipur Waste Mound, East Delhi Border',
    state: 'Delhi',
    corridorId: 'corridor-ncr-ring',
    imageUrl:
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    sensorReadings: {
      pm25: 540,
      pm10: 710,
      voc: 42.0,
    },
    aiVerification: {
      verified: true,
      confidenceScore: 98,
      severityScore: 95,
      detectedPlumeType: 'Hazardous Municipal Solid Waste Combustion (Chlorinated Dioxins & VOCs)',
      estimatedPm25Spike: 420,
      aiReasoning:
        'Optical sensor readings show dangerous VOC spikes exceeding safe thresholds by 8.4x. Rapid thermal dispersion confirmed towards NH-24 commuters.',
    },
    status: 'authority_dispatched',
    reportedBy: 'Delhi Clean Air Youth Collective',
    authorityNoticeSentTo: 'DPCC Emergency Action Cell & Municipal Corporation of Delhi (MCD)',
  },
  {
    id: 'report-up-kiln',
    timestamp: Date.now() - 1000 * 60 * 150, // 2.5 hrs ago
    sourceType: 'brick_kiln',
    title: 'Unregistered FCBTK Brick Kiln Dense Black Flue',
    description:
      'Operating without zig-zag induced draft technology during prohibited night hours; continuous thick coal flue blanketing agricultural fields.',
    lat: 28.9845,
    lon: 77.7064,
    locationName: 'Daurala Rural Cluster, Meerut',
    state: 'Uttar Pradesh',
    corridorId: 'corridor-nh44',
    imageUrl:
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    sensorReadings: {
      pm25: 390,
      pm10: 520,
      voc: 14.2,
    },
    aiVerification: {
      verified: true,
      confidenceScore: 91,
      severityScore: 84,
      detectedPlumeType: 'Coal Fly Ash & Sulfur Dioxide Plume',
      estimatedPm25Spike: 280,
      aiReasoning:
        'Photographic evidence confirms unscrubbed coal exhaust exceeding opacity standards (>Ringelmann 3). Plume intersects Delhi-Meerut Expressway corridor.',
    },
    status: 'ai_verified',
    reportedBy: 'Meerut Citizen Environmental Cell',
    authorityNoticeSentTo: 'UPPCB Regional Officer Meerut',
  },
  {
    id: 'report-haryana-const',
    timestamp: Date.now() - 1000 * 60 * 240, // 4 hrs ago
    sourceType: 'construction_dust',
    title: 'Uncovered Earth Excavation & Fugitive Dust on Sector 84 Bypass',
    description:
      'Massive construction site failing dust suppression protocols; no water mist cannons active during dry windy conditions.',
    lat: 28.4089,
    lon: 76.9688,
    locationName: 'Sector 84, Dwarka Expressway Link, Gurugram',
    state: 'Haryana',
    corridorId: 'corridor-ncr-ring',
    imageUrl:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    sensorReadings: {
      pm25: 280,
      pm10: 640,
    },
    aiVerification: {
      verified: true,
      confidenceScore: 88,
      severityScore: 76,
      detectedPlumeType: 'Fugitive Coarse Mineral Dust (Silica / PM10)',
      estimatedPm25Spike: 190,
      aiReasoning:
        'Pronounced ratio of PM10 to PM2.5 (2.3:1) characteristic of unpaved vehicular agitation and dry aggregate batching in violation of GRAP Stage III directives.',
    },
    status: 'mitigated',
    reportedBy: 'Gurugram Resident Welfare Association',
    authorityNoticeSentTo: 'GMDA Enforcement Wing',
  },
];

const STORAGE_KEY_CITIZEN_REPORTS = 'geoatmosphere_citizen_reports_v1';

export function getStoredCitizenReports(): CitizenEmissionReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CITIZEN_REPORTS);
    if (!raw) return INITIAL_CITIZEN_REPORTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CITIZEN_REPORTS;
  } catch {
    return INITIAL_CITIZEN_REPORTS;
  }
}

export async function fetchServerDbReports(): Promise<CitizenEmissionReport[]> {
  try {
    const res = await fetch('/api/db/reports', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const serverReports = await res.json();
      if (Array.isArray(serverReports) && serverReports.length > 0) {
        saveCitizenReports(serverReports);
        return serverReports;
      }
    }
  } catch (err) {
    console.warn('[DbService] Fetch server database reports notice:', err);
  }
  return getStoredCitizenReports();
}

export function saveCitizenReports(reports: CitizenEmissionReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CITIZEN_REPORTS, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to save citizen reports to local storage:', err);
  }
}

export function addCitizenReport(report: CitizenEmissionReport): CitizenEmissionReport[] {
  const existing = getStoredCitizenReports();
  const updated = [report, ...existing];
  saveCitizenReports(updated);

  // Asynchronously persist to real database
  fetch('/api/db/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  }).catch((err) => {
    console.warn('[DbService] Real database sync background notice:', err);
  });

  return updated;
}

