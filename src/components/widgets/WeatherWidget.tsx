import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, CloudSnow, Loader2 } from "lucide-react";

interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  icon: string;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getWeatherIcon(condition: string) {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("drizzle")) {
    return <CloudRain className="w-8 h-8" />;
  }
  if (lower.includes("snow")) {
    return <CloudSnow className="w-8 h-8" />;
  }
  if (lower.includes("cloud")) {
    return <Cloud className="w-8 h-8" />;
  }
  return <Sun className="w-8 h-8" />;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      // Check cache
      const cached = localStorage.getItem("weather-cache");
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setWeather(data);
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);

        // Get user location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
          });
        });

        const { latitude, longitude } = position.coords;

        // Fetch weather from Open-Meteo API
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }

        const data = await response.json();

        // Get city name (reverse geocoding)
        let cityName = "Unknown";
        try {
          const geoResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            cityName = geoData.city || geoData.locality || "Unknown";
          }
        } catch {
          // Use coordinates if reverse geocoding fails
          cityName = `${latitude.toFixed(1)}, ${longitude.toFixed(1)}`;
        }

        // Map weather code to condition
        const weatherCode = data.current.weather_code;
        let condition = "Clear";
        if (weatherCode >= 1 && weatherCode <= 3) condition = "Partly Cloudy";
        else if (weatherCode >= 45 && weatherCode <= 48) condition = "Foggy";
        else if (weatherCode >= 51 && weatherCode <= 67) condition = "Rainy";
        else if (weatherCode >= 71 && weatherCode <= 77) condition = "Snowy";
        else if (weatherCode >= 80 && weatherCode <= 86) condition = "Rainy";
        else if (weatherCode >= 95 && weatherCode <= 99) condition = "Thunderstorm";

        const weatherData: WeatherData = {
          city: cityName,
          temperature: Math.round(data.current.temperature_2m),
          condition,
          icon: condition,
        };

        // Cache the result
        localStorage.setItem(
          "weather-cache",
          JSON.stringify({ data: weatherData, timestamp: Date.now() })
        );

        setWeather(weatherData);
      } catch (err) {
        const error = err as Error;
        console.error("Weather fetch error:", error);
        if (error.name === "GeolocationPositionError" || error.name === "NotAllowedError") {
          setError("Location access denied");
        } else {
          setError(`Failed to load weather: ${error.message}`);
        }
        // Try to use cached data if available
        const cached = localStorage.getItem("weather-cache");
        if (cached) {
          const { data } = JSON.parse(cached);
          setWeather(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <Card className="p-4 w-64 bg-background/80 backdrop-blur-sm border">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="p-4 w-64 bg-background/80 backdrop-blur-sm border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Cloud className="w-5 h-5" />
          <span className="text-sm">Weather unavailable</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 w-64 bg-background/80 backdrop-blur-sm border shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">{weather.city}</div>
          <div className="text-2xl font-bold mt-1">{weather.temperature}°C</div>
          <div className="text-xs text-muted-foreground mt-1">{weather.condition}</div>
        </div>
        <div className="text-primary flex-shrink-0">
          {getWeatherIcon(weather.condition)}
        </div>
      </div>
    </Card>
  );
}

