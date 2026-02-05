/**
 * Environment Variables Configuration
 * Centralized access to all environment variables with type safety
 */

export const env = {
  // Server Configuration
  port: process.env.PORT || '5000',
  nodeEnv: process.env.NODE_ENV || 'development',

  // API Keys
  openWeatherApiKey: process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY || '',
  
  // Sentinel Hub
  sentinelHubClientId: process.env.SENTINELHUB_CLIENT_ID || '',
  sentinelHubClientSecret: process.env.SENTINELHUB_CLIENT_SECRET || '',
  
  // Global Forest Watch
  gfwApiKey: process.env.GFW_API_KEY || '',
  
  // NASA Earthdata
  ndviToken: process.env.NDVI_TOKEN || '',
  nasaUsername: process.env.NASA_EARTHDATA_USERNAME || '',
  nasaPassword: process.env.NASA_EARTHDATA_PASSWORD || '',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Cache Settings
  cacheDuration: parseInt(process.env.CACHE_DURATION || '3600'),
} as const;

// Validation helper
export function validateEnv() {
  const required = {
    openWeatherApiKey: env.openWeatherApiKey,
    sentinelHubClientId: env.sentinelHubClientId,
    sentinelHubClientSecret: env.sentinelHubClientSecret,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
  }

  return missing.length === 0;
}
