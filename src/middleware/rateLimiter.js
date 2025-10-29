const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const createRateLimiter = (tier = 'free') => {
  const limits = config.rateLimits[tier] || config.rateLimits.free;
  
  return rateLimit({
    windowMs: limits.windowMs,
    max: limits.max,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded for ${tier} tier. Please upgrade your plan or try again later.`,
      tier: tier,
      limit: limits.max
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.apiKey || req.ip
  });
};

const dynamicRateLimiter = (req, res, next) => {
  const tier = req.apiTier || 'free';
  const limiter = createRateLimiter(tier);
  limiter(req, res, next);
};

module.exports = { dynamicRateLimiter };
