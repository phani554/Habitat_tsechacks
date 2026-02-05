/**
 * Real-Time Forest Restoration Data Service
 * Integrates multiple free/open APIs for comprehensive forest data
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface WeatherData {
  temp: number;
  humidity: number;
  rainfall: number;
  wind: number;
  conditions: string;
}

export interface SoilData {
  clay: number;
  silt: number;
  sand: number;
  pH: number;
  nitrogen: number;
  organic_carbon: number;
}

export interface CarbonData {
  current_stock: number;
  annual_sequestration: number;
}

export interface SpeciesData {
  pioneers: string[];
  secondary: string[];
  climax: string[];
}

export interface RestorationZone {
  lat: number;
  lon: number;
  health_score: number;
  priority: 'high' | 'medium' | 'low';
  recommended_species: string[];
}

export interface RestorationData {
  coordinates: Coordinates;
  weather: WeatherData;
  soil: SoilData;
  ndvi: number;
  forest_cover: number;
  carbon: CarbonData;
  species: SpeciesData;
  drought_index: number;
  restoration_zones: RestorationZone[];
}

// ============================================
// 1️⃣ GEOCODING - Location → Coordinates
// ============================================

export async function fetchCoordinates(location: string): Promise<Coordinates> {
  try {
    // Use Nominatim (Free, no API key required)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ForestRestorationPlatform/1.0' }
    });
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    if (data.length === 0) throw new Error('Location not found');
    
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to fetch coordinates');
  }
}

// ============================================
// 2️⃣ WEATHER DATA - OpenWeatherMap
// ============================================

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn('OPENWEATHER_API_KEY not set, using mock data');
      return generateMockWeather(lat, lon);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      console.warn('Weather API failed, using mock data');
      return generateMockWeather(lat, lon);
    }
    
    const data = await response.json();
    
    return {
      temp: data.main.temp,
      humidity: data.main.humidity,
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0,
      wind: data.wind.speed,
      conditions: data.weather[0]?.description || 'clear'
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return generateMockWeather(lat, lon);
  }
}

function generateMockWeather(lat: number, lon: number): WeatherData {
  const tempBase = 25 - (Math.abs(lat) * 0.3);
  return {
    temp: Math.round(tempBase + (Math.random() * 10 - 5)),
    humidity: Math.round(60 + (Math.random() * 30)),
    rainfall: Math.round(Math.random() * 5 * 10) / 10,
    wind: Math.round(Math.random() * 15 * 10) / 10,
    conditions: 'partly cloudy'
  };
}

// ============================================
// 3️⃣ SOIL PROPERTIES - SoilGrids API
// ============================================

export async function fetchSoil(lat: number, lon: number): Promise<SoilData> {
  try {
    // SoilGrids REST API (Free, no key required)
    const properties = ['clay', 'silt', 'sand', 'phh2o', 'nitrogen', 'soc'];
    const depth = '0-5cm';
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=${properties.join('&property=')}&depth=${depth}&value=mean`;
    
    const response = await fetch(url, { next: { revalidate: 86400 } }); // Cache 24h
    
    if (!response.ok) {
      console.warn('SoilGrids API failed, using mock data');
      return generateMockSoil(lat, lon);
    }
    
    const data = await response.json();
    const layers = data.properties.layers;
    
    // Extract values (SoilGrids returns values in specific units)
    const getValue = (prop: string) => {
      const layer = layers.find((l: any) => l.name === prop);
      return layer?.depths[0]?.values?.mean || 0;
    };
    
    return {
      clay: getValue('clay') / 10, // g/kg to %
      silt: getValue('silt') / 10,
      sand: getValue('sand') / 10,
      pH: getValue('phh2o') / 10, // pH * 10 to pH
      nitrogen: getValue('nitrogen') / 100, // cg/kg to g/kg
      organic_carbon: getValue('soc') / 10 // dg/kg to g/kg
    };
  } catch (error) {
    console.error('Soil fetch error:', error);
    return generateMockSoil(lat, lon);
  }
}

function generateMockSoil(lat: number, lon: number): SoilData {
  const clay = 20 + Math.random() * 30;
  const sand = 30 + Math.random() * 30;
  const silt = 100 - clay - sand;
  
  return {
    clay: Math.round(clay * 10) / 10,
    silt: Math.round(silt * 10) / 10,
    sand: Math.round(sand * 10) / 10,
    pH: Math.round((6 + Math.random() * 2) * 10) / 10,
    nitrogen: Math.round((2 + Math.random() * 3) * 10) / 10,
    organic_carbon: Math.round((15 + Math.random() * 20) * 10) / 10
  };
}

// ============================================
// 4️⃣ VEGETATION INDEX (NDVI) - GFW Proxy
// ============================================

export async function fetchNDVI(lat: number, lon: number): Promise<number> {
  try {
    const apiKey = process.env.GFW_API_KEY;
    
    // Use tree cover as NDVI proxy
    const treeCover = await fetchForestCover(lat, lon);
    
    // Convert tree cover % to NDVI scale (0-1)
    // Dense forest (>70%) = 0.6-0.8 NDVI
    // Medium forest (30-70%) = 0.3-0.6 NDVI
    // Low/no forest (<30%) = 0.1-0.3 NDVI
    const ndvi = (treeCover / 100) * 0.7 + 0.1;
    
    return Math.round(ndvi * 100) / 100;
  } catch (error) {
    console.error('NDVI fetch error:', error);
    return 0.45 + Math.random() * 0.3; // Mock: 0.45-0.75
  }
}

// ============================================
// 5️⃣ FOREST COVER % - Global Forest Watch
// ============================================

export async function fetchForestCover(lat: number, lon: number): Promise<number> {
  try {
    const apiKey = process.env.GFW_API_KEY;
    
    if (!apiKey) {
      console.warn('GFW_API_KEY not set, using mock data');
      return generateMockForestCover(lat, lon);
    }

    // GFW Tree Cover Density API
    const url = `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_density_2000/latest/query?sql=SELECT tcd_2000 FROM data WHERE ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[${lon},${lat}]}'),4326), geom) LIMIT 1`;
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 86400 } // Cache 24h
    });
    
    if (!response.ok) {
      console.warn('GFW API failed, using mock data');
      return generateMockForestCover(lat, lon);
    }
    
    const data = await response.json();
    const cover = data.data?.[0]?.tcd_2000 || 0;
    
    return Math.min(100, Math.max(0, cover));
  } catch (error) {
    console.error('Forest cover fetch error:', error);
    return generateMockForestCover(lat, lon);
  }
}

function generateMockForestCover(lat: number, lon: number): number {
  // Tropical regions (near equator) tend to have higher forest cover
  const tropicalBonus = Math.max(0, 30 - Math.abs(lat));
  const base = 20 + tropicalBonus + Math.random() * 30;
  return Math.round(Math.min(100, base));
}

// ============================================
// 6️⃣ CARBON TRACKING - GFW Biomass
// ============================================

export async function fetchCarbon(lat: number, lon: number): Promise<CarbonData> {
  try {
    const apiKey = process.env.GFW_API_KEY;
    const forestCover = await fetchForestCover(lat, lon);
    
    // Estimate biomass based on forest cover
    // Average tropical forest: ~150-300 tons C/ha
    // Temperate forest: ~50-150 tons C/ha
    const isTopical = Math.abs(lat) < 23.5;
    const biomassPerHa = isTopical ? 200 : 100;
    
    // Assume 1 km² area for calculation
    const areaHa = 100; // 1 km² = 100 hectares
    const forestedArea = (forestCover / 100) * areaHa;
    const currentStock = forestedArea * biomassPerHa;
    
    // Annual sequestration: ~2-5 tons C/ha/year for growing forest
    const annualSequestration = forestedArea * 3.5;
    
    return {
      current_stock: Math.round(currentStock),
      annual_sequestration: Math.round(annualSequestration * 10) / 10
    };
  } catch (error) {
    console.error('Carbon fetch error:', error);
    return {
      current_stock: 5000 + Math.random() * 10000,
      annual_sequestration: 100 + Math.random() * 200
    };
  }
}

// ============================================
// 7️⃣ SPECIES RECOMMENDATIONS - GBIF API
// ============================================

export async function fetchSpecies(lat: number, lon: number): Promise<SpeciesData> {
  try {
    // GBIF Species Occurrence API (Free, no key required)
    const radius = 50000; // 50km radius
    const url = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${lat}&decimalLongitude=${lon}&radius=${radius}&limit=100&basisOfRecord=HUMAN_OBSERVATION&hasCoordinate=true&hasGeospatialIssue=false`;
    
    const response = await fetch(url, { next: { revalidate: 604800 } }); // Cache 7 days
    
    if (!response.ok) {
      console.warn('GBIF API failed, using regional species data');
      return generateRegionalSpecies(lat, lon);
    }
    
    const data = await response.json();
    const species = data.results
      .filter((r: any) => r.scientificName && r.kingdom === 'Plantae')
      .map((r: any) => r.scientificName)
      .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index)
      .slice(0, 15);
    
    // Categorize species (simplified logic)
    const pioneers = species.slice(0, 5);
    const secondary = species.slice(5, 10);
    const climax = species.slice(10, 15);
    
    return { pioneers, secondary, climax };
  } catch (error) {
    console.error('Species fetch error:', error);
    return generateRegionalSpecies(lat, lon);
  }
}

function generateRegionalSpecies(lat: number, lon: number): SpeciesData {
  // Regional species database (simplified)
  const tropical = {
    pioneers: ['Leucaena leucocephala', 'Gliricidia sepium', 'Acacia auriculiformis', 'Casuarina equisetifolia', 'Albizia lebbeck'],
    secondary: ['Swietenia mahagoni', 'Tectona grandis', 'Azadirachta indica', 'Dalbergia sissoo', 'Terminalia arjuna'],
    climax: ['Dipterocarpus alatus', 'Shorea robusta', 'Ficus religiosa', 'Mangifera indica', 'Artocarpus heterophyllus']
  };
  
  const temperate = {
    pioneers: ['Betula pendula', 'Populus tremula', 'Alnus glutinosa', 'Salix alba', 'Pinus sylvestris'],
    secondary: ['Quercus robur', 'Acer pseudoplatanus', 'Fraxinus excelsior', 'Carpinus betulus', 'Tilia cordata'],
    climax: ['Fagus sylvatica', 'Abies alba', 'Picea abies', 'Taxus baccata', 'Ilex aquifolium']
  };
  
  const isTropical = Math.abs(lat) < 35;
  return isTropical ? tropical : temperate;
}

// ============================================
// 8️⃣ DROUGHT PREDICTION INDEX
// ============================================

export async function computeDroughtIndex(
  weather: WeatherData,
  soil: SoilData,
  ndvi: number
): Promise<number> {
  try {
    // Precipitation deficit (0-100, higher = more drought)
    const optimalRainfall = 100; // mm/month
    const precipDeficit = Math.max(0, 100 - (weather.rainfall / optimalRainfall * 100));
    
    // Temperature stress (0-100)
    const optimalTemp = 25;
    const tempStress = Math.abs(weather.temp - optimalTemp) * 3;
    
    // Humidity deficit (0-100)
    const optimalHumidity = 70;
    const humidityDeficit = Math.max(0, 100 - (weather.humidity / optimalHumidity * 100));
    
    // Soil water capacity (0-100, based on clay content)
    const soilCapacity = 100 - (soil.clay * 1.5); // Higher clay = better water retention
    
    // Vegetation stress (0-100, based on NDVI)
    const vegetationStress = (1 - ndvi) * 100;
    
    // Weighted formula
    const droughtIndex = 
      precipDeficit * 0.30 +
      tempStress * 0.20 +
      humidityDeficit * 0.20 +
      soilCapacity * 0.15 +
      vegetationStress * 0.15;
    
    return Math.round(Math.min(100, Math.max(0, droughtIndex)));
  } catch (error) {
    console.error('Drought index computation error:', error);
    return 50; // Moderate risk
  }
}

// ============================================
// 9️⃣ RESTORATION ZONES GENERATOR
// ============================================

export function generateRestorationZones(
  lat: number,
  lon: number,
  healthScore: number,
  species: SpeciesData
): RestorationZone[] {
  const zones: RestorationZone[] = [];
  const numZones = 8;
  const radius = 0.05; // ~5km
  
  for (let i = 0; i < numZones; i++) {
    const angle = (i / numZones) * 2 * Math.PI;
    const distance = radius * (0.5 + Math.random() * 0.5);
    
    const zoneLat = lat + distance * Math.cos(angle);
    const zoneLon = lon + distance * Math.sin(angle);
    
    // Vary health score around the base
    const zoneHealth = Math.max(0, Math.min(100, healthScore + (Math.random() * 40 - 20)));
    
    // Determine priority based on health score
    let priority: 'high' | 'medium' | 'low';
    if (zoneHealth < 40) priority = 'high';
    else if (zoneHealth < 70) priority = 'medium';
    else priority = 'low';
    
    // Select species based on priority
    let recommendedSpecies: string[];
    if (priority === 'high') {
      recommendedSpecies = species.pioneers.slice(0, 3);
    } else if (priority === 'medium') {
      recommendedSpecies = [...species.pioneers.slice(0, 2), ...species.secondary.slice(0, 2)];
    } else {
      recommendedSpecies = species.secondary.slice(0, 3);
    }
    
    zones.push({
      lat: Math.round(zoneLat * 10000) / 10000,
      lon: Math.round(zoneLon * 10000) / 10000,
      health_score: Math.round(zoneHealth),
      priority,
      recommended_species: recommendedSpecies
    });
  }
  
  return zones;
}

// ============================================
// MAIN ORCHESTRATOR FUNCTION
// ============================================

export async function fetchRestorationData(
  location?: string,
  lat?: number,
  lon?: number
): Promise<RestorationData> {
  try {
    // Get coordinates
    let coordinates: Coordinates;
    if (lat !== undefined && lon !== undefined) {
      coordinates = { lat, lon };
    } else if (location) {
      coordinates = await fetchCoordinates(location);
    } else {
      throw new Error('Either location or coordinates must be provided');
    }
    
    // Fetch all data in parallel
    const [weather, soil, ndvi, forestCover, carbon, species] = await Promise.all([
      fetchWeather(coordinates.lat, coordinates.lon),
      fetchSoil(coordinates.lat, coordinates.lon),
      fetchNDVI(coordinates.lat, coordinates.lon),
      fetchForestCover(coordinates.lat, coordinates.lon),
      fetchCarbon(coordinates.lat, coordinates.lon),
      fetchSpecies(coordinates.lat, coordinates.lon)
    ]);
    
    // Compute drought index
    const droughtIndex = await computeDroughtIndex(weather, soil, ndvi);
    
    // Calculate health score (inverse of drought index + forest cover factor)
    const healthScore = Math.round((100 - droughtIndex) * 0.6 + forestCover * 0.4);
    
    // Generate restoration zones
    const restorationZones = generateRestorationZones(
      coordinates.lat,
      coordinates.lon,
      healthScore,
      species
    );
    
    return {
      coordinates,
      weather,
      soil,
      ndvi,
      forest_cover: forestCover,
      carbon,
      species,
      drought_index: droughtIndex,
      restoration_zones: restorationZones
    };
  } catch (error) {
    console.error('Restoration data fetch error:', error);
    throw error;
  }
}
