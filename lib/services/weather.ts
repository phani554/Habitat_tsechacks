/**
 * Weather Service - OpenWeatherMap API
 * With graceful fallback for development/missing API keys
 */

export interface WeatherData {
  temp: number;
  humidity: number;
  rainfall: number;
  wind: number;
  conditions: string;
  pressure: number;
  visibility: number;
}

// Fallback data based on typical tropical/temperate conditions
function getFallbackWeather(lat: number): WeatherData {
  // Adjust temperature based on latitude (tropical vs temperate)
  const isTropical = Math.abs(lat) < 23.5
  const baseTemp = isTropical ? 28 : 20
  
  return {
    temp: baseTemp + (Math.random() - 0.5) * 8,
    humidity: 60 + Math.random() * 30,
    rainfall: Math.random() * 5,
    wind: 5 + Math.random() * 10,
    conditions: 'partly cloudy',
    pressure: 1010 + Math.random() * 20,
    visibility: 10
  }
}

export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.warn('OPENWEATHER_API_KEY not configured, using fallback weather data');
    return getFallbackWeather(lat);
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!response.ok) {
      console.warn(`OpenWeather API returned ${response.status}, using fallback`);
      return getFallbackWeather(lat);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0,
      wind: Math.round(data.wind.speed * 10) / 10,
      conditions: data.weather[0]?.description || 'unknown',
      pressure: data.main.pressure,
      visibility: data.visibility / 1000 // Convert to km
    };
  } catch (error) {
    console.warn('Weather API fetch failed, using fallback:', error);
    return getFallbackWeather(lat);
  }
}
