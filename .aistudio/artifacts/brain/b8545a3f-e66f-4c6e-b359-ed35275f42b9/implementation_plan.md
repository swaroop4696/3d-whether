# 3D Wildfire Combustion & Seismic Tectonic Animation Overhaul

Overhauling visual dynamics across the application: restoring clean, static indicators on the 3D globe to eliminate vibrating jitter, while completely rebuilding the full-screen 3D inspection view with high-fidelity procedural combustion flame tongues, dynamic ember vortexes, molten firebeds, and deep tectonic seismic fault ruptures.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Key Architecture Directives Addressed:**
> 1. **Globe Markers Stability**: Eliminates all vibrating, pulsing, and wobbling scale animations on the 3D globe pins. Globe markers remain stable, clean, and static indicators.
> 2. **3D Inspection View Focus**: Concentrates all visual dynamism exclusively inside the full-screen 3D Inspector (`GodsEye3DView`).
> 3. **Fire & Combustion Overhaul**: Replaces generic sprite dots with fluid flame tongues, multi-tiered combustion cores, realistic convective ember turbulence, and rolling atmospheric smoke plumes.
> 4. **Earthquake Rupture Overhaul**: Replaces chaotic vibrating rings with deep tectonic fissure scarps, strata crust displacement, harmonic P/S compression shockwaves, and bilateral seismic dust plumes.

---

### 1. Overview & Core Concept

* **Stable Global Intel Deck**: The 3D globe presents worldwide active wildfires, seismic epicenters, and live airspace telemetry with crisp, static pins and zero visual jitter.
* **Cinematic 3D Tactical Inspector**: Clicking **"Inspect 3D Wildfire Mesh"** or **"Inspect 3D Earthquake Fault & Epicenter"** opens a dedicated, interactive 3D simulation with photorealistic environmental combustion and seismic physics.
* **Target Experience**: Seamless transition from a clean, quiet planetary overview into visceral, high-impact tactical event simulations.

---

### 2. User Experience & Visual Design

#### Globe Overview (Calm, Static & Clean)
* **Static Wildfire Pins**: High-visibility glowing crimson & amber caldera icons pinned firmly to geospatial coordinates without shaking or rapid resizing.
* **Static Seismic Epicenters**: Clean concentric distance target rings and focal-depth indicators without jitter or vibrating expansion.
* **Smooth Camera Navigation**: Fluid orbital rotation and pinpoint zoom directly into hotspots.

#### 3D Wildfire Combustion Inspector (`GodsEye3DView`)
* **Multi-Layered Volumetric Flame Mesh**:
  * **White-Hot Combustion Core**: Radiant inner core (temperature ~1,400 K) with rapid incandescent flickering.
  * **Fluid Dancing Flame Tongues**: Procedural upward-surging flame tongues tapering with height, driven by turbulent sine noise and wind vector shear.
  * **Molten Charcoal & Smoldering Hearth**: Center depression with incandescent magma cracks, glowing embers, and charred terrain scar.
* **Convective Thermal Embers**:
  * 300 pinpoint incandescent cinders rising in a spiraling thermal updraft chimney, fading as they cool in altitude.
* **Volumetric Atmospheric Smoke**:
  * Rolling, expanding dark smoke billows climbing 400m into the sky with wind shear drift.
* **Dynamic Firelight Illumination**:
  * Dual-frequency warm point lights casting realistic flame flickers across the rolling terrain.

#### 3D Earthquake Tectonic Rupture Inspector (`GodsEye3DView`)
* **Deep Crustal Fissure Scarp**:
  * Topographic rift split with vertical displacement between tectonic plates (strike-slip fault scarp with exposed jagged rocky strata).
* **Branching Fracture Seams**:
  * Jagged crevasse branches radiating outward from the epicenter across the landscape.
* **Harmonic P-Wave & S-Wave Concussions**:
  * Clean, smooth harmonic compression ripples expanding outward from the hypocenter with cosine window fading.
* **Bilateral Seismic Dust Plumes**:
  * Billowing dust clouds erupting radially along the rupture line.
* **Real-Time Seismogram Telemetry**:
  * High-precision USGS waveform recorder with traveling scan needle and live Modified Mercalli / Richter telemetry.

---

### 3. Key Product Decisions & Trade-Offs

* **Decision 1: Static vs Animated Globe Pins**
  * *Chosen Approach*: Static, crisp pins on the 3D globe; dynamic physics exclusively in the 3D inspection view.
  * *Why*: Rapid vibrating circles on the globe caused visual clutter and distracted from geographic navigation. Keeping the globe static delivers a professional command center feel.
* **Decision 2: Procedural Flame Tongues vs Generic Billboard Sprites**
  * *Chosen Approach*: Procedural multi-frequency flame tongues with incandescent cores and convective vortex physics in Three.js.
  * *Why*: Single particle cones look flat and artificial. Multi-layered fluid flame billows deliver the visceral realism seen in modern environmental simulations.
* **Decision 3: Harmonic Tectonic Wavefronts vs Screen Vibration**
  * *Chosen Approach*: Smooth physical wave propagation across the terrain mesh and fissure rather than jarring camera jitter.
  * *Why*: Shaking the camera can cause disorientation. Smooth terrain concussions and fractured rock displacements look far more cinematic and grounded.

---

### 4. Technical Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       ThreeGlobe.tsx                        │
│   (Static, crisp geospatial pins for fires & earthquakes)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Click "Inspect 3D Wildfire / Earthquake"
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     GodsEye3DView.tsx                       │
│                                                             │
│  ┌─────────────────────────┐   ┌──────────────────────────┐ │
│  │   3D WILDFIRE HOTSPOT   │   │  3D EARTHQUAKE EPICENTER │ │
│  │ ─────────────────────── │   │ ──────────────────────── │ │
│  │ • Fluid Flame Tongues   │   │ • Crustal Fault Fissure  │ │
│  │ • Smoldering Hearth Bed │   │ • Branching Fractures    │ │
│  │ • Convective Ember Flow │   │ • Harmonic Wavefronts    │ │
│  │ • Rolling Smoke Plume   │   │ • Radial Dust Eruptions  │ │
│  │ • Turbulent Firelight   │   │ • Seismograph HUD Wave   │ │
│  └─────────────────────────┘   └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Implementation Steps

1. **`ThreeGlobe.tsx` Stabilization**:
   * Remove vibrating scale and opacity oscillations from globe fire and earthquake markers.
   * Lock pins and outer rings to static, crisp scales and opacity for a calm, professional globe view.
2. **`GodsEye3DView.tsx` Wildfire Engine Rebuild**:
   * Build fluid flame tongue geometries with incandescent inner core, orange body, and dark flickering tips.
   * Add glowing molten hearth ground with radiant thermal veins.
   * Calibrate convective thermal ember vortex and rolling smoke plumes with wind direction vectors.
3. **`GodsEye3DView.tsx` Earthquake Engine Rebuild**:
   * Deepen the tectonic fault fissure with vertical plate displacement and exposed strata.
   * Replace chaotic shaking with smooth, continuous P-Wave and S-Wave harmonic ripples.
   * Add radial seismic dust clouds erupting from the epicenter.
4. **Verification & Testing**:
   * Run TypeScript verification and applet build compilation.
   * Test both 3D inspection views and verify static globe stability.
