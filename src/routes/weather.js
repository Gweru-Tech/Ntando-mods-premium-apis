const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateApiKey);
router.use(dynamicRateLimiter);

// Mock weather data (in production, integrate with real weather API)
const getWeatherData = (city) => {
  const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Windy'];
  const temp = Math.floor(Math.random() * 20) + 15;
  
  return {
    city: city,
    temperature: temp,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    humidity: Math.floor(Math.random() * 40) + 40,
    windSpeed: Math.floor(Math.random() * 20) + 5,
    timestamp: new Date().toISOString()
  };
};

router.get('/current', (req, res) => {
  const { city } = req.query;
  
  if (!city) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'City parameter is required'
    });
  }
  
  const weatherData = getWeatherData(city);
  
  res.json({
    success: true,
    data: weatherData,
    tier: req.apiTier
  });
});

router.get('/forecast', (req, res) => {
  const { city, days = 5 } = req.query;
  
  if (!city) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'City parameter is required'
    });
  }
  
  const forecast = [];
  for (let i = 0; i < Math.min(days, 7); i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    forecast.push({
      date: date.toISOString().split('T')[0],
      ...getWeatherData(city)
    });
  }
  
  res.json({
    success: true,
    data: {
      city: city,
      forecast: forecast
    },
    tier: req.apiTier
  });
});

module.exports = router;
