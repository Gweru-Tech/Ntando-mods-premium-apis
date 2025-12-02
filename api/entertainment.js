const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const movies = [];
const tvShows = [];
const music = [];
const books = [];
const games = [];
const podcasts = [];
const playlists = [];
const reviews = [];
const watchlist = [];
const recommendations = [];

// 1. Get Movies
router.get('/movies', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const genre = req.query.genre;
  const year = req.query.year;
  const rating = req.query.rating;
  const search = req.query.search;

  let filteredMovies = movies;
  
  if (genre) {
    filteredMovies = filteredMovies.filter(m => m.genres.includes(genre));
  }
  
  if (year) {
    filteredMovies = filteredMovies.filter(m => m.year === parseInt(year));
  }
  
  if (rating) {
    filteredMovies = filteredMovies.filter(m => m.rating >= parseFloat(rating));
  }
  
  if (search) {
    filteredMovies = filteredMovies.filter(m => 
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredMovies.sort((a, b) => b.popularity - a.popularity);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredMovies.slice(startIndex, endIndex);

  res.json({
    movies: result,
    pagination: {
      page,
      limit,
      total: filteredMovies.length,
      pages: Math.ceil(filteredMovies.length / limit)
    }
  });
});

// 2. Get Movie by ID
router.get('/movies/:movieId', (req, res) => {
  const { movieId } = req.params;
  const movie = movies.find(m => m.id === movieId);
  
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const movieReviews = reviews.filter(r => r.type === 'movie' && r.itemId === movieId);
  const similarMovies = movies.filter(m => 
    m.id !== movieId && m.genres.some(g => movie.genres.includes(g))
  ).slice(0, 5);

  res.json({ 
    movie, 
    reviews: movieReviews,
    similarMovies,
    averageRating: movieReviews.length > 0 
      ? movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length 
      : movie.rating
  });
});

// 3. Get TV Shows
router.get('/tvshows', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const genre = req.query.genre;
  const status = req.query.status;
  const search = req.query.search;

  let filteredShows = tvShows;
  
  if (genre) {
    filteredShows = filteredShows.filter(s => s.genres.includes(genre));
  }
  
  if (status) {
    filteredShows = filteredShows.filter(s => s.status === status);
  }
  
  if (search) {
    filteredShows = filteredShows.filter(s => 
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredShows.sort((a, b) => b.popularity - a.popularity);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredShows.slice(startIndex, endIndex);

  res.json({
    tvShows: result,
    pagination: {
      page,
      limit,
      total: filteredShows.length,
      pages: Math.ceil(filteredShows.length / limit)
    }
  });
});

// 4. Get TV Show by ID
router.get('/tvshows/:showId', (req, res) => {
  const { showId } = req.params;
  const show = tvShows.find(s => s.id === showId);
  
  if (!show) {
    return res.status(404).json({ error: 'TV show not found' });
  }

  const showReviews = reviews.filter(r => r.type === 'tvshow' && r.itemId === showId);
  const similarShows = tvShows.filter(s => 
    s.id !== showId && s.genres.some(g => show.genres.includes(g))
  ).slice(0, 5);

  res.json({ 
    show, 
    reviews: showReviews,
    similarShows,
    averageRating: showReviews.length > 0 
      ? showReviews.reduce((sum, r) => sum + r.rating, 0) / showReviews.length 
      : show.rating
  });
});

// 5. Get Music
router.get('/music', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const genre = req.query.genre;
  const artist = req.query.artist;
  const search = req.query.search;

  let filteredMusic = music;
  
  if (genre) {
    filteredMusic = filteredMusic.filter(m => m.genre === genre);
  }
  
  if (artist) {
    filteredMusic = filteredMusic.filter(m => m.artist === artist);
  }
  
  if (search) {
    filteredMusic = filteredMusic.filter(m => 
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.artist.toLowerCase().includes(search.toLowerCase()) ||
      m.album.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredMusic.sort((a, b) => b.popularity - a.popularity);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredMusic.slice(startIndex, endIndex);

  res.json({
    music: result,
    pagination: {
      page,
      limit,
      total: filteredMusic.length,
      pages: Math.ceil(filteredMusic.length / limit)
    }
  });
});

// 6. Get Books
router.get('/books', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const genre = req.query.genre;
  const author = req.query.author;
  const search = req.query.search;

  let filteredBooks = books;
  
  if (genre) {
    filteredBooks = filteredBooks.filter(b => b.genre === genre);
  }
  
  if (author) {
    filteredBooks = filteredBooks.filter(b => b.author === author);
  }
  
  if (search) {
    filteredBooks = filteredBooks.filter(b => 
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredBooks.sort((a, b) => b.rating - a.rating);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredBooks.slice(startIndex, endIndex);

  res.json({
    books: result,
    pagination: {
      page,
      limit,
      total: filteredBooks.length,
      pages: Math.ceil(filteredBooks.length / limit)
    }
  });
});

// 7. Get Games
router.get('/games', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const genre = req.query.genre;
  const platform = req.query.platform;
  const search = req.query.search;

  let filteredGames = games;
  
  if (genre) {
    filteredGames = filteredGames.filter(g => g.genre === genre);
  }
  
  if (platform) {
    filteredGames = filteredGames.filter(g => g.platforms.includes(platform));
  }
  
  if (search) {
    filteredGames = filteredGames.filter(g => 
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredGames.sort((a, b) => b.rating - a.rating);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredGames.slice(startIndex, endIndex);

  res.json({
    games: result,
    pagination: {
      page,
      limit,
      total: filteredGames.length,
      pages: Math.ceil(filteredGames.length / limit)
    }
  });
});

// 8. Get Podcasts
router.get('/podcasts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category;
  const search = req.query.search;

  let filteredPodcasts = podcasts;
  
  if (category) {
    filteredPodcasts = filteredPodcasts.filter(p => p.category === category);
  }
  
  if (search) {
    filteredPodcasts = filteredPodcasts.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredPodcasts.sort((a, b) => b.popularity - a.popularity);

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredPodcasts.slice(startIndex, endIndex);

  res.json({
    podcasts: result,
    pagination: {
      page,
      limit,
      total: filteredPodcasts.length,
      pages: Math.ceil(filteredPodcasts.length / limit)
    }
  });
});

// 9. Add Review
router.post('/reviews', [
  body('userId').exists(),
  body('type').isIn(['movie', 'tvshow', 'music', 'book', 'game', 'podcast']),
  body('itemId').exists(),
  body('rating').isInt({ min: 1, max: 10 }),
  body('comment').isLength({ min: 10, max: 1000 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const review = {
    id: uuidv4(),
    ...req.body,
    helpful: 0,
    createdAt: new Date().toISOString()
  };

  reviews.push(review);
  res.status(201).json({ message: 'Review added successfully', review });
});

// 10. Get Reviews
router.get('/reviews', (req, res) => {
  const { type, itemId, userId, sort = 'newest' } = req.query;
  
  let filteredReviews = reviews;
  
  if (type) {
    filteredReviews = filteredReviews.filter(r => r.type === type);
  }
  
  if (itemId) {
    filteredReviews = filteredReviews.filter(r => r.itemId === itemId);
  }
  
  if (userId) {
    filteredReviews = filteredReviews.filter(r => r.userId === userId);
  }

  // Sort reviews
  if (sort === 'newest') {
    filteredReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'rating_high') {
    filteredReviews.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'rating_low') {
    filteredReviews.sort((a, b) => a.rating - b.rating);
  }

  res.json({ reviews: filteredReviews });
});

// 11. Add to Watchlist
router.post('/watchlist', [
  body('userId').exists(),
  body('type').isIn(['movie', 'tvshow', 'book', 'game']),
  body('itemId').exists(),
  body('priority').optional().isIn(['low', 'medium', 'high'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, type, itemId, priority = 'medium' } = req.body;
  
  // Check if already in watchlist
  if (watchlist.some(w => w.userId === userId && w.type === type && w.itemId === itemId)) {
    return res.status(400).json({ error: 'Item already in watchlist' });
  }

  const watchlistItem = {
    id: uuidv4(),
    userId,
    type,
    itemId,
    priority,
    addedAt: new Date().toISOString(),
    status: 'planned'
  };

  watchlist.push(watchlistItem);
  res.status(201).json({ message: 'Added to watchlist', watchlistItem });
});

// 12. Get Watchlist
router.get('/watchlist/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, status, sort = 'added_desc' } = req.query;
  
  let filteredWatchlist = watchlist.filter(w => w.userId === userId);
  
  if (type) {
    filteredWatchlist = filteredWatchlist.filter(w => w.type === type);
  }
  
  if (status) {
    filteredWatchlist = filteredWatchlist.filter(w => w.status === status);
  }

  // Sort watchlist
  if (sort === 'added_desc') {
    filteredWatchlist.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  } else if (sort === 'priority') {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    filteredWatchlist.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  // Get item details
  const watchlistWithDetails = filteredWatchlist.map(item => {
    let details = null;
    switch (item.type) {
      case 'movie':
        details = movies.find(m => m.id === item.itemId);
        break;
      case 'tvshow':
        details = tvShows.find(s => s.id === item.itemId);
        break;
      case 'book':
        details = books.find(b => b.id === item.itemId);
        break;
      case 'game':
        details = games.find(g => g.id === item.itemId);
        break;
    }
    return { ...item, details };
  });

  res.json({ watchlist: watchlistWithDetails });
});

// 13. Remove from Watchlist
router.delete('/watchlist/:watchlistId', (req, res) => {
  const { watchlistId } = req.params;
  const index = watchlist.findIndex(w => w.id === watchlistId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Watchlist item not found' });
  }

  watchlist.splice(index, 1);
  res.json({ message: 'Removed from watchlist' });
});

// 14. Create Playlist
router.post('/playlists', [
  body('userId').exists(),
  body('name').isLength({ min: 3 }),
  body('description').optional().isString(),
  body('isPublic').optional().isBoolean(),
  body('tracks').optional().isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const playlist = {
    id: uuidv4(),
    ...req.body,
    tracks: req.body.tracks || [],
    duration: 0,
    trackCount: (req.body.tracks || []).length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  playlists.push(playlist);
  res.status(201).json({ message: 'Playlist created successfully', playlist });
});

// 15. Get Playlists
router.get('/playlists', (req, res) => {
  const { userId, isPublic } = req.query;
  
  let filteredPlaylists = playlists;
  
  if (userId) {
    filteredPlaylists = filteredPlaylists.filter(p => p.userId === userId);
  }
  
  if (isPublic !== undefined) {
    filteredPlaylists = filteredPlaylists.filter(p => p.isPublic === (isPublic === 'true'));
  }

  res.json({ playlists: filteredPlaylists });
});

// 16. Add Track to Playlist
router.post('/playlists/:playlistId/tracks', [
  body('trackId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { playlistId } = req.params;
  const { trackId } = req.body;
  
  const playlistIndex = playlists.findIndex(p => p.id === playlistId);
  if (playlistIndex === -1) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const playlist = playlists[playlistIndex];
  if (playlist.tracks.includes(trackId)) {
    return res.status(400).json({ error: 'Track already in playlist' });
  }

  playlist.tracks.push(trackId);
  playlist.trackCount = playlist.tracks.length;
  playlist.updatedAt = new Date().toISOString();

  res.json({ message: 'Track added to playlist', playlist });
});

// 17. Get Personalized Recommendations
router.get('/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, limit = 10 } = req.query;
  
  let recommendedItems = [];
  
  if (!type || type === 'all') {
    recommendedItems = [
      ...getMovieRecommendations(userId, 3),
      ...getMusicRecommendations(userId, 3),
      ...getBookRecommendations(userId, 2),
      ...getGameRecommendations(userId, 2)
    ];
  } else {
    switch (type) {
      case 'movies':
        recommendedItems = getMovieRecommendations(userId, limit);
        break;
      case 'music':
        recommendedItems = getMusicRecommendations(userId, limit);
        break;
      case 'books':
        recommendedItems = getBookRecommendations(userId, limit);
        break;
      case 'games':
        recommendedItems = getGameRecommendations(userId, limit);
        break;
    }
  }

  const recommendation = {
    userId,
    type: type || 'all',
    recommendations: recommendedItems,
    generatedAt: new Date().toISOString()
  };

  res.json(recommendation);
});

// 18. Search Entertainment
router.get('/search', (req, res) => {
  const { q, type = 'all', page = 1, limit = 20 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const query = q.toLowerCase();
  let results = [];

  const types = type === 'all' ? ['movies', 'tvshows', 'music', 'books', 'games', 'podcasts'] : [type];
  
  types.forEach(searchType => {
    let items = [];
    switch (searchType) {
      case 'movies':
        items = movies.filter(m => 
          m.title.toLowerCase().includes(query) || 
          m.description.toLowerCase().includes(query)
        ).map(m => ({ ...m, type: 'movie' }));
        break;
      case 'tvshows':
        items = tvShows.filter(s => 
          s.title.toLowerCase().includes(query) || 
          s.description.toLowerCase().includes(query)
        ).map(s => ({ ...s, type: 'tvshow' }));
        break;
      case 'music':
        items = music.filter(m => 
          m.title.toLowerCase().includes(query) || 
          m.artist.toLowerCase().includes(query) ||
          m.album.toLowerCase().includes(query)
        ).map(m => ({ ...m, type: 'music' }));
        break;
      case 'books':
        items = books.filter(b => 
          b.title.toLowerCase().includes(query) || 
          b.author.toLowerCase().includes(query)
        ).map(b => ({ ...b, type: 'book' }));
        break;
      case 'games':
        items = games.filter(g => 
          g.title.toLowerCase().includes(query) || 
          g.description.toLowerCase().includes(query)
        ).map(g => ({ ...g, type: 'game' }));
        break;
      case 'podcasts':
        items = podcasts.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        ).map(p => ({ ...p, type: 'podcast' }));
        break;
    }
    results.push(...items);
  });

  results.sort((a, b) => b.popularity - a.popularity);

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

// 19. Get Trending Content
router.get('/trending', (req, res) => {
  const { type = 'all', period = 'week' } = req.query;
  
  const trending = {
    period,
    movies: getTrendingMovies(period),
    tvShows: getTrendingTVShows(period),
    music: getTrendingMusic(period),
    books: getTrendingBooks(period),
    games: getTrendingGames(period)
  };

  if (type !== 'all') {
    res.json({ [type]: trending[type] });
  } else {
    res.json(trending);
  }
});

// 20. Get Entertainment Stats
router.get('/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const { period = '30d' } = req.query;
  
  const userReviews = reviews.filter(r => r.userId === userId);
  const userWatchlist = watchlist.filter(w => w.userId === userId);
  const userPlaylists = playlists.filter(p => p.userId === userId);

  const stats = {
    userId,
    period,
    reviews: {
      total: userReviews.length,
      averageRating: userReviews.length > 0 
        ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length 
        : 0,
      byType: {
        movies: userReviews.filter(r => r.type === 'movie').length,
        tvShows: userReviews.filter(r => r.type === 'tvshow').length,
        music: userReviews.filter(r => r.type === 'music').length,
        books: userReviews.filter(r => r.type === 'book').length,
        games: userReviews.filter(r => r.type === 'game').length
      }
    },
    watchlist: {
      total: userWatchlist.length,
      byStatus: {
        planned: userWatchlist.filter(w => w.status === 'planned').length,
        watching: userWatchlist.filter(w => w.status === 'watching').length,
        completed: userWatchlist.filter(w => w.status === 'completed').length
      },
      byPriority: {
        high: userWatchlist.filter(w => w.priority === 'high').length,
        medium: userWatchlist.filter(w => w.priority === 'medium').length,
        low: userWatchlist.filter(w => w.priority === 'low').length
      }
    },
    playlists: {
      total: userPlaylists.length,
      totalTracks: userPlaylists.reduce((sum, p) => sum + p.trackCount, 0),
      public: userPlaylists.filter(p => p.isPublic).length,
      private: userPlaylists.filter(p => !p.isPublic).length
    }
  };

  res.json(stats);
});

// Helper functions for recommendations and trending
function getMovieRecommendations(userId, limit) {
  return movies.slice(0, limit).map(m => ({ ...m, type: 'movie', reason: 'Based on your viewing history' }));
}

function getMusicRecommendations(userId, limit) {
  return music.slice(0, limit).map(m => ({ ...m, type: 'music', reason: 'Similar to your favorite artists' }));
}

function getBookRecommendations(userId, limit) {
  return books.slice(0, limit).map(b => ({ ...b, type: 'book', reason: 'Based on your reading preferences' }));
}

function getGameRecommendations(userId, limit) {
  return games.slice(0, limit).map(g => ({ ...g, type: 'game', reason: 'Games you might enjoy' }));
}

function getTrendingMovies(period) {
  return movies.slice(0, 10).map(m => ({ ...m, trend: 'up', change: '+15%' }));
}

function getTrendingTVShows(period) {
  return tvShows.slice(0, 10).map(s => ({ ...s, trend: 'up', change: '+12%' }));
}

function getTrendingMusic(period) {
  return music.slice(0, 10).map(m => ({ ...m, trend: 'up', change: '+8%' }));
}

function getTrendingBooks(period) {
  return books.slice(0, 10).map(b => ({ ...b, trend: 'up', change: '+5%' }));
}

function getTrendingGames(period) {
  return games.slice(0, 10).map(g => ({ ...g, trend: 'up', change: '+10%' }));
}

module.exports = router;