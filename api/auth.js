const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const users = [];
const refreshTokens = [];
const passwordResets = [];
const sessions = [];
const twoFactor = [];
const loginAttempts = [];
const permissions = [];
const roles = [];

// 1. Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }),
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

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    name,
    phone,
    isActive: true,
    emailVerified: false,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  
  const token = jwt.sign({ userId: user.id }, 'access-secret', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, 'refresh-secret', { expiresIn: '7d' });

  refreshTokens.push(refreshToken);

  res.status(201).json({
    message: 'User registered successfully',
    user: { id: user.id, email: user.email, name: user.name },
    token,
    refreshToken
  });
});

// 2. Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
  body('rememberMe').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, rememberMe } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    // Track failed login attempt
    loginAttempts.push({
      email,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      success: false
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(401).json({ error: 'Account is deactivated' });
  }

  // Check for too many failed attempts
  const recentAttempts = loginAttempts.filter(a => 
    a.email === email && 
    new Date() - new Date(a.timestamp) < 15 * 60 * 1000 && 
    !a.success
  );

  if (recentAttempts.length >= 5) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }

  const token = jwt.sign({ userId: user.id }, 'access-secret', { 
    expiresIn: rememberMe ? '7d' : '15m' 
  });
  const refreshToken = jwt.sign({ userId: user.id }, 'refresh-secret', { expiresIn: '30d' });

  refreshTokens.push(refreshToken);

  // Create session
  const session = {
    id: uuidv4(),
    userId: user.id,
    token,
    refreshToken,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    createdAt: new Date().toISOString()
  };

  sessions.push(session);

  // Track successful login
  loginAttempts.push({
    email,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    success: true
  });

  res.json({
    message: 'Login successful',
    user: { id: user.id, email: user.email, name: user.name },
    token,
    refreshToken,
    sessionId: session.id
  });
});

// 3. Refresh Token
router.post('/refresh', [
  body('refreshToken').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { refreshToken } = req.body;
  
  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, 'refresh-secret');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    const newToken = jwt.sign({ userId: user.id }, 'access-secret', { expiresIn: '15m' });
    
    res.json({ token: newToken });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// 4. Logout
router.post('/logout', [
  body('refreshToken').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { refreshToken } = req.body;
  const tokenIndex = refreshTokens.indexOf(refreshToken);
  
  if (tokenIndex > -1) {
    refreshTokens.splice(tokenIndex, 1);
  }

  res.json({ message: 'Logout successful' });
});

// 5. Logout All Sessions
router.post('/logout-all', [
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId } = req.body;
  
  // Remove all refresh tokens for user
  const userTokens = refreshTokens.filter(token => {
    try {
      const decoded = jwt.verify(token, 'refresh-secret');
      return decoded.userId === userId;
    } catch {
      return false;
    }
  });

  userTokens.forEach(token => {
    const tokenIndex = refreshTokens.indexOf(token);
    if (tokenIndex > -1) {
      refreshTokens.splice(tokenIndex, 1);
    }
  });

  res.json({ message: 'All sessions logged out successfully' });
});

// 6. Change Password
router.post('/change-password', [
  body('userId').exists(),
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!await bcrypt.compare(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.passwordUpdatedAt = new Date().toISOString();

  // Logout all other sessions
  refreshTokens.splice(0, refreshTokens.length);

  res.json({ message: 'Password changed successfully' });
});

// 7. Forgot Password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If an account with that email exists, a reset link has been sent' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetLink = `https://example.com/reset-password?token=${resetToken}`;

  const passwordReset = {
    id: uuidv4(),
    userId: user.id,
    token: resetToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    createdAt: new Date().toISOString()
  };

  passwordResets.push(passwordReset);

  res.json({ 
    message: 'If an account with that email exists, a reset link has been sent',
    resetToken // Only for demo - don't return in production
  });
});

// 8. Reset Password
router.post('/reset-password', [
  body('token').exists(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, newPassword } = req.body;
  const reset = passwordResets.find(r => r.token === token);
  
  if (!reset || new Date(reset.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const user = users.find(u => u.id === reset.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.passwordUpdatedAt = new Date().toISOString();

  // Remove used reset token
  const resetIndex = passwordResets.indexOf(reset);
  if (resetIndex > -1) {
    passwordResets.splice(resetIndex, 1);
  }

  res.json({ message: 'Password reset successfully' });
});

// 9. Verify Email
router.post('/verify-email', [
  body('token').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token } = req.body;
  const user = users.find(u => u.emailVerificationToken === token);
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid verification token' });
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerifiedAt = new Date().toISOString();

  res.json({ message: 'Email verified successfully' });
});

// 10. Enable 2FA
router.post('/2fa/enable', [
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const secret = crypto.randomBytes(20).toString('hex');
  const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());

  const twoFactorAuth = {
    id: uuidv4(),
    userId,
    secret,
    backupCodes,
    enabled: false, // Pending verification
    createdAt: new Date().toISOString()
  };

  twoFactor.push(twoFactorAuth);

  res.json({
    message: '2FA setup initiated',
    secret,
    backupCodes,
    qrCode: `otpauth://totp/Example:${user.email}?secret=${secret}&issuer=Example`
  });
});

// 11. Verify 2FA
router.post('/2fa/verify', [
  body('userId').exists(),
  body('code').isLength({ min: 6, max: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, code } = req.body;
  const userTwoFactor = twoFactor.find(t => t.userId === userId);
  
  if (!userTwoFactor) {
    return res.status(404).json({ error: '2FA not set up for user' });
  }

  // Mock verification (would use actual TOTP verification)
  const isValid = code === '123456'; // Demo code

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid 2FA code' });
  }

  userTwoFactor.enabled = true;
  userTwoFactor.verifiedAt = new Date().toISOString();

  res.json({ message: '2FA enabled successfully' });
});

// 12. Disable 2FA
router.post('/2fa/disable', [
  body('userId').exists(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, password } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const twoFactorIndex = twoFactor.findIndex(t => t.userId === userId);
  if (twoFactorIndex > -1) {
    twoFactor.splice(twoFactorIndex, 1);
  }

  res.json({ message: '2FA disabled successfully' });
});

// 13. Get Sessions
router.get('/sessions/:userId', (req, res) => {
  const { userId } = req.params;
  const userSessions = sessions.filter(s => s.userId === userId);
  
  res.json({ sessions: userSessions });
});

// 14. Revoke Session
router.delete('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions[sessionIndex];
  sessions.splice(sessionIndex, 1);

  // Remove refresh token
  const tokenIndex = refreshTokens.indexOf(session.refreshToken);
  if (tokenIndex > -1) {
    refreshTokens.splice(tokenIndex, 1);
  }

  res.json({ message: 'Session revoked successfully' });
});

// 15. Check Auth Status
router.get('/status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, 'access-secret');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name },
      emailVerified: user.emailVerified,
      twoFactorEnabled: twoFactor.some(t => t.userId === user.id && t.enabled)
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
});

module.exports = router;