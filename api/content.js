const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const articles = [];
const pages = [];
const categories = [];
const tags = [];
const comments = [];
const media = [];
const drafts = [];
const published = [];
const analytics = [];

// 1. Create Article
router.post('/articles', [
  body('title').isLength({ min: 3, max: 200 }),
  body('content').isLength({ min: 10 }),
  body('authorId').exists(),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('featuredImage').optional().isURL(),
  body('excerpt').optional().isLength({ max: 500 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const article = {
    id: uuidv4(),
    ...req.body,
    status: 'draft',
    slug: req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    comments: 0
  };

  articles.push(article);
  res.status(201).json({ message: 'Article created successfully', article });
});

// 2. Get All Articles
router.get('/articles', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const category = req.query.category;
  const authorId = req.query.authorId;
  const search = req.query.search;

  let filteredArticles = articles;
  
  if (status) {
    filteredArticles = filteredArticles.filter(a => a.status === status);
  }
  
  if (category) {
    filteredArticles = filteredArticles.filter(a => a.category === category);
  }
  
  if (authorId) {
    filteredArticles = filteredArticles.filter(a => a.authorId === authorId);
  }
  
  if (search) {
    filteredArticles = filteredArticles.filter(a => 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredArticles.slice(startIndex, endIndex);

  res.json({
    articles: result,
    pagination: {
      page,
      limit,
      total: filteredArticles.length,
      pages: Math.ceil(filteredArticles.length / limit)
    }
  });
});

// 3. Get Article by ID
router.get('/articles/:articleId', (req, res) => {
  const { articleId } = req.params;
  const article = articles.find(a => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Increment views
  article.views += 1;

  // Track analytics
  const analytic = {
    id: uuidv4(),
    articleId,
    type: 'view',
    timestamp: new Date().toISOString(),
    ip: req.ip
  };
  analytics.push(analytic);

  res.json({ article });
});

// 4. Update Article
router.put('/articles/:articleId', [
  body('title').optional().isLength({ min: 3, max: 200 }),
  body('content').optional().isLength({ min: 10 }),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['draft', 'published', 'archived'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { articleId } = req.params;
  const articleIndex = articles.findIndex(a => a.id === articleId);
  
  if (articleIndex === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const updatedArticle = {
    ...articles[articleIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  if (req.body.title) {
    updatedArticle.slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  articles[articleIndex] = updatedArticle;
  res.json({ message: 'Article updated successfully', article: updatedArticle });
});

// 5. Delete Article
router.delete('/articles/:articleId', (req, res) => {
  const { articleId } = req.params;
  const articleIndex = articles.findIndex(a => a.id === articleId);
  
  if (articleIndex === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }

  articles.splice(articleIndex, 1);
  
  // Delete related comments
  comments.splice(0, comments.length, ...comments.filter(c => c.articleId !== articleId));

  res.json({ message: 'Article deleted successfully' });
});

// 6. Publish Article
router.post('/articles/:articleId/publish', (req, res) => {
  const { articleId } = req.params;
  const articleIndex = articles.findIndex(a => a.id === articleId);
  
  if (articleIndex === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }

  articles[articleIndex].status = 'published';
  articles[articleIndex].publishedAt = new Date().toISOString();
  articles[articleIndex].updatedAt = new Date().toISOString();

  res.json({ message: 'Article published successfully', article: articles[articleIndex] });
});

// 7. Create Category
router.post('/categories', [
  body('name').isLength({ min: 2, max: 50 }),
  body('description').optional().isLength({ max: 500 }),
  body('parentId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const category = {
    id: uuidv4(),
    ...req.body,
    slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    createdAt: new Date().toISOString()
  };

  categories.push(category);
  res.status(201).json({ message: 'Category created successfully', category });
});

// 8. Get Categories
router.get('/categories', (req, res) => {
  const categoriesWithCount = categories.map(cat => ({
    ...cat,
    articleCount: articles.filter(a => a.category === cat.name).length
  }));

  res.json({ categories: categoriesWithCount });
});

// 9. Create Tag
router.post('/tags', [
  body('name').isLength({ min: 2, max: 30 }),
  body('description').optional().isLength({ max: 200 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if tag already exists
  if (tags.find(t => t.name.toLowerCase() === req.body.name.toLowerCase())) {
    return res.status(400).json({ error: 'Tag already exists' });
  }

  const tag = {
    id: uuidv4(),
    ...req.body,
    slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    createdAt: new Date().toISOString()
  };

  tags.push(tag);
  res.status(201).json({ message: 'Tag created successfully', tag });
});

// 10. Get Tags
router.get('/tags', (req, res) => {
  const tagsWithCount = tags.map(tag => ({
    ...tag,
    articleCount: articles.filter(a => a.tags && a.tags.includes(tag.name)).length
  }));

  res.json({ tags: tagsWithCount });
});

// 11. Add Comment
router.post('/articles/:articleId/comments', [
  body('userId').exists(),
  body('content').isLength({ min: 1, max: 1000 }),
  body('parentId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { articleId } = req.params;
  const article = articles.find(a => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const comment = {
    id: uuidv4(),
    articleId,
    ...req.body,
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  comments.push(comment);
  article.comments += 1;

  res.status(201).json({ message: 'Comment added successfully', comment });
});

// 12. Get Comments
router.get('/articles/:articleId/comments', (req, res) => {
  const { articleId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const articleComments = comments.filter(c => c.articleId === articleId);
  articleComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = articleComments.slice(startIndex, endIndex);

  res.json({
    comments: result,
    pagination: {
      page,
      limit,
      total: articleComments.length,
      pages: Math.ceil(articleComments.length / limit)
    }
  });
});

// 13. Like Article
router.post('/articles/:articleId/like', [
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { articleId } = req.params;
  const { userId } = req.body;
  const article = articles.find(a => a.id === articleId);
  
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Check if already liked (simplified - in real app would have likes table)
  article.likes += 1;

  // Track analytics
  const analytic = {
    id: uuidv4(),
    articleId,
    userId,
    type: 'like',
    timestamp: new Date().toISOString()
  };
  analytics.push(analytic);

  res.json({ message: 'Article liked successfully', likes: article.likes });
});

// 14. Create Page
router.post('/pages', [
  body('title').isLength({ min: 3, max: 200 }),
  body('content').isLength({ min: 10 }),
  body('slug').isLength({ min: 3 }),
  body('authorId').exists(),
  body('metaTitle').optional().isLength({ max: 60 }),
  body('metaDescription').optional().isLength({ max: 160 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if slug already exists
  if (pages.find(p => p.slug === req.body.slug)) {
    return res.status(400).json({ error: 'Slug already exists' });
  }

  const page = {
    id: uuidv4(),
    ...req.body,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  pages.push(page);
  res.status(201).json({ message: 'Page created successfully', page });
});

// 15. Get Pages
router.get('/pages', (req, res) => {
  const status = req.query.status;
  
  let filteredPages = pages;
  if (status) {
    filteredPages = filteredPages.filter(p => p.status === status);
  }

  res.json({ pages: filteredPages });
});

// 16. Get Page by Slug
router.get('/pages/slug/:slug', (req, res) => {
  const { slug } = req.params;
  const page = pages.find(p => p.slug === slug);
  
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }

  res.json({ page });
});

// 17. Upload Media
router.post('/media', [
  body('filename').isLength({ min: 1 }),
  body('mimeType').exists(),
  body('size').isInt({ min: 0 }),
  body('url').isURL(),
  body('uploadedBy').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const mediaItem = {
    id: uuidv4(),
    ...req.body,
    type: req.body.mimeType.startsWith('image/') ? 'image' : 'file',
    uploadedAt: new Date().toISOString()
  };

  media.push(mediaItem);
  res.status(201).json({ message: 'Media uploaded successfully', media: mediaItem });
});

// 18. Get Media
router.get('/media', (req, res) => {
  const type = req.query.type;
  const uploadedBy = req.query.uploadedBy;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  let filteredMedia = media;
  
  if (type) {
    filteredMedia = filteredMedia.filter(m => m.type === type);
  }
  
  if (uploadedBy) {
    filteredMedia = filteredMedia.filter(m => m.uploadedBy === uploadedBy);
  }

  filteredMedia.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredMedia.slice(startIndex, endIndex);

  res.json({
    media: result,
    pagination: {
      page,
      limit,
      total: filteredMedia.length,
      pages: Math.ceil(filteredMedia.length / limit)
    }
  });
});

// 19. Search Content
router.get('/search', (req, res) => {
  const { q, type = 'all', page = 1, limit = 10 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const query = q.toLowerCase();
  let results = [];

  if (type === 'all' || type === 'articles') {
    const articleResults = articles.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.content.toLowerCase().includes(query) ||
      (a.excerpt && a.excerpt.toLowerCase().includes(query))
    ).map(a => ({ ...a, type: 'article' }));
    results.push(...articleResults);
  }

  if (type === 'all' || type === 'pages') {
    const pageResults = pages.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query)
    ).map(p => ({ ...p, type: 'page' }));
    results.push(...pageResults);
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedResults = results.slice(startIndex, endIndex);

  res.json({
    results: paginatedResults,
    query: q,
    type,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: results.length
    }
  });
});

// 20. Get Content Analytics
router.get('/analytics/:contentId', (req, res) => {
  const { contentId } = req.params;
  const { period = '7d' } = req.query;
  
  const contentAnalytics = analytics.filter(a => a.articleId === contentId);
  
  // Calculate period-specific data
  const now = new Date();
  const periodDays = parseInt(period.replace('d', ''));
  const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const periodAnalytics = contentAnalytics.filter(a => 
    new Date(a.timestamp) >= startDate
  );

  const views = periodAnalytics.filter(a => a.type === 'view').length;
  const likes = periodAnalytics.filter(a => a.type === 'like').length;

  const dailyStats = [];
  for (let i = 0; i < periodDays; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayViews = periodAnalytics.filter(a => 
      a.type === 'view' && a.timestamp.startsWith(dateStr)
    ).length;

    dailyStats.push({
      date: dateStr,
      views: dayViews
    });
  }

  res.json({
    contentId,
    period,
    totalViews: views,
    totalLikes: likes,
    dailyStats: dailyStats.reverse()
  });
});

module.exports = router;