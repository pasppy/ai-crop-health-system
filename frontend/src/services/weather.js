// Zero-cost live weather service using the free, open-source Open-Meteo meteorological API
// No API keys, no tokens, and no paid subscriptions required.

const CACHE_KEY = 'ricevision_live_weather_cache';
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15-minute cache

export async function fetchAgriculturalWeather(lat = 25.0108, lon = 88.1411, locationName = 'Malda, West Bengal') {
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
        return parsed.data;
      }
    }
  } catch (e) {}

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });

    if (res.ok) {
      const json = await res.json();
      const current = json.current;

      const weatherCodes = {
        0: 'Clear Sky',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        51: 'Light Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Monsoon Rain',
        80: 'Rain Showers',
        95: 'Thunderstorm'
      };

      const weatherCondition = weatherCodes[current.weather_code] || 'Partly Cloudy';
      const temp = Math.round(current.temperature_2m);
      const humidity = Math.round(current.relative_humidity_2m);
      const rain = current.precipitation;
      const wind = Math.round(current.wind_speed_10m);

      let cropAdvice = 'Conditions favorable for paddy vegetative development.';
      if (humidity > 80 && temp > 26) {
        cropAdvice = 'High humidity & warmth favor Bacterial Blight & Blast spore spread. Monitor foliage closely.';
      } else if (rain > 15) {
        cropAdvice = 'Heavy rainfall. Ensure bund drainage to prevent submergence in non-tolerant cultivars.';
      }

      const weatherData = {
        location: locationName,
        temperature: `${temp}°C`,
        condition: weatherCondition,
        humidity: `${humidity}%`,
        rainfall: `${rain} mm`,
        windSpeed: `${wind} km/h`,
        soilMoisture: humidity > 75 ? 'Saturated' : humidity > 50 ? 'Adequate' : 'Dry',
        agronomicAdvice: cropAdvice,
        isLive: true,
        updatedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: weatherData
      }));

      return weatherData;
    }
  } catch (err) {
    console.warn('Live meteorological API unreachable, utilizing cached agro-weather', err);
  }

  // Graceful fallback if completely offline
  return {
    location: locationName,
    temperature: '28°C',
    condition: 'Partly Cloudy',
    humidity: '68%',
    rainfall: '0.0 mm',
    windSpeed: '9 km/h',
    soilMoisture: 'Adequate',
    agronomicAdvice: 'Standard seasonal conditions. Monitor leaf blade margins for early chlorotic streaks.',
    isLive: false,
    updatedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };
}
