const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const notifications = [];
const devices = [];
const templates = [];
const campaigns = [];
const subscriptions = [];
const schedules = [];
const preferences = [];

// 1. Send Notification
router.post('/send', [
  body('userId').exists(),
  body('title').isLength({ min: 1, max: 100 }),
  body('message').isLength({ min: 1, max: 500 }),
  body('type').isIn(['push', 'email', 'sms', 'inapp']),
  body('data').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const notification = {
    id: uuidv4(),
    ...req.body,
    status: 'sent',
    read: false,
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString()
  };

  notifications.push(notification);
  res.status(201).json({ message: 'Notification sent successfully', notification });
});

// 2. Send Bulk Notification
router.post('/bulk', [
  body('userIds').isArray(),
  body('title').isLength({ min: 1, max: 100 }),
  body('message').isLength({ min: 1, max: 500 }),
  body('type').isIn(['push', 'email', 'sms', 'inapp'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userIds, title, message, type, data } = req.body;
  const sentNotifications = [];

  userIds.forEach(userId => {
    const notification = {
      id: uuidv4(),
      userId,
      title,
      message,
      type,
      data: data || {},
      status: 'sent',
      read: false,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString()
    };
    notifications.push(notification);
    sentNotifications.push(notification);
  });

  res.status(201).json({ 
    message: 'Bulk notifications sent successfully', 
    sentCount: sentNotifications.length,
    notifications: sentNotifications.slice(0, 5) // Return first 5 for preview
  });
});

// 3. Get User Notifications
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const type = req.query.type;
  const read = req.query.read;

  let userNotifications = notifications.filter(n => n.userId === userId);
  
  if (type) {
    userNotifications = userNotifications.filter(n => n.type === type);
  }
  
  if (read !== undefined) {
    userNotifications = userNotifications.filter(n => n.read === (read === 'true'));
  }

  userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = userNotifications.slice(startIndex, endIndex);

  const unreadCount = userNotifications.filter(n => !n.read).length;

  res.json({
    notifications: result,
    unreadCount,
    pagination: {
      page,
      limit,
      total: userNotifications.length,
      pages: Math.ceil(userNotifications.length / limit)
    }
  });
});

// 4. Mark as Read
router.patch('/:notificationId/read', (req, res) => {
  const { notificationId } = req.params;
  const notificationIndex = notifications.findIndex(n => n.id === notificationId);
  
  if (notificationIndex === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  notifications[notificationIndex].read = true;
  notifications[notificationIndex].readAt = new Date().toISOString();

  res.json({ message: 'Notification marked as read', notification: notifications[notificationIndex] });
});

// 5. Mark All as Read
router.patch('/user/:userId/read-all', (req, res) => {
  const { userId } = req.params;
  const userNotifications = notifications.filter(n => n.userId === userId);
  
  userNotifications.forEach(notification => {
    notification.read = true;
    notification.readAt = new Date().toISOString();
  });

  res.json({ message: 'All notifications marked as read', count: userNotifications.length });
});

// 6. Delete Notification
router.delete('/:notificationId', (req, res) => {
  const { notificationId } = req.params;
  const notificationIndex = notifications.findIndex(n => n.id === notificationId);
  
  if (notificationIndex === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  notifications.splice(notificationIndex, 1);
  res.json({ message: 'Notification deleted successfully' });
});

// 7. Register Device
router.post('/devices', [
  body('userId').exists(),
  body('deviceId').exists(),
  body('type').isIn(['ios', 'android', 'web']),
  body('token').exists(),
  body('platform').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if device already exists
  const existingDevice = devices.find(d => d.deviceId === req.body.deviceId);
  if (existingDevice) {
    existingDevice.token = req.body.token;
    existingDevice.updatedAt = new Date().toISOString();
    return res.json({ message: 'Device updated successfully', device: existingDevice });
  }

  const device = {
    id: uuidv4(),
    ...req.body,
    active: true,
    createdAt: new Date().toISOString()
  };

  devices.push(device);
  res.status(201).json({ message: 'Device registered successfully', device });
});

// 8. Get User Devices
router.get('/devices/:userId', (req, res) => {
  const { userId } = req.params;
  const userDevices = devices.filter(d => d.userId === userId && d.active);
  
  res.json({ devices: userDevices });
});

// 9. Unregister Device
router.delete('/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const deviceIndex = devices.findIndex(d => d.deviceId === deviceId);
  
  if (deviceIndex === -1) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devices[deviceIndex].active = false;
  devices[deviceIndex].unregisteredAt = new Date().toISOString();

  res.json({ message: 'Device unregistered successfully' });
});

// 10. Create Template
router.post('/templates', [
  body('name').isLength({ min: 3 }),
  body('type').isIn(['push', 'email', 'sms', 'inapp']),
  body('title').isLength({ min: 1 }),
  body('message').isLength({ min: 1 }),
  body('variables').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const template = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  templates.push(template);
  res.status(201).json({ message: 'Template created successfully', template });
});

// 11. Get Templates
router.get('/templates', (req, res) => {
  const type = req.query.type;
  
  let filteredTemplates = templates;
  if (type) {
    filteredTemplates = filteredTemplates.filter(t => t.type === type);
  }

  res.json({ templates: filteredTemplates });
});

// 12. Send from Template
router.post('/send-template', [
  body('templateId').exists(),
  body('userId').exists(),
  body('variables').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { templateId, userId, variables } = req.body;
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Replace variables in template
  let title = template.title;
  let message = template.message;
  
  if (variables) {
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
      message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
    });
  }

  const notification = {
    id: uuidv4(),
    userId,
    title,
    message,
    type: template.type,
    templateId,
    status: 'sent',
    read: false,
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString()
  };

  notifications.push(notification);
  res.status(201).json({ message: 'Template notification sent', notification });
});

// 13. Create Campaign
router.post('/campaigns', [
  body('name').isLength({ min: 3 }),
  body('templateId').exists(),
  body('targetAudience').exists(),
  body('scheduledFor').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const campaign = {
    id: uuidv4(),
    ...req.body,
    status: req.body.scheduledFor ? 'scheduled' : 'draft',
    sentCount: 0,
    createdAt: new Date().toISOString()
  };

  campaigns.push(campaign);
  res.status(201).json({ message: 'Campaign created successfully', campaign });
});

// 14. Get Campaigns
router.get('/campaigns', (req, res) => {
  const status = req.query.status;
  
  let filteredCampaigns = campaigns;
  if (status) {
    filteredCampaigns = filteredCampaigns.filter(c => c.status === status);
  }

  res.json({ campaigns: filteredCampaigns });
});

// 15. Execute Campaign
router.post('/campaigns/:campaignId/execute', (req, res) => {
  const { campaignId } = req.params;
  const campaign = campaigns.find(c => c.id === campaignId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const template = templates.find(t => t.id === campaign.templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Send notifications to target audience
  const { targetAudience } = campaign;
  let sentCount = 0;

  targetAudience.forEach(userId => {
    const notification = {
      id: uuidv4(),
      userId,
      title: template.title,
      message: template.message,
      type: template.type,
      campaignId,
      status: 'sent',
      read: false,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString()
    };
    notifications.push(notification);
    sentCount++;
  });

  campaign.status = 'executed';
  campaign.executedAt = new Date().toISOString();
  campaign.sentCount = sentCount;

  res.json({ message: 'Campaign executed successfully', campaign });
});

// 16. Subscribe to Topic
router.post('/subscribe', [
  body('userId').exists(),
  body('topic').exists(),
  body('deviceId').optional().exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const subscription = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription created successfully', subscription });
});

// 17. Unsubscribe from Topic
router.delete('/subscribe/:subscriptionId', (req, res) => {
  const { subscriptionId } = req.params;
  const subscriptionIndex = subscriptions.findIndex(s => s.id === subscriptionId);
  
  if (subscriptionIndex === -1) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  subscriptions.splice(subscriptionIndex, 1);
  res.json({ message: 'Unsubscribed successfully' });
});

// 18. Get User Subscriptions
router.get('/subscriptions/:userId', (req, res) => {
  const { userId } = req.params;
  const userSubscriptions = subscriptions.filter(s => s.userId === userId);
  
  const topics = [...new Set(userSubscriptions.map(s => s.topic))];
  
  res.json({ subscriptions: userSubscriptions, topics });
});

// 19. Schedule Notification
router.post('/schedule', [
  body('userId').exists(),
  body('title').isLength({ min: 1, max: 100 }),
  body('message').isLength({ min: 1, max: 500 }),
  body('type').isIn(['push', 'email', 'sms', 'inapp']),
  body('scheduledFor').isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const schedule = {
    id: uuidv4(),
    ...req.body,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  schedules.push(schedule);
  res.status(201).json({ message: 'Notification scheduled successfully', schedule });
});

// 20. Get Scheduled Notifications
router.get('/scheduled', (req, res) => {
  const userId = req.query.userId;
  
  let filteredSchedules = schedules.filter(s => s.status === 'scheduled');
  if (userId) {
    filteredSchedules = filteredSchedules.filter(s => s.userId === userId);
  }

  res.json({ schedules: filteredSchedules });
});

module.exports = router;