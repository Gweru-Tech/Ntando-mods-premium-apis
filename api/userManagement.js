const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock database
const users = [];
const profiles = [];
const sessions = [];

// 1. Register User
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').isLength({ min: 2 }),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, phone } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    name,
    phone,
    createdAt: new Date().toISOString(),
    isActive: true
  };

  users.push(user);
  res.status(201).json({ 
    message: 'User registered successfully', 
    userId: user.id,
    email: user.email,
    name: user.name
  });
});

// 2. Login User
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, 'your-secret-key', { expiresIn: '24h' });
  const session = {
    id: uuidv4(),
    userId: user.id,
    token,
    createdAt: new Date().toISOString()
  };
  sessions.push(session);

  res.json({ 
    message: 'Login successful', 
    token,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

// 3. Get User Profile
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  const profile = profiles.find(p => p.userId === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
    profile: profile || { bio: '', avatar: '', socialLinks: {} }
  });
});

// 4. Update User Profile
router.put('/profile/:userId', [
  body('bio').optional().isLength({ max: 500 }),
  body('avatar').optional().isURL(),
  body('socialLinks').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId } = req.params;
  const { bio, avatar, socialLinks } = req.body;
  
  let profile = profiles.find(p => p.userId === userId);
  if (!profile) {
    profile = { userId: userId, bio: '', avatar: '', socialLinks: {} };
    profiles.push(profile);
  }

  if (bio !== undefined) profile.bio = bio;
  if (avatar !== undefined) profile.avatar = avatar;
  if (socialLinks !== undefined) profile.socialLinks = socialLinks;
  profile.updatedAt = new Date().toISOString();

  res.json({ message: 'Profile updated successfully', profile });
});

// 5. Get All Users
router.get('/all', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const result = users.slice(startIndex, endIndex).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    isActive: u.isActive
  }));

  res.json({
    users: result,
    pagination: {
      page,
      limit,
      total: users.length,
      pages: Math.ceil(users.length / limit)
    }
  });
});

// 6. Search Users
router.get('/search', (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchResults = users.filter(u => 
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase())
  );

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = searchResults.slice(startIndex, endIndex);

  res.json({
    users: result,
    query: q,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: searchResults.length
    }
  });
});

// 7. Delete User
router.delete('/:userId', (req, res) => {
  const { userId } = req.params;
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.splice(userIndex, 1);
  const profileIndex = profiles.findIndex(p => p.userId === userId);
  if (profileIndex !== -1) profiles.splice(profileIndex, 1);
  
  res.json({ message: 'User deleted successfully' });
});

// 8. Update User Status
router.patch('/:userId/status', [
  body('isActive').isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId } = req.params;
  const { isActive } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.isActive = isActive;
  user.updatedAt = new Date().toISOString();

  res.json({ message: 'User status updated successfully', user: { id: user.id, isActive: user.isActive } });
});

// 9. Get User Stats
router.get('/:userId/stats', (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const stats = {
    userId,
    accountAge: Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)),
    isActive: user.isActive,
    lastLogin: new Date().toISOString(),
    profileComplete: profiles.some(p => p.userId === userId)
  };

  res.json(stats);
});

// 10. Logout User
router.post('/logout', [
  body('token').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token } = req.body;
  const sessionIndex = sessions.findIndex(s => s.token === token);
  
  if (sessionIndex !== -1) {
    sessions.splice(sessionIndex, 1);
  }

  res.json({ message: 'Logout successful' });
});

module.exports = router;