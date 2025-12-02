const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock databases
const products = [];
const categories = [];
const orders = [];
const carts = [];
const reviews = [];
const wishlist = [];
const coupons = [];

// 1. Create Product
router.post('/products', [
  body('name').isLength({ min: 3 }),
  body('description').isLength({ min: 10 }),
  body('price').isFloat({ min: 0 }),
  body('category').exists(),
  body('stock').isInt({ min: 0 }),
  body('images').isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const product = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    rating: 0,
    numReviews: 0
  };

  products.push(product);
  res.status(201).json({ message: 'Product created successfully', product });
});

// 2. Get All Products
router.get('/products', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category;
  const minPrice = parseFloat(req.query.minPrice) || 0;
  const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
  const sort = req.query.sort || 'createdAt';

  let filteredProducts = products.filter(p => 
    p.price >= minPrice && p.price <= maxPrice &&
    (!category || p.category === category)
  );

  filteredProducts.sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    if (sort === 'rating') return b.rating - a.rating;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredProducts.slice(startIndex, endIndex);

  res.json({
    products: result,
    pagination: {
      page,
      limit,
      total: filteredProducts.length,
      pages: Math.ceil(filteredProducts.length / limit)
    }
  });
});

// 3. Get Product by ID
router.get('/products/:productId', (req, res) => {
  const { productId } = req.params;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const productReviews = reviews.filter(r => r.productId === productId);
  res.json({ 
    product, 
    reviews: productReviews,
    averageRating: productReviews.length > 0 
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
      : 0
  });
});

// 4. Update Product
router.put('/products/:productId', [
  body('name').optional().isLength({ min: 3 }),
  body('description').optional().isLength({ min: 10 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId } = req.params;
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products[productIndex] = { ...products[productIndex], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ message: 'Product updated successfully', product: products[productIndex] });
});

// 5. Delete Product
router.delete('/products/:productId', (req, res) => {
  const { productId } = req.params;
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products.splice(productIndex, 1);
  res.json({ message: 'Product deleted successfully' });
});

// 6. Create Category
router.post('/categories', [
  body('name').isLength({ min: 2 }),
  body('description').optional().isLength({ min: 5 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const category = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  categories.push(category);
  res.status(201).json({ message: 'Category created successfully', category });
});

// 7. Get All Categories
router.get('/categories', (req, res) => {
  const categoriesWithCount = categories.map(cat => ({
    ...cat,
    productCount: products.filter(p => p.category === cat.name).length
  }));

  res.json({ categories: categoriesWithCount });
});

// 8. Add to Cart
router.post('/cart', [
  body('userId').exists(),
  body('productId').exists(),
  body('quantity').isInt({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, productId, quantity } = req.body;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  let cart = carts.find(c => c.userId === userId);
  if (!cart) {
    cart = { id: uuidv4(), userId, items: [], createdAt: new Date().toISOString() };
    carts.push(cart);
  }

  const existingItem = cart.items.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity, price: product.price });
  }

  res.json({ message: 'Product added to cart', cart });
});

// 9. Get Cart
router.get('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const cart = carts.find(c => c.userId === userId);
  
  if (!cart) {
    return res.json({ cart: { items: [], total: 0 } });
  }

  const cartItems = cart.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      ...item,
      product: product || null,
      subtotal: item.price * item.quantity
    };
  });

  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  res.json({ cart: { ...cart, items: cartItems, total } });
});

// 10. Create Order
router.post('/orders', [
  body('userId').exists(),
  body('items').isArray(),
  body('shippingAddress').exists(),
  body('paymentMethod').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, items, shippingAddress, paymentMethod } = req.body;
  
  let total = 0;
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productId} not found` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
    }
    total += product.price * item.quantity;
  }

  const order = {
    id: uuidv4(),
    userId,
    items,
    total,
    shippingAddress,
    paymentMethod,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  // Update stock
  items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    product.stock -= item.quantity;
  });

  res.status(201).json({ message: 'Order created successfully', order });
});

// 11. Get User Orders
router.get('/orders/:userId', (req, res) => {
  const { userId } = req.params;
  const userOrders = orders.filter(o => o.userId === userId);
  
  res.json({ orders: userOrders });
});

// 12. Get Order by ID
router.get('/order/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.id === orderId);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json({ order });
});

// 13. Update Order Status
router.patch('/order/:orderId/status', [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { orderId } = req.params;
  const { status } = req.body;
  const orderIndex = orders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders[orderIndex].status = status;
  orders[orderIndex].updatedAt = new Date().toISOString();

  res.json({ message: 'Order status updated successfully', order: orders[orderIndex] });
});

// 14. Add Review
router.post('/reviews', [
  body('userId').exists(),
  body('productId').exists(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').isLength({ min: 5 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const review = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  reviews.push(review);

  // Update product rating
  const product = products.find(p => p.id === review.productId);
  if (product) {
    const productReviews = reviews.filter(r => r.productId === review.productId);
    product.rating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    product.numReviews = productReviews.length;
  }

  res.status(201).json({ message: 'Review added successfully', review });
});

// 15. Get Product Reviews
router.get('/reviews/:productId', (req, res) => {
  const { productId } = req.params;
  const productReviews = reviews.filter(r => r.productId === productId);
  
  res.json({ reviews: productReviews });
});

module.exports = router;