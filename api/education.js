const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const courses = [];
const lessons = [];
const enrollments = [];
const assignments = [];
const submissions = [];
const quizzes = [];
const grades = [];
const certificates = [];
const resources = [];

// 1. Get All Courses
router.get('/courses', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category;
  const level = req.query.level;
  const search = req.query.search;
  const status = req.query.status;

  let filteredCourses = courses;
  
  if (category) {
    filteredCourses = filteredCourses.filter(c => c.category === category);
  }
  
  if (level) {
    filteredCourses = filteredCourses.filter(c => c.level === level);
  }
  
  if (status) {
    filteredCourses = filteredCourses.filter(c => c.status === status);
  }
  
  if (search) {
    filteredCourses = filteredCourses.filter(c => 
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredCourses.slice(startIndex, endIndex);

  res.json({
    courses: result,
    pagination: {
      page,
      limit,
      total: filteredCourses.length,
      pages: Math.ceil(filteredCourses.length / limit)
    }
  });
});

// 2. Get Course by ID
router.get('/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const courseLessons = lessons.filter(l => l.courseId === courseId);
  const enrollmentCount = enrollments.filter(e => e.courseId === courseId).length;

  res.json({ 
    course, 
    lessons: courseLessons,
    enrollmentCount,
    averageRating: course.rating || 0
  });
});

// 3. Create Course
router.post('/courses', [
  body('title').isLength({ min: 5 }),
  body('description').isLength({ min: 20 }),
  body('instructorId').exists(),
  body('category').isString(),
  body('level').isIn(['beginner', 'intermediate', 'advanced']),
  body('duration').isInt({ min: 1 }),
  body('price').isFloat({ min: 0 }),
  body('language').optional().isString(),
  body('requirements').optional().isArray(),
  body('objectives').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const course = {
    id: uuidv4(),
    ...req.body,
    status: 'draft',
    enrolled: 0,
    rating: 0,
    reviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  courses.push(course);
  res.status(201).json({ message: 'Course created successfully', course });
});

// 4. Enroll in Course
router.post('/enroll', [
  body('courseId').exists(),
  body('studentId').exists(),
  body('paymentMethod').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { courseId, studentId, paymentMethod } = req.body;
  
  // Check if already enrolled
  if (enrollments.some(e => e.courseId === courseId && e.studentId === studentId)) {
    return res.status(400).json({ error: 'Already enrolled in this course' });
  }

  const course = courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const enrollment = {
    id: uuidv4(),
    courseId,
    studentId,
    status: 'active',
    enrolledAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
    paymentMethod: paymentMethod || 'free'
  };

  enrollments.push(enrollment);
  course.enrolled += 1;

  res.status(201).json({ message: 'Successfully enrolled in course', enrollment });
});

// 5. Get Student Enrollments
router.get('/enrollments/:studentId', (req, res) => {
  const { studentId } = req.params;
  const { status } = req.query;
  
  let studentEnrollments = enrollments.filter(e => e.studentId === studentId);
  
  if (status) {
    studentEnrollments = studentEnrollments.filter(e => e.status === status);
  }

  // Add course details
  const enrollmentsWithCourses = studentEnrollments.map(enrollment => {
    const course = courses.find(c => c.id === enrollment.courseId);
    return { ...enrollment, course };
  });

  res.json({ enrollments: enrollmentsWithCourses });
});

// 6. Get Course Lessons
router.get('/courses/:courseId/lessons', (req, res) => {
  const { courseId } = req.params;
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const courseLessons = lessons.filter(l => l.courseId === courseId);
  courseLessons.sort((a, b) => a.order - b.order);

  res.json({ lessons: courseLessons });
});

// 7. Create Lesson
router.post('/lessons', [
  body('courseId').exists(),
  body('title').isLength({ min: 3 }),
  body('content').isString(),
  body('type').isIn(['video', 'text', 'quiz', 'assignment']),
  body('duration').isInt({ min: 1 }),
  body('order').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const lesson = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  lessons.push(lesson);
  res.status(201).json({ message: 'Lesson created successfully', lesson });
});

// 8. Get Lesson by ID
router.get('/lessons/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const lesson = lessons.find(l => l.id === lessonId);
  
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const course = courses.find(c => c.id === lesson.courseId);
  const assignments = assignmentsData.filter(a => a.lessonId === lessonId);

  res.json({ 
    lesson, 
    course: course ? { id: course.id, title: course.title } : null,
    assignments
  });
});

// 9. Mark Lesson as Completed
router.post('/lessons/:lessonId/complete', [
  body('studentId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { lessonId } = req.params;
  const { studentId } = req.body;
  
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  // Check enrollment
  const enrollment = enrollments.find(e => 
    e.courseId === lesson.courseId && e.studentId === studentId
  );
  
  if (!enrollment) {
    return res.status(400).json({ error: 'Not enrolled in this course' });
  }

  // Mark as completed (in real app, would have a separate progress table)
  const progress = {
    id: uuidv4(),
    lessonId,
    studentId,
    completedAt: new Date().toISOString()
  };

  // Update enrollment progress
  const totalLessons = lessons.filter(l => l.courseId === lesson.courseId).length;
  const completedLessons = Math.floor(enrollment.progress * totalLessons / 100) + 1;
  enrollment.progress = Math.round((completedLessons / totalLessons) * 100);

  res.json({ message: 'Lesson marked as completed', progress });
});

// 10. Create Assignment
router.post('/assignments', [
  body('courseId').exists(),
  body('lessonId').optional().isString(),
  body('title').isLength({ min: 3 }),
  body('description').isLength({ min: 10 }),
  body('type').isIn(['essay', 'quiz', 'project', 'code']),
  body('dueDate').isISO8601(),
  body('maxScore').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const assignment = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  assignments.push(assignment);
  res.status(201).json({ message: 'Assignment created successfully', assignment });
});

// 11. Get Course Assignments
router.get('/courses/:courseId/assignments', (req, res) => {
  const { courseId } = req.params;
  const courseAssignments = assignments.filter(a => a.courseId === courseId);
  
  res.json({ assignments: courseAssignments });
});

// 12. Submit Assignment
router.post('/assignments/:assignmentId/submit', [
  body('studentId').exists(),
  body('content').isString(),
  body('attachments').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { assignmentId } = req.params;
  const assignment = assignments.find(a => a.id === assignmentId);
  
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  // Check if already submitted
  if (submissions.some(s => s.assignmentId === assignmentId && s.studentId === req.body.studentId)) {
    return res.status(400).json({ error: 'Assignment already submitted' });
  }

  const submission = {
    id: uuidv4(),
    assignmentId,
    studentId: req.body.studentId,
    content: req.body.content,
    attachments: req.body.attachments || [],
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    score: null,
    feedback: null,
    gradedAt: null
  };

  submissions.push(submission);
  res.status(201).json({ message: 'Assignment submitted successfully', submission });
});

// 13. Grade Assignment
router.post('/submissions/:submissionId/grade', [
  body('instructorId').exists(),
  body('score').isInt({ min: 0 }),
  body('feedback').optional().isString()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { submissionId } = req.params;
  const submissionIndex = submissions.findIndex(s => s.id === submissionId);
  
  if (submissionIndex === -1) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  submissions[submissionIndex].score = req.body.score;
  submissions[submissionIndex].feedback = req.body.feedback || '';
  submissions[submissionIndex].gradedBy = req.body.instructorId;
  submissions[submissionIndex].gradedAt = new Date().toISOString();
  submissions[submissionIndex].status = 'graded';

  // Record grade
  const grade = {
    id: uuidv4(),
    submissionId,
    studentId: submissions[submissionIndex].studentId,
    assignmentId: submissions[submissionIndex].assignmentId,
    score: req.body.score,
    gradedAt: new Date().toISOString()
  };

  grades.push(grade);

  res.json({ message: 'Assignment graded successfully', submission: submissions[submissionIndex] });
});

// 14. Get Student Grades
router.get('/grades/:studentId', (req, res) => {
  const { studentId } = req.params;
  const { courseId } = req.query;
  
  let studentGrades = grades.filter(g => g.studentId === studentId);
  
  if (courseId) {
    studentGrades = studentGrades.filter(g => {
      const assignment = assignments.find(a => a.id === g.assignmentId);
      return assignment && assignment.courseId === courseId;
    });
  }

  // Add assignment details
  const gradesWithAssignments = studentGrades.map(grade => {
    const assignment = assignments.find(a => a.id === grade.assignmentId);
    const course = assignment ? courses.find(c => c.id === assignment.courseId) : null;
    return { 
      ...grade, 
      assignment: assignment ? { id: assignment.id, title: assignment.title, maxScore: assignment.maxScore } : null,
      course: course ? { id: course.id, title: course.title } : null
    };
  });

  // Calculate statistics
  const totalScore = gradesWithAssignments.reduce((sum, g) => sum + g.score, 0);
  const maxTotalScore = gradesWithAssignments.reduce((sum, g) => sum + (g.assignment?.maxScore || 0), 0);
  const averageScore = maxTotalScore > 0 ? (totalScore / maxTotalScore * 100) : 0;

  res.json({ 
    grades: gradesWithAssignments,
    statistics: {
      totalAssignments: gradesWithAssignments.length,
      totalScore,
      maxTotalScore,
      averagePercentage: Math.round(averageScore * 100) / 100
    }
  });
});

// 15. Create Quiz
router.post('/quizzes', [
  body('courseId').exists(),
  body('lessonId').optional().isString(),
  body('title').isLength({ min: 3 }),
  body('questions').isArray(),
  body('timeLimit').optional().isInt({ min: 1 }),
  body('attempts').optional().isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const quiz = {
    id: uuidv4(),
    ...req.body,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  quizzes.push(quiz);
  res.status(201).json({ message: 'Quiz created successfully', quiz });
});

// 16. Get Quiz by ID
router.get('/quizzes/:quizId', (req, res) => {
  const { quizId } = req.params;
  const quiz = quizzes.find(q => q.id === quizId);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  res.json({ quiz });
});

// 17. Submit Quiz Attempt
router.post('/quizzes/:quizId/attempt', [
  body('studentId').exists(),
  body('answers').isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { quizId } = req.params;
  const quiz = quizzes.find(q => q.id === quizId);
  
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const attempt = {
    id: uuidv4(),
    quizId,
    studentId: req.body.studentId,
    answers: req.body.answers,
    score: calculateQuizScore(quiz.questions, req.body.answers),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed'
  };

  res.status(201).json({ message: 'Quiz submitted successfully', attempt });
});

// 18. Issue Certificate
router.post('/certificates', [
  body('studentId').exists(),
  body('courseId').exists(),
  body('grade').isFloat({ min: 0 }),
  body('completionDate').isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const certificate = {
    id: uuidv4(),
    ...req.body,
    certificateUrl: `https://certificates.example.com/${uuidv4()}`,
    issuedAt: new Date().toISOString(),
    verificationCode: Math.random().toString(36).substring(2, 10).toUpperCase()
  };

  certificates.push(certificate);
  res.status(201).json({ message: 'Certificate issued successfully', certificate });
});

// 19. Get Student Certificates
router.get('/certificates/:studentId', (req, res) => {
  const { studentId } = req.params;
  const studentCertificates = certificates.filter(c => c.studentId === studentId);
  
  // Add course details
  const certificatesWithCourses = studentCertificates.map(cert => {
    const course = courses.find(c => c.id === cert.courseId);
    return { ...cert, course };
  });

  res.json({ certificates: certificatesWithCourses });
});

// 20. Get Educational Resources
router.get('/resources', (req, res) => {
  const { type, subject, level } = req.query;
  
  let filteredResources = resources;
  
  if (type) {
    filteredResources = filteredResources.filter(r => r.type === type);
  }
  
  if (subject) {
    filteredResources = filteredResources.filter(r => r.subject === subject);
  }
  
  if (level) {
    filteredResources = filteredResources.filter(r => r.level === level);
  }

  res.json({ resources: filteredResources });
});

// Helper functions
function calculateQuizScore(questions, answers) {
  let correct = 0;
  questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) {
      correct += 1;
    }
  });
  return Math.round((correct / questions.length) * 100);
}

module.exports = router;