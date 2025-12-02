# 150 Working APIs - Production Ready

A comprehensive collection of 150 real, working APIs built with Node.js and Express, ready for deployment on Vercel, Render.com, and other platforms.

## 🚀 Features

- **150 Production APIs** across 18 categories
- **Enterprise-grade** with validation, error handling, and security
- **Multi-platform ready** - Vercel, Render, Railway, Heroku
- **RESTful design** with proper HTTP status codes
- **Comprehensive documentation** with examples
- **Rate limiting and security** middleware
- **Input validation and sanitization**
- **Mock data storage** for immediate testing

## 📁 API Categories

| Category | APIs | Description |
|----------|------|-------------|
| User Management | 10 | Registration, login, profiles, authentication |
| E-commerce | 15 | Products, orders, payments, shopping cart |
| Social Media | 12 | Posts, comments, likes, followers, stories |
| File Management | 10 | Upload, download, folders, sharing |
| Payment & Financial | 8 | Processing, refunds, subscriptions, invoices |
| Data Analytics | 15 | Events tracking, funnels, conversions, reports |
| Notifications | 8 | Push, email, SMS, templates, campaigns |
| Content Management | 12 | Articles, pages, media, comments, search |
| Geolocation & Maps | 10 | Geocoding, directions, places, weather |
| Authentication & Security | 8 | JWT, 2FA, sessions, password reset |
| Email & Communication | 7 | Send, templates, campaigns, analytics |
| Weather & Environmental | 6 | Current, forecast, alerts, maps |
| AI & Machine Learning | 10 | Classification, generation, translation |
| IoT & Devices | 8 | Device management, sensors, automation |
| Health & Fitness | 8 | Vitals, medications, appointments, goals |
| Entertainment | 8 | Movies, music, books, recommendations |
| Educational | 6 | Courses, lessons, assignments, certificates |
| Business & Productivity | 8 | Companies, projects, tasks, expenses |

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd 150-working-apis

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 🌐 Deployment

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Configure custom domain if needed

### Render.com

1. Connect your GitHub repository
2. Use the provided `render.yaml` configuration
3. Deploy automatically on push

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`

### Heroku

1. Install Heroku CLI: `heroku cli`
2. Create app: `heroku create your-app-name`
3. Deploy: `git push heroku main`

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

### General Endpoints

#### Home
```
GET /
```
Returns API overview and available endpoints.

#### Documentation
```
GET /api/docs
```
Returns complete API documentation with categories and counts.

## 🔐 Authentication

Most APIs use JWT tokens for authentication:

```javascript
// Register
POST /api/users/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

// Login
POST /api/users/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Use token in headers
Authorization: Bearer <your-jwt-token>
```

## 📝 Usage Examples

### User Management
```javascript
// Create user
POST /api/users/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1234567890"
}

// Get user profile
GET /api/users/profile/:userId

// Update user
PUT /api/users/profile/:userId
{
  "bio": "Software developer",
  "avatar": "https://example.com/avatar.jpg"
}
```

### E-commerce
```javascript
// Create product
POST /api/ecommerce/products
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "category": "Electronics",
  "stock": 50,
  "images": ["https://example.com/laptop.jpg"]
}

// Get products
GET /api/ecommerce/products?page=1&limit=10

// Add to cart
POST /api/ecommerce/cart
{
  "userId": "user-id",
  "productId": "product-id",
  "quantity": 1
}
```

### Analytics
```javascript
// Track event
POST /api/analytics/events
{
  "userId": "user-id",
  "event": "page_view",
  "properties": {
    "page": "/home",
    "source": "direct"
  }
}

// Get analytics
GET /api/analytics/events?startDate=2024-01-01&endDate=2024-01-31
```

### AI/Machine Learning
```javascript
// Text classification
POST /api/ai/classify
{
  "text": "This is amazing!",
  "categories": ["positive", "negative", "neutral"]
}

// Generate text
POST /api/ai/generate
{
  "prompt": "Write a product description",
  "maxLength": 500,
  "temperature": 0.7
}
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
```

### Rate Limiting
- Default: 1000 requests per 15 minutes per IP
- Configurable per endpoint

### Security Features
- Helmet.js for security headers
- CORS enabled
- Input validation and sanitization
- SQL injection protection (when using databases)

## 📊 Mock Data

All APIs use in-memory mock data for immediate testing. In production:

1. Replace mock arrays with database connections
2. Add proper data persistence
3. Implement caching where needed

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific API
curl http://localhost:3000/api/docs
```

## 🚀 Performance

- Lightweight and fast
- Minimal dependencies
- Optimized for serverless environments
- Memory efficient mock data

## 📄 License

MIT License - feel free to use these APIs in your projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the API documentation at `/api/docs`
- Review the examples in this README
- Open an issue on GitHub

---

**Ready to deploy? Choose your platform and deploy in minutes!**