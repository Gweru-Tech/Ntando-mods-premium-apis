const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const router = express.Router();

// Mock databases
const weatherData = [];
const forecasts = [];
const alerts = [];
const locations = [];
const history = [];
const stations = [];
const measurements = [];

// 1. Get Current Weather
router.get('/current', (req, res) => {
  const { lat, lon, city, country, units = 'metric' } = req.query;
  
  if (!lat && !lon && !city) {
    return res.status(400).json({ error: 'Either coordinates (lat,lon) or city is required' });
  }

  // Mock current weather data
  const currentWeather = {
    id: uuidv4(),
    location: {
      lat: parseFloat(lat) || 40.7128,
      lon: parseFloat(lon) || -74.0060,
      city: city || 'New York',
      country: country || 'US'
    },
    current: {
      temperature: Math.round(Math.random() * 30 + 10),
      feels_like: Math.round(Math.random() * 30 + 10),
      humidity: Math.round(Math.random() * 100),
      pressure: Math.round(Math.random() * 100 + 950),
      visibility: Math.round(Math.random() * 10 + 5),
      uv_index: Math.round(Math.random() * 10),
      wind: {
        speed: Math.round(Math.random() * 20),
        direction: Math.round(Math.random() * 360),
        gust: Math.round(Math.random() * 30)
      },
      condition: 'Clear',
      description: 'Clear sky',
      icon: '01d'
    },
    units,
    timestamp: new Date().toISOString()
  };

  weatherData.push(currentWeather);
  res.json(currentWeather);
});

// 2. Get Weather Forecast
router.get('/forecast', (req, res) => {
  const { lat, lon, city, days = 5, units = 'metric' } = req.query;
  
  if (!lat && !lon && !city) {
    return res.status(400).json({ error: 'Either coordinates (lat,lon) or city is required' });
  }

  const forecastDays = Math.min(parseInt(days), 16);
  const dailyForecast = [];

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    dailyForecast.push({
      date: date.toISOString().split('T')[0],
      temperature: {
        min: Math.round(Math.random() * 15 + 10),
        max: Math.round(Math.random() * 15 + 20),
        morning: Math.round(Math.random() * 20 + 15),
        afternoon: Math.round(Math.random() * 20 + 20),
        evening: Math.round(Math.random() * 20 + 15),
        night: Math.round(Math.random() * 15 + 10)
      },
      humidity: Math.round(Math.random() * 100),
      precipitation: {
        probability: Math.round(Math.random() * 100),
        amount: Math.round(Math.random() * 10 * 10) / 10
      },
      wind: {
        speed: Math.round(Math.random() * 20),
        direction: Math.round(Math.random() * 360)
      },
      condition: ['Clear', 'Clouds', 'Rain', 'Snow', 'Thunderstorm'][Math.floor(Math.random() * 5)],
      description: 'Sample weather description',
      icon: '01d'
    });
  }

  const forecast = {
    id: uuidv4(),
    location: {
      lat: parseFloat(lat) || 40.7128,
      lon: parseFloat(lon) || -74.0060,
      city: city || 'New York'
    },
    forecast: dailyForecast,
    units,
    generatedAt: new Date().toISOString()
  };

  forecasts.push(forecast);
  res.json(forecast);
});

// 3. Get Hourly Forecast
router.get('/hourly', (req, res) => {
  const { lat, lon, city, hours = 24, units = 'metric' } = req.query;
  
  if (!lat && !lon && !city) {
    return res.status(400).json({ error: 'Either coordinates (lat,lon) or city is required' });
  }

  const forecastHours = Math.min(parseInt(hours), 48);
  const hourlyForecast = [];

  for (let i = 0; i < forecastHours; i++) {
    const date = new Date();
    date.setHours(date.getHours() + i);

    hourlyForecast.push({
      timestamp: date.toISOString(),
      temperature: Math.round(Math.random() * 20 + 15),
      feels_like: Math.round(Math.random() * 20 + 15),
      humidity: Math.round(Math.random() * 100),
      precipitation: {
        probability: Math.round(Math.random() * 100)
      },
      wind: {
        speed: Math.round(Math.random() * 15),
        direction: Math.round(Math.random() * 360)
      },
      condition: ['Clear', 'Clouds', 'Rain', 'Snow'][Math.floor(Math.random() * 4)],
      icon: '01d'
    });
  }

  res.json({
    location: {
      lat: parseFloat(lat) || 40.7128,
      lon: parseFloat(lon) || -74.0060,
      city: city || 'New York'
    },
    hourly: hourlyForecast,
    units
  });
});

// 4. Get Weather Alerts
router.get('/alerts', (req, res) => {
  const { lat, lon, city, country, severity } = req.query;
  
  let filteredAlerts = alerts;
  
  if (lat && lon) {
    filteredAlerts = filteredAlerts.filter(a => 
      Math.abs(a.location.lat - parseFloat(lat)) < 1 &&
      Math.abs(a.location.lon - parseFloat(lon)) < 1
    );
  }
  
  if (city) {
    filteredAlerts = filteredAlerts.filter(a => a.location.city === city);
  }
  
  if (severity) {
    filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
  }

  res.json({ 
    alerts: filteredAlerts,
    count: filteredAlerts.length 
  });
});

// 5. Create Weather Alert
router.post('/alerts', [
  body('title').isLength({ min: 3 }),
  body('description').isLength({ min: 10 }),
  body('severity').isIn(['minor', 'moderate', 'severe', 'extreme']),
  body('location').exists(),
  body('start').isISO8601(),
  body('end').isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const alert = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    active: true
  };

  alerts.push(alert);
  res.status(201).json({ message: 'Weather alert created', alert });
});

// 6. Search Locations
router.get('/search', (req, res) => {
  const { q, limit = 5 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // Mock location search
  const searchResults = [
    {
      id: uuidv4(),
      name: `${q} City`,
      country: 'US',
      state: 'NY',
      coordinates: { lat: 40.7128, lon: -74.0060 },
      population: 8000000
    },
    {
      id: uuidv4(),
      name: `${q} Town`,
      country: 'US',
      state: 'CA',
      coordinates: { lat: 34.0522, lon: -118.2437 },
      population: 500000
    }
  ];

  res.json({ locations: searchResults.slice(0, parseInt(limit)) });
});

// 7. Get Weather History
router.get('/history', (req, res) => {
  const { lat, lon, city, start, end, units = 'metric' } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const historicalData = [];
  for (let i = 0; i <= daysDiff && i < 365; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    historicalData.push({
      date: date.toISOString().split('T')[0],
      temperature: {
        min: Math.round(Math.random() * 15 + 5),
        max: Math.round(Math.random() * 15 + 20),
        avg: Math.round(Math.random() * 15 + 12)
      },
      humidity: Math.round(Math.random() * 100),
      precipitation: Math.round(Math.random() * 10 * 10) / 10,
      wind: {
        speed: Math.round(Math.random() * 20),
        direction: Math.round(Math.random() * 360)
      },
      condition: ['Clear', 'Clouds', 'Rain', 'Snow'][Math.floor(Math.random() * 4)]
    });
  }

  const historyRecord = {
    id: uuidv4(),
    location: {
      lat: parseFloat(lat) || 40.7128,
      lon: parseFloat(lon) || -74.0060,
      city: city || 'New York'
    },
    period: { start, end },
    data: historicalData,
    units
  };

  history.push(historyRecord);
  res.json(historyRecord);
});

// 8. Get Weather Stations
router.get('/stations', (req, res) => {
  const { lat, lon, radius = 50 } = req.query;
  
  let stationList = stations;
  
  if (lat && lon) {
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const maxRadius = parseFloat(radius);
    
    stationList = stations.filter(station => {
      const distance = calculateDistance(userLat, userLon, station.lat, station.lon);
      return distance <= maxRadius;
    });
  }

  res.json({ stations: stationList });
});

// 9. Get Station Data
router.get('/stations/:stationId', (req, res) => {
  const { stationId } = req.params;
  const station = stations.find(s => s.id === stationId);
  
  if (!station) {
    return res.status(404).json({ error: 'Weather station not found' });
  }

  const stationMeasurements = measurements.filter(m => m.stationId === stationId);
  const latestMeasurement = stationMeasurements[stationMeasurements.length - 1];

  res.json({
    station,
    measurements: stationMeasurements.slice(-10), // Last 10 measurements
    current: latestMeasurement
  });
});

// 10. Add Measurement
router.post('/measurements', [
  body('stationId').exists(),
  body('temperature').isFloat(),
  body('humidity').isFloat({ min: 0, max: 100 }),
  body('pressure').isFloat(),
  body('windSpeed').optional().isFloat(),
  body('precipitation').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const measurement = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString()
  };

  measurements.push(measurement);
  res.status(201).json({ message: 'Measurement added', measurement });
});

// 11. Get Air Quality
router.get('/air-quality', (req, res) => {
  const { lat, lon, city } = req.query;
  
  if (!lat && !lon && !city) {
    return res.status(400).json({ error: 'Location is required' });
  }

  // Mock air quality data
  const airQuality = {
    location: {
      lat: parseFloat(lat) || 40.7128,
      lon: parseFloat(lon) || -74.0060,
      city: city || 'New York'
    },
    aqi: Math.round(Math.random() * 150),
    pollutants: {
      pm25: Math.round(Math.random() * 50),
      pm10: Math.round(Math.random() * 100),
      o3: Math.round(Math.random() * 200),
      no2: Math.round(Math.random() * 100),
      so2: Math.round(Math.random() * 50),
      co: Math.round(Math.random() * 10)
    },
    category: ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy', 'Hazardous'][Math.floor(Math.random() * 6)],
    timestamp: new Date().toISOString()
  };

  res.json(airQuality);
});

// 12. Get UV Index
router.get('/uv-index', (req, res) => {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const uvData = {
    location: { lat: parseFloat(lat), lon: parseFloat(lon) },
    current: Math.round(Math.random() * 11),
    forecast: Array.from({ length: 8 }, (_, i) => ({
      hour: i,
      uv_index: Math.round(Math.random() * 11)
    })),
    recommendation: getUVRecommendation(Math.round(Math.random() * 11)),
    timestamp: new Date().toISOString()
  };

  res.json(uvData);
});

// 13. Get Satellite Data
router.get('/satellite', (req, res) => {
  const { lat, lon, type = 'visible', time = 'latest' } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Coordinates are required' });
  }

  const satelliteData = {
    location: { lat: parseFloat(lat), lon: parseFloat(lon) },
    type,
    time,
    imageUrl: `https://satellite.example.com/${type}/${lat}/${lon}/${time}.png`,
    metadata: {
      resolution: '1km',
      timestamp: new Date().toISOString(),
      source: 'NOAA'
    }
  };

  res.json(satelliteData);
});

// 14. Get Marine Weather
router.get('/marine', (req, res) => {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Coordinates are required' });
  }

  const marineWeather = {
    location: { lat: parseFloat(lat), lon: parseFloat(lon) },
    water: {
      temperature: Math.round(Math.random() * 20 + 10),
      waveHeight: Math.round(Math.random() * 5 * 10) / 10,
      waveDirection: Math.round(Math.random() * 360),
      wavePeriod: Math.round(Math.random() * 10 + 5),
      swellHeight: Math.round(Math.random() * 3 * 10) / 10,
      swellDirection: Math.round(Math.random() * 360),
      swellPeriod: Math.round(Math.random() * 15 + 10)
    },
    wind: {
      speed: Math.round(Math.random() * 30),
      direction: Math.round(Math.random() * 360),
      gust: Math.round(Math.random() * 40)
    },
    tide: {
      current: 'rising',
      nextHigh: '2024-01-01T14:30:00Z',
      nextLow: '2024-01-01T08:15:00Z',
      height: 1.2
    },
    timestamp: new Date().toISOString()
  };

  res.json(marineWeather);
});

// 15. Get Weather Map
router.get('/map', (req, res) => {
  const { layer = 'temperature', bounds, zoom = 5, width = 512, height = 512 } = req.query;
  
  const weatherMap = {
    layer,
    bounds: bounds || '-180,-90,180,90',
    zoom: parseInt(zoom),
    size: { width: parseInt(width), height: parseInt(height) },
    imageUrl: `https://weathermap.example.com/${layer}/${bounds}/${zoom}/${width}/${height}.png`,
    legend: {
      min: -20,
      max: 40,
      unit: '°C',
      colors: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000']
    },
    timestamp: new Date().toISOString()
  };

  res.json(weatherMap);
});

// 16. Get Seasonal Forecast
router.get('/seasonal', (req, res) => {
  const { lat, lon, season, year } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Coordinates are required' });
  }

  const seasonalForecast = {
    location: { lat: parseFloat(lat), lon: parseFloat(lon) },
    season: season || getCurrentSeason(),
    year: parseInt(year) || new Date().getFullYear(),
    overview: {
      temperature: 'Above Average',
      precipitation: 'Below Average',
      conditions: 'Warmer and drier than normal'
    },
    months: [
      {
        month: 'January',
        temperature: { min: -2, max: 8, anomaly: +2 },
        precipitation: { amount: 45, anomaly: -15 },
        conditions: 'Mostly dry with occasional snow'
      },
      {
        month: 'February',
        temperature: { min: 0, max: 10, anomaly: +1 },
        precipitation: { amount: 38, anomaly: -20 },
        conditions: 'Mild with limited precipitation'
      }
    ],
    confidence: 75,
    generatedAt: new Date().toISOString()
  };

  res.json(seasonalForecast);
});

// 17. Get Climate Data
router.get('/climate', (req, res) => {
  const { lat, lon, period = '30y' } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Coordinates are required' });
  }

  const climateData = {
    location: { lat: parseFloat(lat), lon: parseFloat(lon) },
    period,
    temperature: {
      annual_avg: 12.5,
      monthly_avg: [
        { month: 'Jan', avg: 2.1, min_max: [-2, 6] },
        { month: 'Feb', avg: 3.5, min_max: [0, 8] },
        { month: 'Mar', avg: 8.2, min_max: [3, 13] },
        { month: 'Apr', avg: 14.1, min_max: [8, 20] },
        { month: 'May', avg: 19.8, min_max: [13, 26] },
        { month: 'Jun', avg: 24.5, min_max: [18, 31] },
        { month: 'Jul', avg: 27.8, min_max: [21, 34] },
        { month: 'Aug', avg: 26.9, min_max: [20, 33] },
        { month: 'Sep', avg: 22.3, min_max: [16, 28] },
        { month: 'Oct', avg: 16.2, min_max: [10, 22] },
        { month: 'Nov', avg: 9.8, min_max: [5, 15] },
        { month: 'Dec', avg: 3.9, min_max: [0, 8] }
      ]
    },
    precipitation: {
      annual_total: 845,
      monthly_avg: [
        { month: 'Jan', avg: 68 },
        { month: 'Feb', avg: 55 },
        { month: 'Mar', avg: 72 },
        { month: 'Apr', avg: 84 },
        { month: 'May', avg: 98 },
        { month: 'Jun', avg: 102 },
        { month: 'Jul', avg: 95 },
        { month: 'Aug', avg: 88 },
        { month: 'Sep', avg: 76 },
        { month: 'Oct', avg: 78 },
        { month: 'Nov', avg: 82 },
        { month: 'Dec', avg: 67 }
      ]
    },
    generatedAt: new Date().toISOString()
  };

  res.json(climateData);
});

// Helper functions
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function getUVRecommendation(uvIndex) {
  if (uvIndex <= 2) return 'No protection needed';
  if (uvIndex <= 5) return 'Wear sunglasses and sunscreen';
  if (uvIndex <= 7) return 'Seek shade during midday hours';
  if (uvIndex <= 10) return 'Extra protection needed';
  return 'Avoid sun exposure';
}

module.exports = router;