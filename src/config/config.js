module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Keys for external services (optional)
  weatherApiKey: process.env.WEATHER_API_KEY || 'demo',
  currencyApiKey: process.env.CURRENCY_API_KEY || 'demo',
  
  // Rate limiting tiers
  rateLimits: {
    free: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10 // requests per window
    },
    basic: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    premium: {
      windowMs: 15 * 60 * 1000,
      max: 1000
    }
  },
  
  // Valid API keys (in production, use a database)
  apiKeys: {
    'demo-free-key': 'free',
    'demo-basic-key': 'basic',
    'demo-premium-key': 'premium'
  }
};
