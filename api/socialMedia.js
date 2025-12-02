const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const posts = [];
const comments = [];
const likes = [];
const followers = [];
const messages = [];
const stories = [];
const hashtags = [];
const notifications = [];

// 1. Create Post
router.post('/posts', [
  body('userId').exists(),
  body('content').isLength({ min: 1, max: 2000 }),
  body('media').optional().isArray(),
  body('hashtags').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const post = {
    id: uuidv4(),
    ...req.body,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString()
  };

  posts.push(post);
  res.status(201).json({ message: 'Post created successfully', post });
});

// 2. Get All Posts
router.get('/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const userId = req.query.userId;

  let filteredPosts = posts;
  if (userId) {
    filteredPosts = posts.filter(p => p.userId === userId);
  }

  filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredPosts.slice(startIndex, endIndex);

  res.json({
    posts: result,
    pagination: {
      page,
      limit,
      total: filteredPosts.length,
      pages: Math.ceil(filteredPosts.length / limit)
    }
  });
});

// 3. Get Post by ID
router.get('/posts/:postId', (req, res) => {
  const { postId } = req.params;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const postComments = comments.filter(c => c.postId === postId);
  const postLikes = likes.filter(l => l.postId === postId);

  res.json({ 
    post, 
    comments: postComments,
    likes: postLikes,
    totalLikes: postLikes.length,
    totalComments: postComments.length
  });
});

// 4. Update Post
router.put('/posts/:postId', [
  body('content').optional().isLength({ min: 1, max: 2000 }),
  body('media').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { postId } = req.params;
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  posts[postIndex] = { ...posts[postIndex], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ message: 'Post updated successfully', post: posts[postIndex] });
});

// 5. Delete Post
router.delete('/posts/:postId', (req, res) => {
  const { postId } = req.params;
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  posts.splice(postIndex, 1);
  
  // Delete related comments and likes
  comments.splice(0, comments.length, ...comments.filter(c => c.postId !== postId));
  likes.splice(0, likes.length, ...likes.filter(l => l.postId !== postId));

  res.json({ message: 'Post deleted successfully' });
});

// 6. Like Post
router.post('/posts/:postId/like', [
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { postId } = req.params;
  const { userId } = req.body;

  const existingLike = likes.find(l => l.postId === postId && l.userId === userId);
  if (existingLike) {
    return res.status(400).json({ error: 'Post already liked' });
  }

  const like = {
    id: uuidv4(),
    postId,
    userId,
    createdAt: new Date().toISOString()
  };

  likes.push(like);

  const post = posts.find(p => p.id === postId);
  if (post) {
    post.likes += 1;
  }

  res.json({ message: 'Post liked successfully', like });
});

// 7. Unlike Post
router.delete('/posts/:postId/like/:userId', (req, res) => {
  const { postId, userId } = req.params;
  const likeIndex = likes.findIndex(l => l.postId === postId && l.userId === userId);
  
  if (likeIndex === -1) {
    return res.status(404).json({ error: 'Like not found' });
  }

  likes.splice(likeIndex, 1);

  const post = posts.find(p => p.id === postId);
  if (post) {
    post.likes = Math.max(0, post.likes - 1);
  }

  res.json({ message: 'Post unliked successfully' });
});

// 8. Add Comment
router.post('/posts/:postId/comments', [
  body('userId').exists(),
  body('content').isLength({ min: 1, max: 500 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { postId } = req.params;
  const comment = {
    id: uuidv4(),
    postId,
    ...req.body,
    likes: 0,
    createdAt: new Date().toISOString()
  };

  comments.push(comment);

  const post = posts.find(p => p.id === postId);
  if (post) {
    post.comments += 1;
  }

  res.status(201).json({ message: 'Comment added successfully', comment });
});

// 9. Get Comments
router.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const postComments = comments.filter(c => c.postId === postId);
  
  postComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ comments: postComments });
});

// 10. Follow User
router.post('/follow', [
  body('followerId').exists(),
  body('followingId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { followerId, followingId } = req.body;

  if (followerId === followingId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  const existingFollow = followers.find(f => 
    f.followerId === followerId && f.followingId === followingId
  );

  if (existingFollow) {
    return res.status(400).json({ error: 'Already following this user' });
  }

  const follow = {
    id: uuidv4(),
    followerId,
    followingId,
    createdAt: new Date().toISOString()
  };

  followers.push(follow);
  res.status(201).json({ message: 'User followed successfully', follow });
});

// 11. Unfollow User
router.delete('/follow/:followerId/:followingId', (req, res) => {
  const { followerId, followingId } = req.params;
  const followIndex = followers.findIndex(f => 
    f.followerId === followerId && f.followingId === followingId
  );
  
  if (followIndex === -1) {
    return res.status(404).json({ error: 'Follow relationship not found' });
  }

  followers.splice(followIndex, 1);
  res.json({ message: 'User unfollowed successfully' });
});

// 12. Get Followers
router.get('/followers/:userId', (req, res) => {
  const { userId } = req.params;
  const userFollowers = followers.filter(f => f.followingId === userId);
  
  res.json({ 
    followers: userFollowers,
    count: userFollowers.length
  });
});

// 13. Get Following
router.get('/following/:userId', (req, res) => {
  const { userId } = req.params;
  const userFollowing = followers.filter(f => f.followerId === userId);
  
  res.json({ 
    following: userFollowing,
    count: userFollowing.length
  });
});

// 14. Send Message
router.post('/messages', [
  body('senderId').exists(),
  body('receiverId').exists(),
  body('content').isLength({ min: 1, max: 1000 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const message = {
    id: uuidv4(),
    ...req.body,
    read: false,
    createdAt: new Date().toISOString()
  };

  messages.push(message);
  res.status(201).json({ message: 'Message sent successfully', message });
});

// 15. Get Messages
router.get('/messages/:userId', (req, res) => {
  const { userId } = req.params;
  const userMessages = messages.filter(m => 
    m.senderId === userId || m.receiverId === userId
  );
  
  userMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ messages: userMessages });
});

// 16. Create Story
router.post('/stories', [
  body('userId').exists(),
  body('media').isArray(),
  body('type').isIn(['image', 'video'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const story = {
    id: uuidv4(),
    ...req.body,
    views: 0,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  stories.push(story);
  res.status(201).json({ message: 'Story created successfully', story });
});

// 17. Get Stories
router.get('/stories', (req, res) => {
  const activeStories = stories.filter(s => 
    new Date(s.expiresAt) > new Date()
  );
  
  res.json({ stories: activeStories });
});

// 18. View Story
router.post('/stories/:storyId/view', [
  body('userId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { storyId } = req.params;
  const story = stories.find(s => s.id === storyId);
  
  if (!story) {
    return res.status(404).json({ error: 'Story not found' });
  }

  story.views += 1;
  res.json({ message: 'Story viewed successfully', views: story.views });
});

// 19. Trending Hashtags
router.get('/trending', (req, res) => {
  const allHashtags = [];
  posts.forEach(post => {
    if (post.hashtags) {
      allHashtags.push(...post.hashtags);
    }
  });

  const hashtagCounts = {};
  allHashtags.forEach(tag => {
    hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
  });

  const trending = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ hashtag: tag, count }));

  res.json({ trending });
});

// 20. Get Feed
router.get('/feed/:userId', (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const following = followers.filter(f => f.followerId === userId).map(f => f.followingId);
  const feedPosts = posts.filter(p => following.includes(p.userId) || p.userId === userId);
  
  feedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = feedPosts.slice(startIndex, endIndex);

  res.json({
    posts: result,
    pagination: {
      page,
      limit,
      total: feedPosts.length,
      pages: Math.ceil(feedPosts.length / limit)
    }
  });
});

module.exports = router;