# Postman Collection for 150 APIs

## Base URL
```
http://localhost:3000
```

## Environment Variables
```
baseUrl: http://localhost:3000
userId: your-user-id-here
authToken: your-jwt-token-here
```

## Collection Structure

### User Management APIs

#### Register User
```http
POST {{baseUrl}}/api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

#### Login User
```http
POST {{baseUrl}}/api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Get User Profile
```http
GET {{baseUrl}}/api/users/profile/{{userId}}
Authorization: Bearer {{authToken}}
```

#### Update User Profile
```http
PUT {{baseUrl}}/api/users/profile/{{userId}}
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "bio": "Software developer",
  "avatar": "https://example.com/avatar.jpg"
}
```

### E-commerce APIs

#### Create Product
```http
POST {{baseUrl}}/api/ecommerce/products
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "category": "Electronics",
  "stock": 50,
  "images": ["https://example.com/laptop.jpg"]
}
```

#### Get Products
```http
GET {{baseUrl}}/api/ecommerce/products?page=1&limit=10&category=Electronics
```

#### Add to Cart
```http
POST {{baseUrl}}/api/ecommerce/cart
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "userId": "{{userId}}",
  "productId": "product-id-here",
  "quantity": 1
}
```

#### Create Order
```http
POST {{baseUrl}}/api/ecommerce/orders
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "userId": "{{userId}}",
  "items": [
    {
      "productId": "product-id-here",
      "quantity": 1,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001"
  },
  "paymentMethod": "credit_card"
}
```

### Analytics APIs

#### Track Event
```http
POST {{baseUrl}}/api/analytics/events
Content-Type: application/json

{
  "userId": "{{userId}}",
  "event": "page_view",
  "properties": {
    "page": "/home",
    "source": "direct"
  }
}
```

#### Track Page View
```http
POST {{baseUrl}}/api/analytics/pageviews
Content-Type: application/json

{
  "userId": "{{userId}}",
  "page": "/products",
  "title": "Products Page",
  "referrer": "https://google.com"
}
```

#### Get Event Analytics
```http
GET {{baseUrl}}/api/analytics/events?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{authToken}}
```

### AI & Machine Learning APIs

#### Text Classification
```http
POST {{baseUrl}}/api/ai/classify
Content-Type: application/json

{
  "text": "This is amazing! I love this product.",
  "model": "sentiment_analysis",
  "categories": ["positive", "negative", "neutral"]
}
```

#### Generate Text
```http
POST {{baseUrl}}/api/ai/generate
Content-Type: application/json

{
  "prompt": "Write a product description for a smartphone",
  "maxLength": 500,
  "temperature": 0.7,
  "model": "gpt-3"
}
```

#### Sentiment Analysis
```http
POST {{baseUrl}}/api/ai/sentiment
Content-Type: application/json

{
  "text": "The customer service was excellent and the product quality is outstanding!",
  "language": "en"
}
```

### Notification APIs

#### Send Notification
```http
POST {{baseUrl}}/api/notifications/send
Content-Type: application/json

{
  "userId": "{{userId}}",
  "title": "Welcome!",
  "message": "Thanks for joining our platform",
  "type": "push",
  "data": {
    "action": "welcome"
  }
}
```

#### Get User Notifications
```http
GET {{baseUrl}}/api/notifications/user/{{userId}}?page=1&limit=10&read=false
Authorization: Bearer {{authToken}}
```

### Email APIs

#### Send Email
```http
POST {{baseUrl}}/api/email/send
Content-Type: application/json

{
  "to": ["recipient@example.com"],
  "subject": "Welcome to Our Platform",
  "html": "<h1>Welcome!</h1><p>Thanks for joining us.</p>",
  "text": "Welcome! Thanks for joining us."
}
```

#### Create Email Template
```http
POST {{baseUrl}}/api/email/templates
Content-Type: application/json

{
  "name": "Welcome Email",
  "subject": "Welcome {{name}}!",
  "html": "<h1>Welcome {{name}}!</h1><p>Thanks for joining {{company}}.</p>",
  "variables": ["name", "company"]
}
```

### File Management APIs

#### Upload File
```http
POST {{baseUrl}}/api/files/upload
Content-Type: multipart/form-data

file: [your file]
userId: {{userId}}
folderId: folder-id-here
```

#### Get Files
```http
GET {{baseUrl}}/api/files?userId={{userId}}&page=1&limit=20
Authorization: Bearer {{authToken}}
```

### Weather APIs

#### Get Current Weather
```http
GET {{baseUrl}}/api/weather/current?lat=40.7128&lon=-74.0060&units=metric
```

#### Get Weather Forecast
```http
GET {{baseUrl}}/api/weather/forecast?lat=40.7128&lon=-74.0060&days=5&units=metric
```

### IoT APIs

#### Register Device
```http
POST {{baseUrl}}/api/iot/devices
Content-Type: application/json

{
  "deviceId": "device-001",
  "name": "Temperature Sensor",
  "type": "sensor",
  "userId": "{{userId}}",
  "location": {
    "lat": 40.7128,
    "lon": -74.0060
  }
}
```

#### Add Sensor Reading
```http
POST {{baseUrl}}/api/iot/readings
Content-Type: application/json

{
  "deviceId": "device-id-here",
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "celsius"
}
```

### Health APIs

#### Record Vitals
```http
POST {{baseUrl}}/api/health/vitals
Content-Type: application/json

{
  "userId": "{{userId}}",
  "heartRate": 72,
  "bloodPressure": {
    "systolic": 120,
    "diastolic": 80
  },
  "temperature": 36.6,
  "weight": 70.5
}
```

#### Create Appointment
```http
POST {{baseUrl}}/api/health/appointments
Content-Type: application/json

{
  "userId": "{{userId}}",
  "title": "Annual Checkup",
  "doctor": "Dr. Smith",
  "dateTime": "2024-02-15T10:00:00Z",
  "duration": 30,
  "type": "checkup"
}
```

### Entertainment APIs

#### Get Movies
```http
GET {{baseUrl}}/api/entertainment/movies?page=1&limit=20&genre=action&rating=7
```

#### Add Review
```http
POST {{baseUrl}}/api/entertainment/reviews
Content-Type: application/json

{
  "userId": "{{userId}}",
  "type": "movie",
  "itemId": "movie-id-here",
  "rating": 8,
  "comment": "Great movie with amazing cinematography!"
}
```

### Education APIs

#### Create Course
```http
POST {{baseUrl}}/api/education/courses
Content-Type: application/json

{
  "title": "Introduction to JavaScript",
  "description": "Learn the basics of JavaScript programming",
  "instructorId": "instructor-id-here",
  "category": "Programming",
  "level": "beginner",
  "duration": 40,
  "price": 99.99
}
```

#### Enroll in Course
```http
POST {{baseUrl}}/api/education/enroll
Content-Type: application/json

{
  "courseId": "course-id-here",
  "studentId": "{{userId}}"
}
```

### Business APIs

#### Create Company
```http
POST {{baseUrl}}/api/business/companies
Content-Type: application/json

{
  "name": "Tech Solutions Inc",
  "industry": "Technology",
  "size": "medium",
  "website": "https://techsolutions.com",
  "description": "Software development company"
}
```

#### Create Project
```http
POST {{baseUrl}}/api/business/projects
Content-Type: application/json

{
  "companyId": "company-id-here",
  "name": "Mobile App Development",
  "description": "Develop a cross-platform mobile application",
  "managerId": "manager-id-here",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-06-30T00:00:00Z",
  "budget": 50000,
  "priority": "high"
}
```

## Authentication Flow

### 1. Register and Get Token
```http
POST {{baseUrl}}/api/users/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "name": "Test User"
}
```

### 2. Login
```http
POST {{baseUrl}}/api/users/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

### 3. Use Token in Subsequent Requests
Add the token to the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

## Testing Tips

1. **Set up Environment Variables**: Create a Postman environment with your base URL and authentication tokens.

2. **Test Authentication Flow**: Start with register/login endpoints to get tokens, then use them for protected endpoints.

3. **Use Test Data**: The APIs use mock data, so you can test immediately without database setup.

4. **Check Response Codes**: Verify proper HTTP status codes (200, 201, 400, 404, 500).

5. **Test Validation**: Try sending invalid data to test input validation.

6. **Pagination Testing**: Test pagination parameters (page, limit) on list endpoints.

7. **Error Handling**: Test error scenarios with invalid IDs or missing data.

## Common Response Patterns

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": { ... }
}
```

### Validation Error
```json
{
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Paginated Response
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Quick Test Script

```javascript
// Test basic API connectivity
pm.test("API is working", function() {
    pm.response.to.have.status(200);
});

// Test authentication
pm.test("JWT token received", function() {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
});

// Save token to environment
if (pm.response.json().token) {
    pm.environment.set("authToken", pm.response.json().token);
}
```

Import this collection into Postman and start testing all 150 APIs!