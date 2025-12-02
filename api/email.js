const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const emails = [];
const templates = [];
const campaigns = [];
const subscriptions = [];
const analytics = [];
const schedules = [];
const bounces = [];
const deliveries = [];

// 1. Send Email
router.post('/send', [
  body('to').isArray(),
  body('subject').isLength({ min: 1, max: 200 }),
  body('html').exists(),
  body('text').optional().isString(),
  body('from').optional().isEmail(),
  body('cc').optional().isArray(),
  body('bcc').optional().isArray(),
  body('attachments').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const emailData = {
    id: uuidv4(),
    ...req.body,
    status: 'sent',
    sentAt: new Date().toISOString(),
    messageId: `msg-${uuidv4()}@example.com`
  };

  emails.push(emailData);

  // Track delivery
  req.body.to.forEach(recipient => {
    const delivery = {
      id: uuidv4(),
      emailId: emailData.id,
      recipient,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      opened: false,
      clicked: false
    };
    deliveries.push(delivery);
  });

  res.status(201).json({ message: 'Email sent successfully', email: emailData });
});

// 2. Send Bulk Email
router.post('/send-bulk', [
  body('recipients').isArray(),
  body('subject').isLength({ min: 1, max: 200 }),
  body('html').exists(),
  body('batchSize').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { recipients, subject, html, batchSize = 100 } = req.body;
  const batches = Math.ceil(recipients.length / batchSize);
  const sentEmails = [];

  for (let i = 0; i < batches; i++) {
    const batch = recipients.slice(i * batchSize, (i + 1) * batchSize);
    const emailData = {
      id: uuidv4(),
      to: batch,
      subject,
      html,
      status: 'sent',
      sentAt: new Date().toISOString(),
      messageId: `msg-${uuidv4()}@example.com`,
      batch: i + 1
    };

    emails.push(emailData);
    sentEmails.push(emailData);

    // Track deliveries
    batch.forEach(recipient => {
      const delivery = {
        id: uuidv4(),
        emailId: emailData.id,
        recipient,
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        opened: false,
        clicked: false
      };
      deliveries.push(delivery);
    });
  }

  res.status(201).json({
    message: 'Bulk emails sent successfully',
    totalSent: sentEmails.length,
    totalRecipients: recipients.length,
    emails: sentEmails.slice(0, 5) // Return first 5 for preview
  });
});

// 3. Get Email History
router.get('/history', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  let filteredEmails = emails;
  
  if (status) {
    filteredEmails = filteredEmails.filter(e => e.status === status);
  }
  
  if (startDate) {
    filteredEmails = filteredEmails.filter(e => new Date(e.sentAt) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredEmails = filteredEmails.filter(e => new Date(e.sentAt) <= new Date(endDate));
  }

  filteredEmails.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredEmails.slice(startIndex, endIndex);

  res.json({
    emails: result,
    pagination: {
      page,
      limit,
      total: filteredEmails.length,
      pages: Math.ceil(filteredEmails.length / limit)
    }
  });
});

// 4. Get Email by ID
router.get('/email/:emailId', (req, res) => {
  const { emailId } = req.params;
  const email = emails.find(e => e.id === emailId);
  
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }

  const emailDeliveries = deliveries.filter(d => d.emailId === emailId);
  
  res.json({ 
    email, 
    deliveries: emailDeliveries,
    stats: {
      totalRecipients: emailDeliveries.length,
      delivered: emailDeliveries.filter(d => d.status === 'delivered').length,
      opened: emailDeliveries.filter(d => d.opened).length,
      clicked: emailDeliveries.filter(d => d.clicked).length
    }
  });
});

// 5. Create Template
router.post('/templates', [
  body('name').isLength({ min: 3 }),
  body('subject').isLength({ min: 1 }),
  body('html').exists(),
  body('text').optional().isString(),
  body('variables').optional().isArray(),
  body('category').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const template = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    usageCount: 0
  };

  templates.push(template);
  res.status(201).json({ message: 'Template created successfully', template });
});

// 6. Get Templates
router.get('/templates', (req, res) => {
  const category = req.query.category;
  
  let filteredTemplates = templates;
  if (category) {
    filteredTemplates = filteredTemplates.filter(t => t.category === category);
  }

  res.json({ templates: filteredTemplates });
});

// 7. Send from Template
router.post('/send-template', [
  body('templateId').exists(),
  body('to').isArray(),
  body('variables').optional().isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { templateId, to, variables } = req.body;
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Replace variables in template
  let subject = template.subject;
  let html = template.html;
  let text = template.text;
  
  if (variables) {
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), variables[key]);
      html = html.replace(new RegExp(placeholder, 'g'), variables[key]);
      if (text) {
        text = text.replace(new RegExp(placeholder, 'g'), variables[key]);
      }
    });
  }

  const emailData = {
    id: uuidv4(),
    to,
    subject,
    html,
    text,
    templateId,
    status: 'sent',
    sentAt: new Date().toISOString(),
    messageId: `msg-${uuidv4()}@example.com`
  };

  emails.push(emailData);
  template.usageCount += 1;

  // Track deliveries
  to.forEach(recipient => {
    const delivery = {
      id: uuidv4(),
      emailId: emailData.id,
      recipient,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      opened: false,
      clicked: false
    };
    deliveries.push(delivery);
  });

  res.status(201).json({ message: 'Template email sent', email: emailData });
});

// 8. Create Campaign
router.post('/campaigns', [
  body('name').isLength({ min: 3 }),
  body('templateId').exists(),
  body('recipientList').isArray(),
  body('scheduledFor').optional().isISO8601(),
  body('timezone').optional().isString()
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

// 9. Get Campaigns
router.get('/campaigns', (req, res) => {
  const status = req.query.status;
  
  let filteredCampaigns = campaigns;
  if (status) {
    filteredCampaigns = filteredCampaigns.filter(c => c.status === status);
  }

  res.json({ campaigns: filteredCampaigns });
});

// 10. Execute Campaign
router.post('/campaigns/:campaignId/execute', async (req, res) => {
  const { campaignId } = req.params;
  const campaign = campaigns.find(c => c.id === campaignId);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const template = templates.find(t => t.id === campaign.templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  let sentCount = 0;
  campaign.recipientList.forEach(recipient => {
    const emailData = {
      id: uuidv4(),
      to: [recipient.email],
      subject: template.subject,
      html: template.html,
      text: template.text,
      campaignId,
      status: 'sent',
      sentAt: new Date().toISOString(),
      messageId: `msg-${uuidv4()}@example.com`
    };

    emails.push(emailData);
    sentCount++;

    // Track delivery
    const delivery = {
      id: uuidv4(),
      emailId: emailData.id,
      recipient: recipient.email,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      opened: false,
      clicked: false
    };
    deliveries.push(delivery);
  });

  campaign.status = 'executed';
  campaign.executedAt = new Date().toISOString();
  campaign.sentCount = sentCount;
  template.usageCount += sentCount;

  res.json({ message: 'Campaign executed successfully', campaign });
});

// 11. Subscribe to Newsletter
router.post('/subscribe', [
  body('email').isEmail().normalizeEmail(),
  body('listId').optional().isString(),
  body('name').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const subscription = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    subscribedAt: new Date().toISOString(),
    confirmed: false
  };

  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription successful', subscription });
});

// 12. Unsubscribe
router.post('/unsubscribe', [
  body('email').isEmail().normalizeEmail(),
  body('listId').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, listId } = req.body;
  const subscriptionIndex = subscriptions.findIndex(s => 
    s.email === email && (!listId || s.listId === listId)
  );
  
  if (subscriptionIndex !== -1) {
    subscriptions[subscriptionIndex].status = 'unsubscribed';
    subscriptions[subscriptionIndex].unsubscribedAt = new Date().toISOString();
  }

  res.json({ message: 'Unsubscribed successfully' });
});

// 13. Get Subscriptions
router.get('/subscriptions', (req, res) => {
  const status = req.query.status;
  const listId = req.query.listId;
  
  let filteredSubscriptions = subscriptions;
  if (status) {
    filteredSubscriptions = filteredSubscriptions.filter(s => s.status === status);
  }
  if (listId) {
    filteredSubscriptions = filteredSubscriptions.filter(s => s.listId === listId);
  }

  res.json({ subscriptions: filteredSubscriptions });
});

// 14. Schedule Email
router.post('/schedule', [
  body('to').isArray(),
  body('subject').isLength({ min: 1, max: 200 }),
  body('html').exists(),
  body('scheduledFor').isISO8601(),
  body('timezone').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const scheduledEmail = {
    id: uuidv4(),
    ...req.body,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  schedules.push(scheduledEmail);
  res.status(201).json({ message: 'Email scheduled successfully', scheduledEmail });
});

// 15. Get Scheduled Emails
router.get('/scheduled', (req, res) => {
  const status = req.query.status || 'scheduled';
  
  const filteredSchedules = schedules.filter(s => s.status === status);
  filteredSchedules.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

  res.json({ schedules: filteredSchedules });
});

// 16. Track Email Open
router.post('/track/open/:emailId', (req, res) => {
  const { emailId } = req.params;
  const recipient = req.query.recipient;
  
  const delivery = deliveries.find(d => 
    d.emailId === emailId && d.recipient === recipient
  );
  
  if (delivery && !delivery.opened) {
    delivery.opened = true;
    delivery.openedAt = new Date().toISOString();

    // Track analytics
    const analytic = {
      id: uuidv4(),
      emailId,
      recipient,
      type: 'open',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    analytics.push(analytic);
  }

  // Return 1x1 transparent pixel
  res.setHeader('Content-Type', 'image/png');
  res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==', 'base64'));
});

// 17. Track Email Click
router.get('/track/click/:emailId', (req, res) => {
  const { emailId } = req.params;
  const recipient = req.query.recipient;
  const url = req.query.url;
  
  const delivery = deliveries.find(d => 
    d.emailId === emailId && d.recipient === recipient
  );
  
  if (delivery && !delivery.clicked) {
    delivery.clicked = true;
    delivery.clickedAt = new Date().toISOString();

    // Track analytics
    const analytic = {
      id: uuidv4(),
      emailId,
      recipient,
      type: 'click',
      url,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    analytics.push(analytic);
  }

  res.redirect(url || 'https://example.com');
});

// 18. Get Email Analytics
router.get('/analytics/:emailId', (req, res) => {
  const { emailId } = req.params;
  const email = emails.find(e => e.id === emailId);
  
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }

  const emailDeliveries = deliveries.filter(d => d.emailId === emailId);
  const emailAnalytics = analytics.filter(a => a.emailId === emailId);

  const opens = emailAnalytics.filter(a => a.type === 'open').length;
  const clicks = emailAnalytics.filter(a => a.type === 'click').length;
  const uniqueOpens = new Set(emailAnalytics.filter(a => a.type === 'open').map(a => a.recipient)).size;
  const uniqueClicks = new Set(emailAnalytics.filter(a => a.type === 'click').map(a => a.recipient)).size;

  const stats = {
    emailId,
    totalRecipients: emailDeliveries.length,
    delivered: emailDeliveries.filter(d => d.status === 'delivered').length,
    totalOpens: opens,
    uniqueOpens,
    totalClicks: clicks,
    uniqueClicks,
    openRate: emailDeliveries.length > 0 ? (uniqueOpens / emailDeliveries.length * 100).toFixed(2) : 0,
    clickRate: emailDeliveries.length > 0 ? (uniqueClicks / emailDeliveries.length * 100).toFixed(2) : 0
  };

  res.json(stats);
});

// 19. Handle Bounce
router.post('/bounce', [
  body('emailId').exists(),
  body('recipient').exists(),
  body('bounceType').isIn(['hard', 'soft']),
  body('reason').isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bounce = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString()
  };

  bounces.push(bounce);

  // Update delivery status
  const delivery = deliveries.find(d => 
    d.emailId === bounce.emailId && d.recipient === bounce.recipient
  );
  
  if (delivery) {
    delivery.status = 'bounced';
    delivery.bouncedAt = new Date().toISOString();
    delivery.bounceType = bounce.bounceType;
  }

  res.status(201).json({ message: 'Bounce recorded', bounce });
});

// 20. Get Email Stats
router.get('/stats', (req, res) => {
  const { startDate, endDate, period = '7d' } = req.query;
  
  let filteredEmails = emails;
  let filteredDeliveries = deliveries;
  
  if (startDate) {
    filteredEmails = filteredEmails.filter(e => new Date(e.sentAt) >= new Date(startDate));
    filteredDeliveries = filteredDeliveries.filter(d => new Date(d.deliveredAt) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredEmails = filteredEmails.filter(e => new Date(e.sentAt) <= new Date(endDate));
    filteredDeliveries = filteredDeliveries.filter(d => new Date(d.deliveredAt) <= new Date(endDate));
  }

  const totalSent = filteredEmails.length;
  const totalDeliveries = filteredDeliveries.length;
  const totalOpens = filteredDeliveries.filter(d => d.opened).length;
  const totalClicks = filteredDeliveries.filter(d => d.clicked).length;
  const totalBounces = bounces.length;

  const stats = {
    period,
    totalSent,
    totalDeliveries,
    deliveryRate: totalSent > 0 ? (totalDeliveries / totalSent * 100).toFixed(2) : 0,
    totalOpens,
    openRate: totalDeliveries > 0 ? (totalOpens / totalDeliveries * 100).toFixed(2) : 0,
    totalClicks,
    clickRate: totalDeliveries > 0 ? (totalClicks / totalDeliveries * 100).toFixed(2) : 0,
    totalBounces,
    bounceRate: totalSent > 0 ? (totalBounces / totalSent * 100).toFixed(2) : 0
  };

  res.json(stats);
});

module.exports = router;