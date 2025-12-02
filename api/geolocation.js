const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const router = express.Router();

// Mock databases
const locations = [];
const addresses = [];
const routes = [];
const geofences = [];
const places = [];
const coordinates = [];
const maps = [];
const pois = [];

// 1. Geocode Address
router.post('/geocode', [
  body('address').isLength({ min: 5 }),
  body('country').optional().isLength({ min: 2, max: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { address, country } = req.body;
  
  // Mock geocoding response (in production, use real geocoding service)
  const geocodedLocation = {
    id: uuidv4(),
    address,
    country: country || 'US',
    coordinates: {
      lat: 40.7128 + Math.random() * 0.1,
      lng: -74.0060 + Math.random() * 0.1
    },
    formattedAddress: `${address}, ${country || 'USA'}`,
    accuracy: 'high',
    processedAt: new Date().toISOString()
  };

  locations.push(geocodedLocation);
  res.json({ message: 'Address geocoded successfully', location: geocodedLocation });
});

// 2. Reverse Geocode
router.post('/reverse-geocode', [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { lat, lng } = req.body;
  
  // Mock reverse geocoding
  const address = {
    id: uuidv4(),
    coordinates: { lat, lng },
    formattedAddress: `123 Mock Street, New York, NY 10001`,
    street: '123 Mock Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    processedAt: new Date().toISOString()
  };

  addresses.push(address);
  res.json({ message: 'Coordinates reverse geocoded', address });
});

// 3. Calculate Distance
router.post('/distance', [
  body('origin').isObject(),
  body('destination').isObject(),
  body('unit').optional().isIn(['km', 'miles', 'meters'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { origin, destination, unit = 'km' } = req.body;
  
  // Haversine formula for distance calculation
  const R = unit === 'km' ? 6371 : unit === 'miles' ? 3959 : 6371000;
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLon = (destination.lng - origin.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  const route = {
    id: uuidv4(),
    origin,
    destination,
    distance: Math.round(distance * 100) / 100,
    unit,
    calculatedAt: new Date().toISOString()
  };

  routes.push(route);
  res.json({ message: 'Distance calculated', route });
});

// 4. Get Directions
router.post('/directions', [
  body('origin').isObject(),
  body('destination').isObject(),
  body('mode').optional().isIn(['driving', 'walking', 'cycling', 'transit'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { origin, destination, mode = 'driving' } = req.body;
  
  // Mock directions response
  const directions = {
    id: uuidv4(),
    origin,
    destination,
    mode,
    distance: (5 + Math.random() * 20).toFixed(2) + ' km',
    duration: (10 + Math.random() * 40).toFixed(0) + ' mins',
    steps: [
      {
        instruction: 'Head north on Mock Street',
        distance: '0.5 km',
        duration: '2 mins'
      },
      {
        instruction: 'Turn right onto Main Avenue',
        distance: '2.3 km',
        duration: '8 mins'
      },
      {
        instruction: 'Turn left to reach destination',
        distance: '0.2 km',
        duration: '1 min'
      }
    ],
    polyline: 'mock_polyline_data',
    calculatedAt: new Date().toISOString()
  };

  res.json({ message: 'Directions calculated', directions });
});

// 5. Create Geofence
router.post('/geofences', [
  body('name').isLength({ min: 3 }),
  body('coordinates').isArray(),
  body('type').isIn(['circle', 'polygon']),
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const geofence = {
    id: uuidv4(),
    ...req.body,
    active: true,
    createdAt: new Date().toISOString()
  };

  geofences.push(geofence);
  res.status(201).json({ message: 'Geofence created successfully', geofence });
});

// 6. Get Geofences
router.get('/geofences', (req, res) => {
  const userId = req.query.userId;
  
  let filteredGeofences = geofences;
  if (userId) {
    filteredGeofences = filteredGeofences.filter(g => g.userId === userId);
  }

  res.json({ geofences: filteredGeofences });
});

// 7. Check Point in Geofence
router.post('/geofences/check', [
  body('point').isObject(),
  body('geofenceId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { point, geofenceId } = req.body;
  const geofence = geofences.find(g => g.id === geofenceId);
  
  if (!geofence) {
    return res.status(404).json({ error: 'Geofence not found' });
  }

  // Simple point-in-polygon check (mock)
  const isInside = Math.random() > 0.5;

  res.json({
    geofenceId,
    point,
    isInside,
    checkedAt: new Date().toISOString()
  });
});

// 8. Search Places
router.get('/places/search', (req, res) => {
  const { query, lat, lng, radius = 5000, type } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // Mock places search
  const searchResults = [
    {
      id: uuidv4(),
      name: `${query} Place 1`,
      address: '123 Main St',
      coordinates: { lat: parseFloat(lat) + 0.01, lng: parseFloat(lng) + 0.01 },
      type: type || 'restaurant',
      rating: 4.5,
      distance: '0.5 km'
    },
    {
      id: uuidv4(),
      name: `${query} Place 2`,
      address: '456 Oak Ave',
      coordinates: { lat: parseFloat(lat) - 0.01, lng: parseFloat(lng) - 0.01 },
      type: type || 'restaurant',
      rating: 4.2,
      distance: '1.2 km'
    }
  ];

  res.json({ places: searchResults, query });
});

// 9. Get Place Details
router.get('/places/:placeId', (req, res) => {
  const { placeId } = req.params;
  
  // Mock place details
  const place = {
    id: placeId,
    name: 'Sample Restaurant',
    address: '123 Main St, New York, NY 10001',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    phone: '+1 234-567-8900',
    website: 'https://example.com',
    rating: 4.5,
    reviews: 128,
    priceLevel: 2,
    openingHours: {
      monday: '9:00 AM - 10:00 PM',
      tuesday: '9:00 AM - 10:00 PM',
      wednesday: '9:00 AM - 10:00 PM',
      thursday: '9:00 AM - 10:00 PM',
      friday: '9:00 AM - 11:00 PM',
      saturday: '10:00 AM - 11:00 PM',
      sunday: '10:00 AM - 9:00 PM'
    },
    photos: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2'
    ]
  };

  res.json({ place });
});

// 10. Save Place
router.post('/places/save', [
  body('placeId').exists(),
  body('userId').exists(),
  body('notes').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const savedPlace = {
    id: uuidv4(),
    ...req.body,
    savedAt: new Date().toISOString()
  };

  places.push(savedPlace);
  res.status(201).json({ message: 'Place saved successfully', savedPlace });
});

// 11. Get Saved Places
router.get('/places/saved/:userId', (req, res) => {
  const { userId } = req.params;
  const userPlaces = places.filter(p => p.userId === userId);
  
  res.json({ places: userPlaces });
});

// 12. Update Location
router.post('/location/update', [
  body('userId').exists(),
  body('coordinates').isObject(),
  body('accuracy').optional().isFloat(),
  body('timestamp').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const locationUpdate = {
    id: uuidv4(),
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString(),
    ip: req.ip
  };

  coordinates.push(locationUpdate);
  res.status(201).json({ message: 'Location updated successfully', location: locationUpdate });
});

// 13. Get Location History
router.get('/location/history/:userId', (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, limit = 100 } = req.query;
  
  let userLocations = coordinates.filter(c => c.userId === userId);
  
  if (startDate) {
    userLocations = userLocations.filter(c => new Date(c.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    userLocations = userLocations.filter(c => new Date(c.timestamp) <= new Date(endDate));
  }

  userLocations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  userLocations = userLocations.slice(0, parseInt(limit));

  res.json({ locations: userLocations });
});

// 14. Create Map
router.post('/maps', [
  body('name').isLength({ min: 3 }),
  body('center').isObject(),
  body('zoom').isInt({ min: 1, max: 20 }),
  body('markers').optional().isArray(),
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const map = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    shareUrl: `https://maps.example.com/shared/${uuidv4()}`
  };

  maps.push(map);
  res.status(201).json({ message: 'Map created successfully', map });
});

// 15. Get Maps
router.get('/maps', (req, res) => {
  const userId = req.query.userId;
  
  let filteredMaps = maps;
  if (userId) {
    filteredMaps = filteredMaps.filter(m => m.userId === userId);
  }

  res.json({ maps: filteredMaps });
});

// 16. Nearby Search
router.get('/nearby', (req, res) => {
  const { lat, lng, radius = 1000, type } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  // Mock nearby search
  const nearbyPlaces = [
    {
      id: uuidv4(),
      name: 'Nearby Restaurant',
      type: type || 'restaurant',
      coordinates: { 
        lat: parseFloat(lat) + (Math.random() - 0.5) * 0.01, 
        lng: parseFloat(lng) + (Math.random() - 0.5) * 0.01 
      },
      distance: Math.floor(Math.random() * parseInt(radius)),
      rating: (3 + Math.random() * 2).toFixed(1)
    },
    {
      id: uuidv4(),
      name: 'Nearby Cafe',
      type: type || 'cafe',
      coordinates: { 
        lat: parseFloat(lat) + (Math.random() - 0.5) * 0.01, 
        lng: parseFloat(lng) + (Math.random() - 0.5) * 0.01 
      },
      distance: Math.floor(Math.random() * parseInt(radius)),
      rating: (3 + Math.random() * 2).toFixed(1)
    }
  ];

  res.json({ places: nearbyPlaces, center: { lat, lng }, radius });
});

// 17. Time Zone
router.post('/timezone', [
  body('coordinates').isObject(),
  body('timestamp').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { coordinates, timestamp } = req.body;
  
  // Mock timezone data
  const timezoneData = {
    coordinates,
    timezone: 'America/New_York',
    offset: '-05:00',
    dstOffset: '-04:00',
    currentTime: new Date().toISOString(),
    localTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  };

  res.json(timezoneData);
});

// 18. Elevation
router.post('/elevation', [
  body('coordinates').isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { coordinates } = req.body;
  
  // Mock elevation data
  const elevations = coordinates.map(coord => ({
    coordinates: coord,
    elevation: Math.floor(Math.random() * 1000), // meters
    resolution: 10
  }));

  res.json({ elevations });
});

// 19. Map Static
router.post('/map/static', [
  body('center').isObject(),
  body('zoom').isInt({ min: 1, max: 20 }),
  body('size').isString(),
  body('markers').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { center, zoom, size, markers } = req.body;
  
  const staticMap = {
    id: uuidv4(),
    url: `https://api.maps.com/static?center=${center.lat},${center.lng}&zoom=${zoom}&size=${size}`,
    center,
    zoom,
    size,
    markers: markers || [],
    generatedAt: new Date().toISOString()
  };

  res.json({ staticMap });
});

// 20. Area Calculation
router.post('/area', [
  body('coordinates').isArray(),
  body('unit').optional().isIn(['sqkm', 'sqmiles', 'sqmeters'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { coordinates, unit = 'sqkm' } = req.body;
  
  // Mock area calculation (would use actual polygon area formula)
  const area = (Math.random() * 100).toFixed(2);
  
  res.json({
    coordinates,
    area: parseFloat(area),
    unit,
    calculatedAt: new Date().toISOString()
  });
});

module.exports = router;