const config = require('../config/config');

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Include it in the x-api-key header or apiKey query parameter.'
    });
  }
  
  const tier = config.apiKeys[apiKey];
  
  if (!tier) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
  
  req.apiTier = tier;
  req.apiKey = apiKey;
  next();
};

module.exports = { authenticateApiKey };
