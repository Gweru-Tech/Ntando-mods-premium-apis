const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateApiKey);
router.use(dynamicRateLimiter);

// Mock exchange rates (in production, use a real API like exchangerate-api.com)
const exchangeRates = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.89,
  CNY: 7.24,
  INR: 83.12,
  ZAR: 18.65
};

router.get('/convert', (req, res) => {
  try {
    const { from, to, amount = 1 } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Both "from" and "to" currency codes are required'
      });
    }
    
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    
    if (!exchangeRates[fromUpper] || !exchangeRates[toUpper]) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid currency code',
        supportedCurrencies: Object.keys(exchangeRates)
      });
    }
    
    const amountNum = parseFloat(amount);
    
    // Convert to USD first, then to target currency
    const usdAmount = amountNum / exchangeRates[fromUpper];
    const convertedAmount = usdAmount * exchangeRates[toUpper];
    
    res.json({
      success: true,
      data: {
        from: {
          currency: fromUpper,
          amount: amountNum
        },
        to: {
          currency: toUpper,
          amount: parseFloat(convertedAmount.toFixed(2))
        },
        rate: parseFloat((exchangeRates[toUpper] / exchangeRates[fromUpper]).toFixed(6)),
        timestamp: new Date().toISOString()
      },
      tier: req.apiTier
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

router.get('/rates', (req, res) => {
  const { base = 'USD' } = req.query;
  const baseUpper = base.toUpperCase();
  
  if (!exchangeRates[baseUpper]) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid base currency code',
      supportedCurrencies: Object.keys(exchangeRates)
    });
  }
  
  const rates = {};
  Object.keys(exchangeRates).forEach(currency => {
    rates[currency] = parseFloat((exchangeRates[currency] / exchangeRates[baseUpper]).toFixed(6));
  });
  
  res.json({
    success: true,
    data: {
      base: baseUpper,
      rates: rates,
      timestamp: new Date().toISOString()
    },
    tier: req.apiTier
  });
});

router.get('/list', (req, res) => {
  res.json({
    success: true,
    data: {
      currencies: Object.keys(exchangeRates),
      count: Object.keys(exchangeRates).length
    },
    tier: req.apiTier
  });
});

module.exports = router;
