const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { authenticateApiKey } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateApiKey);
router.use(dynamicRateLimiter);

router.post('/generate', async (req, res) => {
  try {
    const { text, format = 'png', size = 300 } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text parameter is required'
      });
    }
    
    const options = {
      width: Math.min(size, 1000),
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    if (format === 'png') {
      const qrCodeDataUrl = await QRCode.toDataURL(text, options);
      res.json({
        success: true,
        data: {
          qrCode: qrCodeDataUrl,
          format: 'png',
          size: options.width
        },
        tier: req.apiTier
      });
    } else if (format === 'svg') {
      const qrCodeSvg = await QRCode.toString(text, { ...options, type: 'svg' });
      res.json({
        success: true,
        data: {
          qrCode: qrCodeSvg,
          format: 'svg',
          size: options.width
        },
        tier: req.apiTier
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid format. Use "png" or "svg"'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

router.get('/generate', async (req, res) => {
  try {
    const { text, format = 'png', size = 300 } = req.query;
    
    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text parameter is required'
      });
    }
    
    const options = {
      width: Math.min(parseInt(size), 1000),
      margin: 2
    };
    
    if (format === 'png') {
      const buffer = await QRCode.toBuffer(text, options);
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } else {
      const qrCodeSvg = await QRCode.toString(text, { ...options, type: 'svg' });
      res.set('Content-Type', 'image/svg+xml');
      res.send(qrCodeSvg);
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;
