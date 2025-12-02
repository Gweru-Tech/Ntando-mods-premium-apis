const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const companies = [];
const employees = [];
const departments = [];
const projects = [];
const tasks = [];
const meetings = [];
const reports = [];
const expenses = [];
const invoices = [];
const clients = [];
const deals = [];
const timeEntries = [];

// 1. Create Company
router.post('/companies', [
  body('name').isLength({ min: 2 }),
  body('industry').isString(),
  body('size').isIn(['startup', 'small', 'medium', 'large', 'enterprise']),
  body('website').optional().isURL(),
  body('description').optional().isString(),
  body('address').optional().isObject(),
  body('contact').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const company = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'active',
    employeeCount: 0
  };

  companies.push(company);
  res.status(201).json({ message: 'Company created successfully', company });
});

// 2. Get All Companies
router.get('/companies', (req, res) => {
  const industry = req.query.industry;
  const size = req.query.size;
  const status = req.query.status;

  let filteredCompanies = companies;
  
  if (industry) {
    filteredCompanies = filteredCompanies.filter(c => c.industry === industry);
  }
  
  if (size) {
    filteredCompanies = filteredCompanies.filter(c => c.size === size);
  }
  
  if (status) {
    filteredCompanies = filteredCompanies.filter(c => c.status === status);
  }

  res.json({ companies: filteredCompanies });
});

// 3. Get Company by ID
router.get('/companies/:companyId', (req, res) => {
  const { companyId } = req.params;
  const company = companies.find(c => c.id === companyId);
  
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const companyEmployees = employees.filter(e => e.companyId === companyId);
  const companyDepartments = departments.filter(d => d.companyId === companyId);
  const activeProjects = projects.filter(p => p.companyId === companyId && p.status === 'active');

  res.json({ 
    company, 
    employees: companyEmployees,
    departments: companyDepartments,
    activeProjects,
    stats: {
      totalEmployees: companyEmployees.length,
      totalDepartments: companyDepartments.length,
      activeProjects: activeProjects.length
    }
  });
});

// 4. Add Employee
router.post('/employees', [
  body('companyId').exists(),
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('position').isString(),
  body('department').optional().isString(),
  body('salary').optional().isFloat({ min: 0 }),
  body('startDate').isISO8601(),
  body('type').isIn(['full-time', 'part-time', 'contract', 'intern'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const employee = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  employees.push(employee);

  // Update company employee count
  const company = companies.find(c => c.id === employee.companyId);
  if (company) {
    company.employeeCount += 1;
  }

  res.status(201).json({ message: 'Employee added successfully', employee });
});

// 5. Get Company Employees
router.get('/companies/:companyId/employees', (req, res) => {
  const { companyId } = req.params;
  const { department, status, position } = req.query;
  
  let companyEmployees = employees.filter(e => e.companyId === companyId);
  
  if (department) {
    companyEmployees = companyEmployees.filter(e => e.department === department);
  }
  
  if (status) {
    companyEmployees = companyEmployees.filter(e => e.status === status);
  }
  
  if (position) {
    companyEmployees = companyEmployees.filter(e => e.position === position);
  }

  res.json({ employees: companyEmployees });
});

// 6. Create Department
router.post('/departments', [
  body('companyId').exists(),
  body('name').isLength({ min: 2 }),
  body('description').optional().isString(),
  body('managerId').optional().isString(),
  body('budget').optional().isFloat({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const department = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  departments.push(department);
  res.status(201).json({ message: 'Department created successfully', department });
});

// 7. Get Company Departments
router.get('/companies/:companyId/departments', (req, res) => {
  const { companyId } = req.params;
  const companyDepartments = departments.filter(d => d.companyId === companyId);
  
  // Add employee count to each department
  const departmentsWithCount = companyDepartments.map(dept => ({
    ...dept,
    employeeCount: employees.filter(e => e.companyId === companyId && e.department === dept.name).length
  }));

  res.json({ departments: departmentsWithCount });
});

// 8. Create Project
router.post('/projects', [
  body('companyId').exists(),
  body('name').isLength({ min: 3 }),
  body('description').isLength({ min: 10 }),
  body('managerId').exists(),
  body('startDate').isISO8601(),
  body('endDate').optional().isISO8601(),
  body('budget').optional().isFloat({ min: 0 }),
  body('priority').isIn(['low', 'medium', 'high', 'critical'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const project = {
    id: uuidv4(),
    ...req.body,
    status: 'planning',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects.push(project);
  res.status(201).json({ message: 'Project created successfully', project });
});

// 9. Get Company Projects
router.get('/companies/:companyId/projects', (req, res) => {
  const { companyId } = req.params;
  const { status, managerId, priority } = req.query;
  
  let companyProjects = projects.filter(p => p.companyId === companyId);
  
  if (status) {
    companyProjects = companyProjects.filter(p => p.status === status);
  }
  
  if (managerId) {
    companyProjects = companyProjects.filter(p => p.managerId === managerId);
  }
  
  if (priority) {
    companyProjects = companyProjects.filter(p => p.priority === priority);
  }

  // Add manager details
  const projectsWithManagers = companyProjects.map(project => {
    const manager = employees.find(e => e.id === project.managerId);
    return { 
      ...project, 
      manager: manager ? { id: manager.id, name: manager.name, email: manager.email } : null
    };
  });

  res.json({ projects: projectsWithManagers });
});

// 10. Create Task
router.post('/tasks', [
  body('projectId').exists(),
  body('title').isLength({ min: 3 }),
  body('description').optional().isString(),
  body('assigneeId').exists(),
  body('creatorId').exists(),
  body('dueDate').optional().isISO8601(),
  body('priority').isIn(['low', 'medium', 'high']),
  body('status').isIn(['todo', 'in-progress', 'review', 'completed'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const task = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tasks.push(task);
  res.status(201).json({ message: 'Task created successfully', task });
});

// 11. Get Project Tasks
router.get('/projects/:projectId/tasks', (req, res) => {
  const { projectId } = req.params;
  const { status, assigneeId, priority } = req.query;
  
  let projectTasks = tasks.filter(t => t.projectId === projectId);
  
  if (status) {
    projectTasks = projectTasks.filter(t => t.status === status);
  }
  
  if (assigneeId) {
    projectTasks = projectTasks.filter(t => t.assigneeId === assigneeId);
  }
  
  if (priority) {
    projectTasks = projectTasks.filter(t => t.priority === priority);
  }

  // Add assignee details
  const tasksWithAssignees = projectTasks.map(task => {
    const assignee = employees.find(e => e.id === task.assigneeId);
    return { 
      ...task, 
      assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null
    };
  });

  res.json({ tasks: tasksWithAssignees });
});

// 12. Update Task Status
router.patch('/tasks/:taskId/status', [
  body('status').isIn(['todo', 'in-progress', 'review', 'completed']),
  body('comment').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { taskId } = req.params;
  const { status, comment } = req.body;
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[taskIndex].status = status;
  tasks[taskIndex].updatedAt = new Date().toISOString();
  if (comment) tasks[taskIndex].comment = comment;

  res.json({ message: 'Task status updated', task: tasks[taskIndex] });
});

// 13. Schedule Meeting
router.post('/meetings', [
  body('companyId').exists(),
  body('title').isLength({ min: 3 }),
  body('description').optional().isString(),
  body('organizerId').exists(),
  body('attendeeIds').isArray(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('location').optional().isString(),
  body('isVirtual').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const meeting = {
    id: uuidv4(),
    ...req.body,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  meetings.push(meeting);
  res.status(201).json({ message: 'Meeting scheduled successfully', meeting });
});

// 14. Get Company Meetings
router.get('/companies/:companyId/meetings', (req, res) => {
  const { companyId } = req.params;
  const { startDate, endDate, status } = req.query;
  
  let companyMeetings = meetings.filter(m => m.companyId === companyId);
  
  if (status) {
    companyMeetings = companyMeetings.filter(m => m.status === status);
  }
  
  if (startDate) {
    companyMeetings = companyMeetings.filter(m => new Date(m.startTime) >= new Date(startDate));
  }
  
  if (endDate) {
    companyMeetings = companyMeetings.filter(m => new Date(m.endTime) <= new Date(endDate));
  }

  // Add organizer and attendee details
  const meetingsWithDetails = companyMeetings.map(meeting => {
    const organizer = employees.find(e => e.id === meeting.organizerId);
    const attendees = meeting.attendeeIds.map(id => {
      const attendee = employees.find(e => e.id === id);
      return attendee ? { id: attendee.id, name: attendee.name, email: attendee.email } : null;
    }).filter(Boolean);

    return { 
      ...meeting, 
      organizer: organizer ? { id: organizer.id, name: organizer.name, email: organizer.email } : null,
      attendees
    };
  });

  res.json({ meetings: meetingsWithDetails });
});

// 15. Generate Report
router.post('/reports', [
  body('companyId').exists(),
  body('type').isIn(['financial', 'project', 'employee', 'sales']),
  body('period').isIn(['weekly', 'monthly', 'quarterly', 'yearly']),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('format').optional().isIn(['json', 'pdf', 'excel'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const report = {
    id: uuidv4(),
    ...req.body,
    status: 'generating',
    createdAt: new Date().toISOString(),
    generatedAt: null,
    downloadUrl: null
  };

  reports.push(report);
  res.status(201).json({ message: 'Report generation started', report });
});

// 16. Get Reports
router.get('/companies/:companyId/reports', (req, res) => {
  const { companyId } = req.params;
  const { type, status } = req.query;
  
  let companyReports = reports.filter(r => r.companyId === companyId);
  
  if (type) {
    companyReports = companyReports.filter(r => r.type === type);
  }
  
  if (status) {
    companyReports = companyReports.filter(r => r.status === status);
  }

  res.json({ reports: companyReports });
});

// 17. Add Expense
router.post('/expenses', [
  body('companyId').exists(),
  body('employeeId').exists(),
  body('description').isLength({ min: 3 }),
  body('amount').isFloat({ min: 0 }),
  body('category').isString(),
  body('date').isISO8601(),
  body('receipt').optional().isString(),
  body('status').optional().isIn(['pending', 'approved', 'rejected'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const expense = {
    id: uuidv4(),
    ...req.body,
    status: req.body.status || 'pending',
    createdAt: new Date().toISOString()
  };

  expenses.push(expense);
  res.status(201).json({ message: 'Expense added successfully', expense });
});

// 18. Get Company Expenses
router.get('/companies/:companyId/expenses', (req, res) => {
  const { companyId } = req.params;
  const { employeeId, category, status, startDate, endDate } = req.query;
  
  let companyExpenses = expenses.filter(e => e.companyId === companyId);
  
  if (employeeId) {
    companyExpenses = companyExpenses.filter(e => e.employeeId === employeeId);
  }
  
  if (category) {
    companyExpenses = companyExpenses.filter(e => e.category === category);
  }
  
  if (status) {
    companyExpenses = companyExpenses.filter(e => e.status === status);
  }
  
  if (startDate) {
    companyExpenses = companyExpenses.filter(e => new Date(e.date) >= new Date(startDate));
  }
  
  if (endDate) {
    companyExpenses = companyExpenses.filter(e => new Date(e.date) <= new Date(endDate));
  }

  // Add employee details
  const expensesWithEmployees = companyExpenses.map(expense => {
    const employee = employees.find(e => e.id === expense.employeeId);
    return { 
      ...expense, 
      employee: employee ? { id: employee.id, name: employee.name, email: employee.email } : null
    };
  });

  res.json({ expenses: expensesWithEmployees });
});

// 19. Add Client
router.post('/clients', [
  body('companyId').exists(),
  body('name').isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().isString(),
  body('address').optional().isObject(),
  body('industry').optional().isString(),
  body('contactPerson').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const client = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  clients.push(client);
  res.status(201).json({ message: 'Client added successfully', client });
});

// 20. Get Company Clients
router.get('/companies/:companyId/clients', (req, res) => {
  const { companyId } = req.params;
  const { status, industry } = req.query;
  
  let companyClients = clients.filter(c => c.companyId === companyId);
  
  if (status) {
    companyClients = companyClients.filter(c => c.status === status);
  }
  
  if (industry) {
    companyClients = companyClients.filter(c => c.industry === industry);
  }

  res.json({ clients: companyClients });
});

// 21. Log Time Entry
router.post('/time-entries', [
  body('employeeId').exists(),
  body('projectId').optional().isString(),
  body('taskId').optional().isString(),
  body('description').isLength({ min: 3 }),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('breakDuration').optional().isInt({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const startTime = new Date(req.body.startTime);
  const endTime = new Date(req.body.endTime);
  const duration = (endTime - startTime) / (1000 * 60 * 60); // hours
  const breakDuration = req.body.breakDuration || 0;
  const totalHours = duration - breakDuration;

  const timeEntry = {
    id: uuidv4(),
    employeeId: req.body.employeeId,
    projectId: req.body.projectId,
    taskId: req.body.taskId,
    description: req.body.description,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    duration: Math.round(totalHours * 100) / 100,
    breakDuration,
    createdAt: new Date().toISOString()
  };

  timeEntries.push(timeEntry);
  res.status(201).json({ message: 'Time entry logged successfully', timeEntry });
});

// 22. Get Employee Time Entries
router.get('/employees/:employeeId/time-entries', (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate, projectId } = req.query;
  
  let employeeTimeEntries = timeEntries.filter(t => t.employeeId === employeeId);
  
  if (startDate) {
    employeeTimeEntries = employeeTimeEntries.filter(t => new Date(t.startTime) >= new Date(startDate));
  }
  
  if (endDate) {
    employeeTimeEntries = employeeTimeEntries.filter(t => new Date(t.endTime) <= new Date(endDate));
  }
  
  if (projectId) {
    employeeTimeEntries = employeeTimeEntries.filter(t => t.projectId === projectId);
  }

  // Calculate statistics
  const totalHours = employeeTimeEntries.reduce((sum, t) => sum + t.duration, 0);
  const averageHours = employeeTimeEntries.length > 0 ? totalHours / employeeTimeEntries.length : 0;

  res.json({ 
    timeEntries: employeeTimeEntries,
    statistics: {
      totalEntries: employeeTimeEntries.length,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100
    }
  });
});

// 23. Create Deal
router.post('/deals', [
  body('companyId').exists(),
  body('clientId').exists(),
  body('title').isLength({ min: 3 }),
  body('value').isFloat({ min: 0 }),
  body('stage').isIn(['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost']),
  body('probability').isInt({ min: 0, max: 100 }),
  body('expectedCloseDate').isISO8601(),
  body('ownerId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const deal = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  deals.push(deal);
  res.status(201).json({ message: 'Deal created successfully', deal });
});

// 24. Get Company Deals
router.get('/companies/:companyId/deals', (req, res) => {
  const { companyId } = req.params;
  const { stage, ownerId, clientId } = req.query;
  
  let companyDeals = deals.filter(d => d.companyId === companyId);
  
  if (stage) {
    companyDeals = companyDeals.filter(d => d.stage === stage);
  }
  
  if (ownerId) {
    companyDeals = companyDeals.filter(d => d.ownerId === ownerId);
  }
  
  if (clientId) {
    companyDeals = companyDeals.filter(d => d.clientId === clientId);
  }

  // Add client and owner details
  const dealsWithDetails = companyDeals.map(deal => {
    const client = clients.find(c => c.id === deal.clientId);
    const owner = employees.find(e => e.id === deal.ownerId);
    return { 
      ...deal, 
      client: client ? { id: client.id, name: client.name, email: client.email } : null,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null
    };
  });

  res.json({ deals: dealsWithDetails });
});

// 25. Get Business Dashboard
router.get('/dashboard/:companyId', (req, res) => {
  const { companyId } = req.params;
  const company = companies.find(c => c.id === companyId);
  
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const companyEmployees = employees.filter(e => e.companyId === companyId);
  const companyProjects = projects.filter(p => p.companyId === companyId);
  const companyExpenses = expenses.filter(e => e.companyId === companyId);
  const companyDeals = deals.filter(d => d.companyId === companyId);
  const companyClients = clients.filter(c => c.companyId === companyId);

  // Calculate KPIs
  const totalRevenue = companyDeals
    .filter(d => d.stage === 'closed-won')
    .reduce((sum, d) => sum + d.value, 0);
  
  const pipelineValue = companyDeals
    .filter(d => d.stage !== 'closed-lost')
    .reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

  const activeProjects = companyProjects.filter(p => p.status === 'active').length;
  const pendingExpenses = companyExpenses.filter(e => e.status === 'pending').length;
  const totalExpenses = companyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const dashboard = {
    companyId,
    company: {
      name: company.name,
      industry: company.industry,
      employeeCount: companyEmployees.length
    },
    kpis: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pipelineValue: Math.round(pipelineValue * 100) / 100,
      activeProjects,
      totalDeals: companyDeals.length,
      wonDeals: companyDeals.filter(d => d.stage === 'closed-won').length,
      totalClients: companyClients.length,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      pendingExpenses
    },
    recentActivity: {
      newProjects: companyProjects.slice(-3),
      recentDeals: companyDeals.slice(-5),
      pendingExpenses: companyExpenses.filter(e => e.status === 'pending').slice(-5)
    },
    charts: {
      dealsByStage: getDealsByStage(companyDeals),
      expensesByCategory: getExpensesByCategory(companyExpenses),
      projectsByStatus: getProjectsByStatus(companyProjects)
    },
    lastUpdated: new Date().toISOString()
  };

  res.json(dashboard);
});

// Helper functions for dashboard charts
function getDealsByStage(deals) {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
  return stages.map(stage => ({
    stage,
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0)
  }));
}

function getExpensesByCategory(expenses) {
  const categories = [...new Set(expenses.map(e => e.category))];
  return categories.map(category => ({
    category,
    total: expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0),
    count: expenses.filter(e => e.category === category).length
  }));
}

function getProjectsByStatus(projects) {
  const statuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
  return statuses.map(status => ({
    status,
    count: projects.filter(p => p.status === status).length
  }));
}

module.exports = router;