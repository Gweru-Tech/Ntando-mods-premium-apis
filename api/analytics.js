const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const events = [];
const pageViews = [];
const users = [];
const sessions = [];
const conversions = [];
const funnels = [];
const reports = [];
const dashboards = [];

// 1. Track Event
router.post('/events', [
  body('userId').optional().isUUID(),
  body('sessionId').optional().isUUID(),
  body('event').exists(),
  body('properties').optional().isObject(),
  body('timestamp').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const event = {
    id: uuidv4(),
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  events.push(event);
  res.status(201).json({ message: 'Event tracked successfully', event });
});

// 2. Track Page View
router.post('/pageviews', [
  body('userId').optional().isUUID(),
  body('sessionId').optional().isUUID(),
  body('page').exists(),
  body('title').optional().isString(),
  body('referrer').optional().isURL(),
  body('duration').optional().isInt({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const pageView = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString(),
    ip: req.ip
  };

  pageViews.push(pageView);
  res.status(201).json({ message: 'Page view tracked successfully', pageView });
});

// 3. Get Event Analytics
router.get('/events', (req, res) => {
  const { startDate, endDate, userId, event, page = 1, limit = 10 } = req.query;
  
  let filteredEvents = events;
  
  if (startDate) {
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= new Date(endDate));
  }
  
  if (userId) {
    filteredEvents = filteredEvents.filter(e => e.userId === userId);
  }
  
  if (event) {
    filteredEvents = filteredEvents.filter(e => e.event === event);
  }

  // Calculate analytics
  const eventCounts = {};
  filteredEvents.forEach(e => {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  });

  const totalEvents = filteredEvents.length;
  const uniqueEvents = Object.keys(eventCounts).length;

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredEvents.slice(startIndex, endIndex);

  res.json({
    events: result,
    analytics: {
      totalEvents,
      uniqueEvents,
      eventCounts,
      dateRange: { startDate, endDate }
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredEvents.length
    }
  });
});

// 4. Get Page View Analytics
router.get('/pageviews', (req, res) => {
  const { startDate, endDate, userId, page = 1, limit = 10 } = req.query;
  
  let filteredPageViews = pageViews;
  
  if (startDate) {
    filteredPageViews = filteredPageViews.filter(pv => new Date(pv.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredPageViews = filteredPageViews.filter(pv => new Date(pv.timestamp) <= new Date(endDate));
  }
  
  if (userId) {
    filteredPageViews = filteredPageViews.filter(pv => pv.userId === userId);
  }

  // Calculate page analytics
  const pageCounts = {};
  let totalDuration = 0;
  
  filteredPageViews.forEach(pv => {
    pageCounts[pv.page] = (pageCounts[pv.page] || 0) + 1;
    if (pv.duration) {
      totalDuration += pv.duration;
    }
  });

  const totalPageViews = filteredPageViews.length;
  const uniquePages = Object.keys(pageCounts).length;
  const averageDuration = filteredPageViews.filter(pv => pv.duration).length > 0 
    ? totalDuration / filteredPageViews.filter(pv => pv.duration).length 
    : 0;

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredPageViews.slice(startIndex, endIndex);

  res.json({
    pageViews: result,
    analytics: {
      totalPageViews,
      uniquePages,
      pageCounts,
      averageDuration,
      dateRange: { startDate, endDate }
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredPageViews.length
    }
  });
});

// 5. Get User Analytics
router.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userEvents = events.filter(e => e.userId === userId);
  const userPageViews = pageViews.filter(pv => pv.userId === userId);
  const userSessions = sessions.filter(s => s.userId === userId);

  // Calculate user-specific analytics
  const eventCounts = {};
  userEvents.forEach(e => {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  });

  const pageCounts = {};
  userPageViews.forEach(pv => {
    pageCounts[pv.page] = (pageCounts[pv.page] || 0) + 1;
  });

  const analytics = {
    userId,
    totalEvents: userEvents.length,
    totalPageViews: userPageViews.length,
    totalSessions: userSessions.length,
    eventCounts,
    pageCounts,
    firstActivity: userEvents.length > 0 ? userEvents[0].timestamp : null,
    lastActivity: userEvents.length > 0 ? userEvents[userEvents.length - 1].timestamp : null
  };

  res.json(analytics);
});

// 6. Create Funnel
router.post('/funnels', [
  body('name').isLength({ min: 3 }),
  body('steps').isArray(),
  body('description').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const funnel = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    conversionRate: 0
  };

  funnels.push(funnel);
  res.status(201).json({ message: 'Funnel created successfully', funnel });
});

// 7. Get Funnel Analytics
router.get('/funnels/:funnelId', (req, res) => {
  const { funnelId } = req.params;
  const { startDate, endDate } = req.query;
  
  const funnel = funnels.find(f => f.id === funnelId);
  if (!funnel) {
    return res.status(404).json({ error: 'Funnel not found' });
  }

  // Calculate funnel conversion rates
  let filteredEvents = events;
  
  if (startDate) {
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= new Date(endDate));
  }

  const funnelSteps = funnel.steps.map((step, index) => {
    const stepEvents = filteredEvents.filter(e => e.event === step.event);
    const userCount = new Set(stepEvents.map(e => e.userId)).size;
    
    return {
      ...step,
      userCount,
      dropOffRate: index > 0 ? ((funnel.steps[index - 1].userCount - userCount) / funnel.steps[index - 1].userCount * 100) : 0
    };
  });

  const totalUsers = funnelSteps.length > 0 ? funnelSteps[0].userCount : 0;
  const completedUsers = funnelSteps.length > 0 ? funnelSteps[funnelSteps.length - 1].userCount : 0;
  const conversionRate = totalUsers > 0 ? (completedUsers / totalUsers * 100) : 0;

  res.json({
    funnel: { ...funnel, steps: funnelSteps },
    conversionRate,
    totalUsers,
    completedUsers
  });
});

// 8. Track Conversion
router.post('/conversions', [
  body('userId').optional().isUUID(),
  body('funnelId').exists(),
  body('event').exists(),
  body('value').optional().isFloat({ min: 0 }),
  body('currency').optional().isLength({ min: 3, max: 3 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const conversion = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString(),
    ip: req.ip
  };

  conversions.push(conversion);
  res.status(201).json({ message: 'Conversion tracked successfully', conversion });
});

// 9. Get Conversion Analytics
router.get('/conversions', (req, res) => {
  const { startDate, endDate, funnelId, page = 1, limit = 10 } = req.query;
  
  let filteredConversions = conversions;
  
  if (startDate) {
    filteredConversions = filteredConversions.filter(c => new Date(c.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredConversions = filteredConversions.filter(c => new Date(c.timestamp) <= new Date(endDate));
  }
  
  if (funnelId) {
    filteredConversions = filteredConversions.filter(c => c.funnelId === funnelId);
  }

  // Calculate conversion analytics
  const totalConversions = filteredConversions.length;
  const totalValue = filteredConversions.reduce((sum, c) => sum + (c.value || 0), 0);
  const averageValue = totalConversions > 0 ? totalValue / totalConversions : 0;

  const conversionCounts = {};
  filteredConversions.forEach(c => {
    conversionCounts[c.event] = (conversionCounts[c.event] || 0) + 1;
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredConversions.slice(startIndex, endIndex);

  res.json({
    conversions: result,
    analytics: {
      totalConversions,
      totalValue,
      averageValue,
      conversionCounts
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredConversions.length
    }
  });
});

// 10. Create Report
router.post('/reports', [
  body('name').isLength({ min: 3 }),
  body('type').isIn(['events', 'pageviews', 'conversions', 'funnel']),
  body('filters').optional().isObject(),
  body('schedule').optional().isIn(['daily', 'weekly', 'monthly'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const report = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    lastGenerated: null,
    data: null
  };

  reports.push(report);
  res.status(201).json({ message: 'Report created successfully', report });
});

// 11. Get Reports
router.get('/reports', (req, res) => {
  const { type, schedule } = req.query;
  
  let filteredReports = reports;
  
  if (type) {
    filteredReports = filteredReports.filter(r => r.type === type);
  }
  
  if (schedule) {
    filteredReports = filteredReports.filter(r => r.schedule === schedule);
  }

  res.json({ reports: filteredReports });
});

// 12. Generate Report
router.post('/reports/:reportId/generate', (req, res) => {
  const { reportId } = req.params;
  const report = reports.find(r => r.id === reportId);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  let data = {};
  
  switch (report.type) {
    case 'events':
      data = {
        totalEvents: events.length,
        uniqueEvents: [...new Set(events.map(e => e.event))].length,
        recentEvents: events.slice(-10)
      };
      break;
    case 'pageviews':
      data = {
        totalPageViews: pageViews.length,
        uniquePages: [...new Set(pageViews.map(pv => pv.page))].length,
        recentPageViews: pageViews.slice(-10)
      };
      break;
    case 'conversions':
      data = {
        totalConversions: conversions.length,
        totalValue: conversions.reduce((sum, c) => sum + (c.value || 0), 0),
        recentConversions: conversions.slice(-10)
      };
      break;
    default:
      data = { message: 'Report data generated' };
  }

  report.data = data;
  report.lastGenerated = new Date().toISOString();

  res.json({ message: 'Report generated successfully', report });
});

// 13. Get Real-time Stats
router.get('/realtime', (req, res) => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  const recentEvents = events.filter(e => new Date(e.timestamp) >= fiveMinutesAgo);
  const recentPageViews = pageViews.filter(pv => new Date(pv.timestamp) >= fiveMinutesAgo);
  const activeUsers = [...new Set(recentEvents.map(e => e.userId).filter(Boolean))];

  const stats = {
    activeUsers: activeUsers.length,
    eventsLast5Minutes: recentEvents.length,
    pageViewsLast5Minutes: recentPageViews.length,
    timestamp: now.toISOString()
  };

  res.json(stats);
});

// 14. Export Data
router.post('/export', [
  body('type').isIn(['events', 'pageviews', 'conversions']),
  body('format').isIn(['json', 'csv']),
  body('filters').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, format, filters } = req.body;
  let data = [];

  switch (type) {
    case 'events':
      data = events;
      break;
    case 'pageviews':
      data = pageViews;
      break;
    case 'conversions':
      data = conversions;
      break;
  }

  if (filters) {
    // Apply filters (simplified for demo)
    if (filters.startDate) {
      data = data.filter(item => new Date(item.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      data = data.filter(item => new Date(item.timestamp) <= new Date(filters.endDate));
    }
  }

  const exportId = uuidv4();
  
  res.json({
    message: 'Data export initiated',
    exportId,
    type,
    format,
    recordCount: data.length,
    downloadUrl: `/api/analytics/export/${exportId}`
  });
});

// 15. Get Dashboard Data
router.get('/dashboard/:dashboardId', (req, res) => {
  const { dashboardId } = req.params;
  
  // Mock dashboard data
  const dashboardData = {
    id: dashboardId,
    widgets: [
      {
        type: 'counter',
        title: 'Total Events',
        value: events.length,
        change: '+12%',
        period: 'last 7 days'
      },
      {
        type: 'chart',
        title: 'Page Views Trend',
        data: pageViews.slice(-30).map((pv, index) => ({
          date: pv.timestamp,
          value: index + 1
        }))
      },
      {
        type: 'table',
        title: 'Top Pages',
        data: Object.entries(
          pageViews.reduce((acc, pv) => {
            acc[pv.page] = (acc[pv.page] || 0) + 1;
            return acc;
          }, {})
        )
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, count]) => ({ page, views: count }))
      }
    ],
    lastUpdated: new Date().toISOString()
  };

  res.json(dashboardData);
});

module.exports = router;