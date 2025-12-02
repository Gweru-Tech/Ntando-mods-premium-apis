const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);

// Import all API routes
const userManagementRoutes = require('./api/userManagement');
const ecommerceRoutes = require('./api/ecommerce');
const socialMediaRoutes = require('./api/socialMedia');
const fileManagementRoutes = require('./api/fileManagement');
const paymentRoutes = require('./api/payment');
const analyticsRoutes = require('./api/analytics');
const notificationRoutes = require('./api/notification');
const contentRoutes = require('./api/content');
const geolocationRoutes = require('./api/geolocation');
const authRoutes = require('./api/auth');
const emailRoutes = require('./api/email');
const weatherRoutes = require('./api/weather');
const aiRoutes = require('./api/ai');
const iotRoutes = require('./api/iot');
const healthRoutes = require('./api/health');
const entertainmentRoutes = require('./api/entertainment');
const educationRoutes = require('./api/education');
const businessRoutes = require('./api/business');

// Main API routes
app.use('/api/users', userManagementRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/social', socialMediaRoutes);
app.use('/api/files', fileManagementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/geo', geolocationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/entertainment', entertainmentRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/business', businessRoutes);

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: '150 Working APIs Server',
    version: '1.0.0',
    endpoints: [
      '/api/users',
      '/api/ecommerce',
      '/api/social',
      '/api/files',
      '/api/payments',
      '/api/analytics',
      '/api/notifications',
      '/api/content',
      '/api/geo',
      '/api/auth',
      '/api/email',
      '/api/weather',
      '/api/ai',
      '/api/iot',
      '/api/health',
      '/api/entertainment',
      '/api/education',
      '/api/business'
    ],
    documentation: '/api/docs'
  });
});

// Serve static files from public directory
app.use(express.static('public'));

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: '150 Working APIs Documentation',
    categories: {
      'User Management': 10,
      'E-commerce': 15,
      'Social Media': 12,
      'File Management': 10,
      'Payment & Financial': 8,
      'Data Analytics': 10,
      'Notifications': 8,
      'Content Management': 12,
      'Geolocation & Maps': 10,
      'Authentication': 8,
      'Email & Communication': 7,
      'Weather & Environmental': 6,
      'AI & Machine Learning': 10,
      'IoT & Devices': 8,
      'Health & Fitness': 8,
      'Entertainment': 8,
      'Educational': 6,
      'Business & Productivity': 8
    },
    total_apis: 150,
    deployment_ready: true,
    platforms: ['Vercel', 'Render.com', 'Railway', 'Heroku', 'DigitalOcean']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    available_routes: [
      '/api/users',
      '/api/ecommerce',
      '/api/social',
      '/api/files',
      '/api/payments',
      '/api/analytics',
      '/api/notifications',
      '/api/content',
      '/api/geo',
      '/api/auth',
      '/api/email',
      '/api/weather',
      '/api/ai',
      '/api/iot',
      '/api/health',
      '/api/entertainment',
      '/api/education',
      '/api/business'
    ],
    documentation: '/api/docs'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 150 APIs Server running on port ${PORT}`);
  console.log(`\ud83d\udcda Documentation available at http://localhost:${PORT}/api/docs`);
  });
}
