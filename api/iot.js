const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const devices = [];
const sensors = [];
const readings = [];
const alerts = [];
const commands = [];
const gateways = [];
const locations = [];
const automations = [];
const schedules = [];

// 1. Register Device
router.post('/devices', [
  body('deviceId').exists(),
  body('name').isLength({ min: 3 }),
  body('type').isIn(['sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light']),
  body('location').optional().isObject(),
  body('metadata').optional().isObject(),
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const device = {
    id: uuidv4(),
    ...req.body,
    status: 'online',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    batteryLevel: Math.random() * 100,
    firmware: '1.0.0'
  };

  devices.push(device);
  res.status(201).json({ message: 'Device registered successfully', device });
});

// 2. Get All Devices
router.get('/devices', (req, res) => {
  const userId = req.query.userId;
  const type = req.query.type;
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  let filteredDevices = devices;
  
  if (userId) {
    filteredDevices = filteredDevices.filter(d => d.userId === userId);
  }
  
  if (type) {
    filteredDevices = filteredDevices.filter(d => d.type === type);
  }
  
  if (status) {
    filteredDevices = filteredDevices.filter(d => d.status === status);
  }

  filteredDevices.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredDevices.slice(startIndex, endIndex);

  res.json({
    devices: result,
    pagination: {
      page,
      limit,
      total: filteredDevices.length,
      pages: Math.ceil(filteredDevices.length / limit)
    }
  });
});

// 3. Get Device by ID
router.get('/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const device = devices.find(d => d.id === deviceId || d.deviceId === deviceId);
  
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const deviceReadings = readings.filter(r => r.deviceId === device.id).slice(-20);
  const deviceAlerts = alerts.filter(a => a.deviceId === device.id).slice(-5);

  res.json({ 
    device, 
    recentReadings: deviceReadings,
    recentAlerts: deviceAlerts,
    stats: {
      totalReadings: readings.filter(r => r.deviceId === device.id).length,
      totalAlerts: alerts.filter(a => a.deviceId === device.id).length
    }
  });
});

// 4. Update Device
router.put('/devices/:deviceId', [
  body('name').optional().isLength({ min: 3 }),
  body('location').optional().isObject(),
  body('metadata').optional().isObject(),
  body('status').optional().isIn(['online', 'offline', 'maintenance'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { deviceId } = req.params;
  const deviceIndex = devices.findIndex(d => d.id === deviceId || d.deviceId === deviceId);
  
  if (deviceIndex === -1) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devices[deviceIndex] = { 
    ...devices[deviceIndex], 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };

  res.json({ message: 'Device updated successfully', device: devices[deviceIndex] });
});

// 5. Delete Device
router.delete('/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const deviceIndex = devices.findIndex(d => d.id === deviceId || d.deviceId === deviceId);
  
  if (deviceIndex === -1) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devices.splice(deviceIndex, 1);
  res.json({ message: 'Device deleted successfully' });
});

// 6. Send Command to Device
router.post('/devices/:deviceId/command', [
  body('command').isString(),
  body('parameters').optional().isObject(),
  body('timeout').optional().isInt({ min: 1000 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { deviceId } = req.params;
  const { command, parameters, timeout = 30000 } = req.body;
  
  const device = devices.find(d => d.id === deviceId || d.deviceId === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const deviceCommand = {
    id: uuidv4(),
    deviceId: device.id,
    command,
    parameters: parameters || {},
    status: 'sent',
    sentAt: new Date().toISOString(),
    timeout,
    response: null
  };

  commands.push(deviceCommand);
  
  // Simulate command response
  setTimeout(() => {
    deviceCommand.status = 'completed';
    deviceCommand.response = { success: true, message: 'Command executed successfully' };
    deviceCommand.completedAt = new Date().toISOString();
  }, 1000);

  res.status(201).json({ message: 'Command sent successfully', command: deviceCommand });
});

// 7. Get Device Commands
router.get('/devices/:deviceId/commands', (req, res) => {
  const { deviceId } = req.params;
  const device = devices.find(d => d.id === deviceId || d.deviceId === deviceId);
  
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const deviceCommands = commands.filter(c => c.deviceId === device.id);
  deviceCommands.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  res.json({ commands: deviceCommands });
});

// 8. Add Sensor Reading
router.post('/readings', [
  body('deviceId').exists(),
  body('sensorType').isIn(['temperature', 'humidity', 'pressure', 'light', 'motion', 'air_quality']),
  body('value').isNumeric(),
  body('unit').isString(),
  body('timestamp').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const reading = {
    id: uuidv4(),
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString(),
    quality: Math.random() > 0.1 ? 'good' : 'poor'
  };

  readings.push(reading);

  // Update device last seen
  const device = devices.find(d => d.id === reading.deviceId);
  if (device) {
    device.lastSeen = reading.timestamp;
  }

  // Check for alerts
  checkForAlerts(reading);

  res.status(201).json({ message: 'Reading added successfully', reading });
});

// 9. Get Sensor Readings
router.get('/readings', (req, res) => {
  const { deviceId, sensorType, startDate, endDate, limit = 100 } = req.query;
  
  let filteredReadings = readings;
  
  if (deviceId) {
    filteredReadings = filteredReadings.filter(r => r.deviceId === deviceId);
  }
  
  if (sensorType) {
    filteredReadings = filteredReadings.filter(r => r.sensorType === sensorType);
  }
  
  if (startDate) {
    filteredReadings = filteredReadings.filter(r => new Date(r.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredReadings = filteredReadings.filter(r => new Date(r.timestamp) <= new Date(endDate));
  }

  filteredReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  filteredReadings = filteredReadings.slice(0, parseInt(limit));

  res.json({ readings: filteredReadings });
});

// 10. Get Device Analytics
router.get('/devices/:deviceId/analytics', (req, res) => {
  const { deviceId } = req.params;
  const { period = '24h' } = req.query;
  
  const device = devices.find(d => d.id === deviceId || d.deviceId === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const deviceReadings = readings.filter(r => r.deviceId === device.id);
  const deviceAlerts = alerts.filter(a => a.deviceId === device.id);

  // Calculate period-specific data
  const now = new Date();
  const periodHours = parseInt(period.replace('h', ''));
  const startDate = new Date(now.getTime() - periodHours * 60 * 60 * 1000);
  
  const periodReadings = deviceReadings.filter(r => 
    new Date(r.timestamp) >= startDate
  );

  const sensorTypes = [...new Set(periodReadings.map(r => r.sensorType))];
  const analytics = sensorTypes.map(type => {
    const typeReadings = periodReadings.filter(r => r.sensorType === type);
    const values = typeReadings.map(r => r.value);
    
    return {
      sensorType: type,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      latest: values[values.length - 1]
    };
  });

  res.json({
    deviceId,
    period,
    analytics,
    totalReadings: deviceReadings.length,
    totalAlerts: deviceAlerts.length,
    uptime: calculateUptime(device.createdAt),
    batteryLevel: device.batteryLevel
  });
});

// 11. Create Automation Rule
router.post('/automations', [
  body('name').isLength({ min: 3 }),
  body('trigger').exists(),
  body('conditions').isArray(),
  body('actions').isArray(),
  body('enabled').optional().isBoolean(),
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const automation = {
    id: uuidv4(),
    ...req.body,
    enabled: req.body.enabled !== false,
    createdAt: new Date().toISOString(),
    lastTriggered: null,
    triggerCount: 0
  };

  automations.push(automation);
  res.status(201).json({ message: 'Automation created successfully', automation });
});

// 12. Get Automations
router.get('/automations', (req, res) => {
  const userId = req.query.userId;
  const enabled = req.query.enabled;
  
  let filteredAutomations = automations;
  
  if (userId) {
    filteredAutomations = filteredAutomations.filter(a => a.userId === userId);
  }
  
  if (enabled !== undefined) {
    filteredAutomations = filteredAutomations.filter(a => a.enabled === (enabled === 'true'));
  }

  res.json({ automations: filteredAutomations });
});

// 13. Execute Automation
router.post('/automations/:automationId/execute', (req, res) => {
  const { automationId } = req.params;
  const automation = automations.find(a => a.id === automationId);
  
  if (!automation) {
    return res.status(404).json({ error: 'Automation not found' });
  }

  if (!automation.enabled) {
    return res.status(400).json({ error: 'Automation is disabled' });
  }

  // Execute actions (mock)
  const execution = {
    id: uuidv4(),
    automationId,
    status: 'executed',
    executedAt: new Date().toISOString(),
    actions: automation.actions.map(action => ({
      ...action,
      status: 'completed',
      result: 'Action executed successfully'
    }))
  };

  automation.lastTriggered = new Date().toISOString();
  automation.triggerCount += 1;

  res.json({ message: 'Automation executed successfully', execution });
});

// 14. Add Gateway
router.post('/gateways', [
  body('gatewayId').exists(),
  body('name').isLength({ min: 3 }),
  body('location').isObject(),
  body('protocol').isIn(['mqtt', 'http', 'coap', 'zigbee']),
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const gateway = {
    id: uuidv4(),
    ...req.body,
    status: 'online',
    connectedDevices: 0,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  gateways.push(gateway);
  res.status(201).json({ message: 'Gateway added successfully', gateway });
});

// 15. Get Gateways
router.get('/gateways', (req, res) => {
  const userId = req.query.userId;
  const status = req.query.status;
  
  let filteredGateways = gateways;
  
  if (userId) {
    filteredGateways = filteredGateways.filter(g => g.userId === userId);
  }
  
  if (status) {
    filteredGateways = filteredGateways.filter(g => g.status === status);
  }

  res.json({ gateways: filteredGateways });
});

// 16. Get IoT Dashboard
router.get('/dashboard/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userDevices = devices.filter(d => d.userId === userId);
  const userGateways = gateways.filter(g => g.userId === userId);
  const userAutomations = automations.filter(a => a.userId === userId);
  
  const recentReadings = readings
    .filter(r => userDevices.some(d => d.id === r.deviceId))
    .slice(-50);

  const dashboard = {
    userId,
    overview: {
      totalDevices: userDevices.length,
      onlineDevices: userDevices.filter(d => d.status === 'online').length,
      totalGateways: userGateways.length,
      activeAutomations: userAutomations.filter(a => a.enabled).length,
      recentAlerts: alerts.filter(a => 
        userDevices.some(d => d.id === a.deviceId) && 
        new Date() - new Date(a.createdAt) < 24 * 60 * 60 * 1000
      ).length
    },
    devices: userDevices.map(device => ({
      ...device,
      batteryStatus: device.batteryLevel > 20 ? 'good' : 'low',
      recentActivity: readings.filter(r => r.deviceId === device.id).slice(-1)[0]
    })),
    recentReadings: recentReadings.slice(-20),
    alerts: alerts.filter(a => 
      userDevices.some(d => d.id === a.deviceId)
    ).slice(-10),
    timestamp: new Date().toISOString()
  };

  res.json(dashboard);
});

// 17. Create Alert Rule
router.post('/alerts/rules', [
  body('deviceId').exists(),
  body('sensorType').exists(),
  body('condition').isIn(['>', '<', '>=', '<=', '==']),
  body('threshold').isNumeric(),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('actions').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const alertRule = {
    id: uuidv4(),
    ...req.body,
    enabled: true,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ message: 'Alert rule created successfully', alertRule });
});

// 18. Get Alerts
router.get('/alerts', (req, res) => {
  const { deviceId, severity, acknowledged, limit = 50 } = req.query;
  
  let filteredAlerts = alerts;
  
  if (deviceId) {
    filteredAlerts = filteredAlerts.filter(a => a.deviceId === deviceId);
  }
  
  if (severity) {
    filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
  }
  
  if (acknowledged !== undefined) {
    filteredAlerts = filteredAlerts.filter(a => a.acknowledged === (acknowledged === 'true'));
  }

  filteredAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  filteredAlerts = filteredAlerts.slice(0, parseInt(limit));

  res.json({ alerts: filteredAlerts });
});

// 19. Acknowledge Alert
router.patch('/alerts/:alertId/acknowledge', (req, res) => {
  const { alertId } = req.params;
  const alert = alerts.find(a => a.id === alertId);
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = req.body.userId || 'system';

  res.json({ message: 'Alert acknowledged', alert });
});

// 20. Batch Device Operations
router.post('/devices/batch', [
  body('deviceIds').isArray(),
  body('operation').isIn(['update', 'command', 'delete']),
  body('data').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { deviceIds, operation, data } = req.body;
  const results = [];

  deviceIds.forEach(deviceId => {
    const device = devices.find(d => d.id === deviceId || d.deviceId === deviceId);
    
    if (device) {
      let result = { deviceId, success: true };
      
      switch (operation) {
        case 'update':
          Object.assign(device, data, { updatedAt: new Date().toISOString() });
          result.message = 'Device updated';
          break;
        case 'command':
          const command = {
            id: uuidv4(),
            deviceId: device.id,
            command: data.command,
            status: 'sent',
            sentAt: new Date().toISOString()
          };
          commands.push(command);
          result.commandId = command.id;
          result.message = 'Command sent';
          break;
        case 'delete':
          const index = devices.findIndex(d => d.id === deviceId);
          if (index !== -1) devices.splice(index, 1);
          result.message = 'Device deleted';
          break;
      }
      
      results.push(result);
    } else {
      results.push({ deviceId, success: false, error: 'Device not found' });
    }
  });

  res.json({
    message: 'Batch operation completed',
    totalDevices: deviceIds.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  });
});

// Helper functions
function checkForAlerts(reading) {
  // Mock alert checking logic
  if (Math.random() < 0.1) { // 10% chance of alert
    const alert = {
      id: uuidv4(),
      deviceId: reading.deviceId,
      type: 'threshold_exceeded',
      message: `Sensor reading ${reading.value} exceeds normal range`,
      severity: Math.random() > 0.7 ? 'high' : 'medium',
      acknowledged: false,
      createdAt: new Date().toISOString()
    };
    alerts.push(alert);
  }
}

function calculateUptime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const uptimeMs = now - created;
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days} days, ${hours} hours`;
}

module.exports = router;