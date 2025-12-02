const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const healthRecords = [];
const vitals = [];
const medications = [];
const appointments = [];
const exercises = [];
const nutrition = [];
const sleep = [];
const goals = [];
const assessments = [];
const conditions = [];

// 1. Add Health Record
router.post('/records', [
  body('userId').exists(),
  body('type').isIn(['vitals', 'medication', 'appointment', 'exercise', 'nutrition', 'sleep']),
  body('data').exists(),
  body('timestamp').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const record = {
    id: uuidv4(),
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  healthRecords.push(record);
  res.status(201).json({ message: 'Health record added successfully', record });
});

// 2. Get Health Records
router.get('/records', (req, res) => {
  const { userId, type, startDate, endDate, limit = 50 } = req.query;
  
  let filteredRecords = healthRecords;
  
  if (userId) {
    filteredRecords = filteredRecords.filter(r => r.userId === userId);
  }
  
  if (type) {
    filteredRecords = filteredRecords.filter(r => r.type === type);
  }
  
  if (startDate) {
    filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) <= new Date(endDate));
  }

  filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  filteredRecords = filteredRecords.slice(0, parseInt(limit));

  res.json({ records: filteredRecords });
});

// 3. Record Vitals
router.post('/vitals', [
  body('userId').exists(),
  body('heartRate').optional().isInt({ min: 30, max: 200 }),
  body('bloodPressure').optional().isObject(),
  body('temperature').optional().isFloat({ min: 35, max: 42 }),
  body('weight').optional().isFloat({ min: 1 }),
  body('height').optional().isFloat({ min: 50 }),
  body('oxygenSaturation').optional().isInt({ min: 70, max: 100 }),
  body('bloodGlucose').optional().isFloat({ min: 50, max: 400 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const vital = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString(),
    source: 'manual'
  };

  vitals.push(vital);

  // Add to health records
  const record = {
    id: uuidv4(),
    userId: vital.userId,
    type: 'vitals',
    data: vital,
    timestamp: vital.timestamp,
    createdAt: new Date().toISOString()
  };
  healthRecords.push(record);

  res.status(201).json({ message: 'Vitals recorded successfully', vital });
});

// 4. Get Vitals History
router.get('/vitals/:userId', (req, res) => {
  const { userId } = req.params;
  const { vitalType, startDate, endDate, limit = 100 } = req.query;
  
  let userVitals = vitals.filter(v => v.userId === userId);
  
  if (startDate) {
    userVitals = userVitals.filter(v => new Date(v.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    userVitals = userVitals.filter(v => new Date(v.timestamp) <= new Date(endDate));
  }

  userVitals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  userVitals = userVitals.slice(0, parseInt(limit));

  // Calculate statistics
  const stats = {};
  if (vitalType === 'heartRate' || !vitalType) {
    const heartRates = userVitals.filter(v => v.heartRate).map(v => v.heartRate);
    if (heartRates.length > 0) {
      stats.heartRate = {
        average: heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length,
        min: Math.min(...heartRates),
        max: Math.max(...heartRates),
        count: heartRates.length
      };
    }
  }

  res.json({ vitals: userVitals, statistics: stats });
});

// 5. Add Medication
router.post('/medications', [
  body('userId').exists(),
  body('name').isLength({ min: 3 }),
  body('dosage').isString(),
  body('frequency').isString(),
  body('startDate').isISO8601(),
  body('endDate').optional().isISO8601(),
  body('instructions').optional().isString(),
  body('prescribedBy').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const medication = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  medications.push(medication);
  res.status(201).json({ message: 'Medication added successfully', medication });
});

// 6. Get Medications
router.get('/medications/:userId', (req, res) => {
  const { userId } = req.params;
  const { status } = req.query;
  
  let userMedications = medications.filter(m => m.userId === userId);
  
  if (status) {
    userMedications = userMedications.filter(m => m.status === status);
  }

  userMedications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ medications: userMedications });
});

// 7. Log Medication Intake
router.post('/medications/:medicationId/log', [
  body('takenAt').optional().isISO8601(),
  body('notes').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { medicationId } = req.params;
  const medication = medications.find(m => m.id === medicationId);
  
  if (!medication) {
    return res.status(404).json({ error: 'Medication not found' });
  }

  const intake = {
    id: uuidv4(),
    medicationId,
    takenAt: req.body.takenAt || new Date().toISOString(),
    notes: req.body.notes,
    createdAt: new Date().toISOString()
  };

  // Add to health records
  const record = {
    id: uuidv4(),
    userId: medication.userId,
    type: 'medication',
    data: { medication: medication.name, intake },
    timestamp: intake.takenAt,
    createdAt: new Date().toISOString()
  };
  healthRecords.push(record);

  res.status(201).json({ message: 'Medication intake logged', intake });
});

// 8. Create Appointment
router.post('/appointments', [
  body('userId').exists(),
  body('title').isLength({ min: 3 }),
  body('doctor').isString(),
  body('dateTime').isISO8601(),
  body('duration').isInt({ min: 15 }),
  body('type').isIn(['checkup', 'specialist', 'emergency', 'followup']),
  body('location').optional().isString(),
  body('notes').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const appointment = {
    id: uuidv4(),
    ...req.body,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  appointments.push(appointment);
  res.status(201).json({ message: 'Appointment created successfully', appointment });
});

// 9. Get Appointments
router.get('/appointments/:userId', (req, res) => {
  const { userId } = req.params;
  const { status, startDate, endDate } = req.query;
  
  let userAppointments = appointments.filter(a => a.userId === userId);
  
  if (status) {
    userAppointments = userAppointments.filter(a => a.status === status);
  }
  
  if (startDate) {
    userAppointments = userAppointments.filter(a => new Date(a.dateTime) >= new Date(startDate));
  }
  
  if (endDate) {
    userAppointments = userAppointments.filter(a => new Date(a.dateTime) <= new Date(endDate));
  }

  userAppointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

  res.json({ appointments: userAppointments });
});

// 10. Update Appointment Status
router.patch('/appointments/:appointmentId/status', [
  body('status').isIn(['scheduled', 'completed', 'cancelled', 'rescheduled']),
  body('notes').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { appointmentId } = req.params;
  const { status, notes } = req.body;
  const appointmentIndex = appointments.findIndex(a => a.id === appointmentId);
  
  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  appointments[appointmentIndex].status = status;
  appointments[appointmentIndex].updatedAt = new Date().toISOString();
  if (notes) appointments[appointmentIndex].notes = notes;

  res.json({ message: 'Appointment status updated', appointment: appointments[appointmentIndex] });
});

// 11. Log Exercise
router.post('/exercise', [
  body('userId').exists(),
  body('type').isString(),
  body('duration').isInt({ min: 1 }),
  body('intensity').isIn(['low', 'moderate', 'high']),
  body('calories').optional().isInt({ min: 0 }),
  body('distance').optional().isFloat({ min: 0 }),
  body('notes').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const exercise = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString()
  };

  exercises.push(exercise);

  // Add to health records
  const record = {
    id: uuidv4(),
    userId: exercise.userId,
    type: 'exercise',
    data: exercise,
    timestamp: exercise.timestamp,
    createdAt: new Date().toISOString()
  };
  healthRecords.push(record);

  res.status(201).json({ message: 'Exercise logged successfully', exercise });
});

// 12. Get Exercise History
router.get('/exercise/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, startDate, endDate, limit = 50 } = req.query;
  
  let userExercises = exercises.filter(e => e.userId === userId);
  
  if (type) {
    userExercises = userExercises.filter(e => e.type === type);
  }
  
  if (startDate) {
    userExercises = userExercises.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    userExercises = userExercises.filter(e => new Date(e.timestamp) <= new Date(endDate));
  }

  userExercises.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  userExercises = userExercises.slice(0, parseInt(limit));

  // Calculate statistics
  const totalDuration = userExercises.reduce((sum, e) => sum + e.duration, 0);
  const totalCalories = userExercises.reduce((sum, e) => sum + (e.calories || 0), 0);

  res.json({ 
    exercises: userExercises,
    statistics: {
      totalSessions: userExercises.length,
      totalDuration,
      totalCalories,
      averageDuration: userExercises.length > 0 ? totalDuration / userExercises.length : 0
    }
  });
});

// 13. Log Nutrition
router.post('/nutrition', [
  body('userId').exists(),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('foods').isArray(),
  body('calories').isInt({ min: 0 }),
  body('protein').optional().isFloat({ min: 0 }),
  body('carbs').optional().isFloat({ min: 0 }),
  body('fat').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const nutritionEntry = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString()
  };

  nutrition.push(nutritionEntry);

  // Add to health records
  const record = {
    id: uuidv4(),
    userId: nutritionEntry.userId,
    type: 'nutrition',
    data: nutritionEntry,
    timestamp: nutritionEntry.timestamp,
    createdAt: new Date().toISOString()
  };
  healthRecords.push(record);

  res.status(201).json({ message: 'Nutrition logged successfully', nutrition: nutritionEntry });
});

// 14. Get Nutrition History
router.get('/nutrition/:userId', (req, res) => {
  const { userId } = req.params;
  const { mealType, startDate, endDate, limit = 50 } = req.query;
  
  let userNutrition = nutrition.filter(n => n.userId === userId);
  
  if (mealType) {
    userNutrition = userNutrition.filter(n => n.mealType === mealType);
  }
  
  if (startDate) {
    userNutrition = userNutrition.filter(n => new Date(n.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    userNutrition = userNutrition.filter(n => new Date(n.timestamp) <= new Date(endDate));
  }

  userNutrition.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  userNutrition = userNutrition.slice(0, parseInt(limit));

  // Calculate statistics
  const totalCalories = userNutrition.reduce((sum, n) => sum + n.calories, 0);
  const avgCalories = userNutrition.length > 0 ? totalCalories / userNutrition.length : 0;

  res.json({ 
    nutrition: userNutrition,
    statistics: {
      totalEntries: userNutrition.length,
      totalCalories,
      averageCalories: Math.round(avgCalories)
    }
  });
});

// 15. Log Sleep
router.post('/sleep', [
  body('userId').exists(),
  body('bedtime').isISO8601(),
  body('wakeTime').isISO8601(),
  body('quality').isInt({ min: 1, max: 5 }),
  body('notes').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sleepEntry = {
    id: uuidv4(),
    ...req.body,
    duration: calculateDuration(req.body.bedtime, req.body.wakeTime),
    createdAt: new Date().toISOString()
  };

  sleep.push(sleepEntry);

  // Add to health records
  const record = {
    id: uuidv4(),
    userId: sleepEntry.userId,
    type: 'sleep',
    data: sleepEntry,
    timestamp: sleepEntry.bedtime,
    createdAt: new Date().toISOString()
  };
  healthRecords.push(record);

  res.status(201).json({ message: 'Sleep logged successfully', sleep: sleepEntry });
});

// 16. Get Sleep History
router.get('/sleep/:userId', (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, limit = 30 } = req.query;
  
  let userSleep = sleep.filter(s => s.userId === userId);
  
  if (startDate) {
    userSleep = userSleep.filter(s => new Date(s.bedtime) >= new Date(startDate));
  }
  
  if (endDate) {
    userSleep = userSleep.filter(s => new Date(s.bedtime) <= new Date(endDate));
  }

  userSleep.sort((a, b) => new Date(b.bedtime) - new Date(a.bedtime));
  userSleep = userSleep.slice(0, parseInt(limit));

  // Calculate statistics
  const totalSleep = userSleep.reduce((sum, s) => sum + s.duration, 0);
  const avgSleep = userSleep.length > 0 ? totalSleep / userSleep.length : 0;
  const avgQuality = userSleep.length > 0 
    ? userSleep.reduce((sum, s) => sum + s.quality, 0) / userSleep.length 
    : 0;

  res.json({ 
    sleep: userSleep,
    statistics: {
      totalEntries: userSleep.length,
      totalSleepHours: Math.round(totalSleep * 10) / 10,
      averageSleepHours: Math.round(avgSleep * 10) / 10,
      averageQuality: Math.round(avgQuality * 10) / 10
    }
  });
});

// 17. Create Health Goal
router.post('/goals', [
  body('userId').exists(),
  body('type').isIn(['weight', 'exercise', 'nutrition', 'sleep', 'vitals']),
  body('target').exists(),
  body('currentValue').optional().isNumeric(),
  body('targetDate').isISO8601(),
  body('unit').optional().isString(),
  body('description').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const goal = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    progress: 0,
    createdAt: new Date().toISOString()
  };

  goals.push(goal);
  res.status(201).json({ message: 'Health goal created successfully', goal });
});

// 18. Get Health Goals
router.get('/goals/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, status } = req.query;
  
  let userGoals = goals.filter(g => g.userId === userId);
  
  if (type) {
    userGoals = userGoals.filter(g => g.type === type);
  }
  
  if (status) {
    userGoals = userGoals.filter(g => g.status === status);
  }

  res.json({ goals: userGoals });
});

// 19. Health Assessment
router.post('/assessment', [
  body('userId').exists(),
  body('assessmentType').isString(),
  body('responses').isArray(),
  body('score').optional().isNumeric()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const assessment = {
    id: uuidv4(),
    ...req.body,
    score: req.body.score || calculateAssessmentScore(req.body.responses),
    riskLevel: calculateRiskLevel(req.body.score || calculateAssessmentScore(req.body.responses)),
    recommendations: generateRecommendations(req.body.assessmentType),
    completedAt: new Date().toISOString()
  };

  assessments.push(assessment);
  res.status(201).json({ message: 'Health assessment completed', assessment });
});

// 20. Get Health Dashboard
router.get('/dashboard/:userId', (req, res) => {
  const { userId } = req.params;
  const { period = '7d' } = req.query;
  
  // Get recent data
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRecords = healthRecords.filter(r => 
    r.userId === userId && new Date(r.timestamp) >= periodStart
  );
  
  const recentVitals = vitals.filter(v => 
    v.userId === userId && new Date(v.timestamp) >= periodStart
  );
  const recentExercises = exercises.filter(e => 
    e.userId === userId && new Date(e.timestamp) >= periodStart
  );
  const recentSleep = sleep.filter(s => 
    s.userId === userId && new Date(s.bedtime) >= periodStart
  );
  const upcomingAppointments = appointments.filter(a => 
    a.userId === userId && 
    a.status === 'scheduled' && 
    new Date(a.dateTime) > new Date()
  );

  // Calculate summary stats
  const summary = {
    totalSteps: Math.floor(Math.random() * 50000 + 30000),
    averageHeartRate: recentVitals.length > 0 
      ? Math.round(recentVitals.filter(v => v.heartRate).reduce((sum, v) => sum + v.heartRate, 0) / recentVitals.filter(v => v.heartRate).length)
      : 72,
    exerciseMinutes: recentExercises.reduce((sum, e) => sum + e.duration, 0),
    averageSleepHours: recentSleep.length > 0
      ? Math.round(recentSleep.reduce((sum, s) => sum + s.duration, 0) / recentSleep.length * 10) / 10
      : 7.5,
    activeGoals: goals.filter(g => g.userId === userId && g.status === 'active').length,
    upcomingAppointments: upcomingAppointments.length
  };

  // Get trends
  const trends = {
    weightTrend: 'stable',
    exerciseTrend: 'increasing',
    sleepTrend: 'improving',
    vitalsStability: 'good'
  };

  // Get recommendations
  const recommendations = [
    'Increase daily water intake to 8 glasses',
    'Add 15 minutes of moderate exercise daily',
    'Maintain consistent sleep schedule',
    'Schedule follow-up with primary care physician'
  ];

  const dashboard = {
    userId,
    period,
    summary,
    trends,
    recommendations,
    recentActivity: recentRecords.slice(-5),
    alerts: [], // Would contain health alerts
    lastUpdated: new Date().toISOString()
  };

  res.json(dashboard);
});

// Helper functions
function calculateDuration(bedtime, wakeTime) {
  const bed = new Date(bedtime);
  const wake = new Date(wakeTime);
  let duration = (wake - bed) / (1000 * 60 * 60); // hours
  if (duration < 0) duration += 24; // Handle crossing midnight
  return Math.round(duration * 10) / 10;
}

function calculateAssessmentScore(responses) {
  // Simple score calculation (mock)
  return Math.floor(Math.random() * 50 + 50);
}

function calculateRiskLevel(score) {
  if (score >= 80) return 'low';
  if (score >= 60) return 'moderate';
  return 'high';
}

function generateRecommendations(assessmentType) {
  const recommendations = {
    'general': ['Exercise regularly', 'Eat balanced meals', 'Get adequate sleep'],
    'cardiovascular': ['Monitor blood pressure', 'Reduce sodium intake', 'Increase cardio exercise'],
    'mental': ['Practice stress management', 'Consider therapy', 'Maintain social connections']
  };
  
  return recommendations[assessmentType] || recommendations['general'];
}

module.exports = router;