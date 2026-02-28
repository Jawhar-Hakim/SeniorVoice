const WEATHER_API_KEY = 'cdfd4bdb81f3dde47343c6fa78c2deda';

export async function getWeather(city?: string, latitude?: number, longitude?: number) {
  try {
    let url = '';
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
    } else if (latitude !== undefined && longitude !== undefined) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`;
    } else {
      throw new Error('No location information provided');
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== 200) {
      throw new Error(data.message || 'Failed to fetch weather');
    }

    return {
      temperature: data.main.temp,
      description: data.weather[0].description,
      city: data.name,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}
