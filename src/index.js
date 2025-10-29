require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const config = require('./config/config');

// Import routes
const weatherRoutes = require('./routes/weather');
const qrcodeRoutes = require('./routes/qrcode');
const textAnalysisRoutes = require('./routes/textAnalysis');
const currencyRoutes = require('./routes/currency');
const imageRoutes = require('./routes/image');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/qrcode', qrcodeRoutes);
app.use('/api/text-analysis', textAnalysisRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/image', imageRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'NtandoMods API Platform',
    version: '1.0.0',
    status: 'active',
    apis: {
      weather: '/api/weather',
      qrcode: '/api/qrcode',
      textAnalysis: '/api/text-analysis',
      currency: '/api/currency',
      image: '/api/image'
    },
    documentation: '/docs',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 NtandoMods API Platform running on port ${PORT}`);
  console.log(`📚 Documentation: http://localhost:${PORT}`);
});
