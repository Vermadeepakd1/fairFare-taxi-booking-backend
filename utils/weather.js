const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch current weather data for a given location
 * @param {number} latitude - Latitude of the location
 * @param {number} longitude - Longitude of the location
 * @returns {Promise<Object>} - Object with current weather data
 */
export async function getCurrentWeather(latitude, longitude) {
  try {
    // Open-Meteo API endpoint for current weather
    const url = `${OPEN_METEO_BASE_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.current) {
      throw new Error('Invalid response from Open-Meteo API');
    }
    
    const current = data.current;
    
    // Map weather codes to descriptions (WMO Weather interpretation codes)
    const weatherCodeMap = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    
    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      weatherCode: current.weather_code,
      weatherDescription: weatherCodeMap[current.weather_code] || 'Unknown',
      windSpeed: current.wind_speed_10m,
      precipitation: current.precipitation || 0,
      time: current.time,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

/**
 * Get weather conditions that might affect pricing
 * Returns descriptive weather condition for ML model
 * @param {Object} weatherData - Weather data from getCurrentWeather
 * @returns {string} - Weather condition category
 */
export function getWeatherCondition(weatherData) {
  const { weatherCode, precipitation, windSpeed } = weatherData;
  
  // Thunderstorms (highest priority)
  if ([95, 96, 99].includes(weatherCode)) {
    return 'stormy';
  }
  
  // Heavy rain or violent rain showers
  if (precipitation > 5 || [65, 67, 82].includes(weatherCode)) {
    return 'rainy';
  }
  
  // Heavy snow
  if ([75, 77, 86].includes(weatherCode)) {
    return 'snowy';
  }
  
  // Moderate rain or rain showers
  if (precipitation > 1 || [61, 63, 66, 80, 81].includes(weatherCode)) {
    return 'rainy';
  }
  
  // Moderate snow or snow showers
  if ([71, 73, 85].includes(weatherCode)) {
    return 'snowy';
  }
  
  // Light drizzle or rain
  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return 'rainy';
  }
  
  // High wind (only if no precipitation)
  if (windSpeed > 15 && precipitation === 0) {
    return 'windy';
  }
  
  // Foggy conditions
  if ([45, 48].includes(weatherCode)) {
    return 'foggy';
  }
  
  // Overcast
  if (weatherCode === 3) {
    return 'cloudy';
  }
  
  // Partly cloudy
  if (weatherCode === 2) {
    return 'cloudy';
  }
  
  // Clear or mainly clear
  return 'clear';
}

