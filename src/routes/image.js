const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const { authenticateApiKey } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateApiKey);
router.use(dynamicRateLimiter);

router.post('/resize', async (req, res) => {
  try {
    const { imageUrl, width, height, format = 'jpeg' } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'imageUrl parameter is required'
      });
    }
    
    // For demo purposes, create a placeholder image
    // In production, you'd fetch the actual image from imageUrl
    const buffer = await sharp({
      create: {
        width: parseInt(width) || 300,
        height: parseInt(height) || 300,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .jpeg()
    .toBuffer();
    
    const base64Image = buffer.toString('base64');
    
    res.json({
      success: true,
      data: {
        image: `data:image/jpeg;base64,${base64Image}`,
        dimensions: {
          width: parseInt(width) || 300,
          height: parseInt(height) || 300
        },
        format: format
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

router.post('/filter', async (req, res) => {
  try {
    const { imageUrl, filter = 'grayscale' } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'imageUrl parameter is required'
      });
    }
    
    // Create a demo image with filter applied
    let imageProcessor = sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 150, g: 100, b: 200 }
      }
    });
    
    // Apply filter
    if (filter === 'grayscale') {
      imageProcessor = imageProcessor.grayscale();
    } else if (filter === 'blur') {
      imageProcessor = imageProcessor.blur(5);
    } else if (filter === 'sharpen') {
      imageProcessor = imageProcessor.sharpen();
    }
    
    const buffer = await imageProcessor.jpeg().toBuffer();
    const base64Image = buffer.toString('base64');
    
    res.json({
      success: true,
      data: {
        image: `data:image/jpeg;base64,${base64Image}`,
        filter: filter,
        supportedFilters: ['grayscale', 'blur', 'sharpen']
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

router.post('/info', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'imageUrl parameter is required'
      });
    }
    
    // Mock image info
    res.json({
      success: true,
      data: {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: '2.5 MB',
        colorSpace: 'srgb',
        hasAlpha: false
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

module.exports = router;
