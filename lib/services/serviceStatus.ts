/**
 * Service Status Tracker
 * Centralized tracking of API service availability
 */

export interface ServiceStatus {
  name: string
  configured: boolean
  lastCheck?: Date
  lastError?: string
}

export interface AllServicesStatus {
  openWeather: ServiceStatus
  globalForestWatch: ServiceStatus
  sentinelHub: ServiceStatus
  soilGrids: ServiceStatus
  gbif: ServiceStatus
}

// Check which services have API keys configured
export function getConfiguredServices(): AllServicesStatus {
  return {
    openWeather: {
      name: 'OpenWeather',
      configured: !!process.env.OPENWEATHER_API_KEY,
    },
    globalForestWatch: {
      name: 'Global Forest Watch',
      configured: !!process.env.GFW_API_KEY,
    },
    sentinelHub: {
      name: 'Sentinel Hub',
      configured: !!(process.env.SENTINELHUB_CLIENT_ID && process.env.SENTINELHUB_CLIENT_SECRET),
    },
    soilGrids: {
      name: 'SoilGrids (ISRIC)',
      configured: true, // No API key required
    },
    gbif: {
      name: 'GBIF Species',
      configured: true, // No API key required
    },
  }
}

// Get list of unconfigured services
export function getUnconfiguredServices(): string[] {
  const status = getConfiguredServices()
  return Object.entries(status)
    .filter(([_, service]) => !service.configured)
    .map(([_, service]) => service.name)
}

// Get summary message about data sources
export function getDataSourceSummary(): { 
  usingRealData: string[]
  usingMockData: string[] 
  message: string 
} {
  const status = getConfiguredServices()
  
  const usingRealData: string[] = []
  const usingMockData: string[] = []
  
  if (status.openWeather.configured) {
    usingRealData.push('Weather (OpenWeather)')
  } else {
    usingMockData.push('Weather')
  }
  
  if (status.globalForestWatch.configured) {
    usingRealData.push('Forest Cover (GFW)')
    usingRealData.push('Deforestation Alerts (GFW)')
  } else {
    usingMockData.push('Forest Cover')
    usingMockData.push('Deforestation Alerts')
  }
  
  if (status.sentinelHub.configured) {
    usingRealData.push('NDVI/Satellite (Sentinel Hub)')
  } else {
    usingMockData.push('NDVI/Satellite')
  }
  
  // These are always real (free APIs)
  usingRealData.push('Soil Data (SoilGrids)')
  usingRealData.push('Species Data (GBIF)')
  
  let message = ''
  if (usingMockData.length === 0) {
    message = 'All services using real data'
  } else if (usingRealData.length === 0) {
    message = 'Using simulated data - configure API keys for real data'
  } else {
    message = `Real data: ${usingRealData.length} services | Mock data: ${usingMockData.length} services`
  }
  
  return { usingRealData, usingMockData, message }
}
