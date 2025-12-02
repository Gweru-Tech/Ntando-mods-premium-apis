const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const router = express.Router();

// Mock databases
const payments = [];
const paymentMethods = [];
const transactions = [];
const refunds = [];
const subscriptions = [];
const invoices = [];
const paymentIntents = [];

// 1. Create Payment Intent
router.post('/intents', [
  body('amount').isFloat({ min: 0.5 }),
  body('currency').isLength({ min: 3, max: 3 }),
  body('userId').exists(),
  body('description').optional().isLength({ max: 255 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, currency, userId, description } = req.body;
  
  const intent = {
    id: uuidv4(),
    amount,
    currency,
    userId,
    description: description || `Payment of ${amount} ${currency}`,
    status: 'requires_payment_method',
    clientSecret: crypto.randomBytes(32).toString('hex'),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };

  paymentIntents.push(intent);
  res.status(201).json({ message: 'Payment intent created', intent });
});

// 2. Confirm Payment
router.post('/confirm', [
  body('intentId').exists(),
  body('paymentMethodId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { intentId, paymentMethodId } = req.body;
  const intent = paymentIntents.find(i => i.id === intentId);
  
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  if (intent.status !== 'requires_payment_method') {
    return res.status(400).json({ error: 'Payment intent cannot be confirmed' });
  }

  const payment = {
    id: uuidv4(),
    intentId,
    paymentMethodId,
    amount: intent.amount,
    currency: intent.currency,
    userId: intent.userId,
    status: 'succeeded',
    createdAt: new Date().toISOString()
  };

  payments.push(payment);
  intent.status = 'succeeded';

  res.json({ message: 'Payment confirmed successfully', payment });
});

// 3. Add Payment Method
router.post('/methods', [
  body('userId').exists(),
  body('type').isIn(['card', 'bank_account', 'paypal']),
  body('details').exists(),
  body('isDefault').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, type, details, isDefault } = req.body;

  // If setting as default, unset other defaults
  if (isDefault) {
    paymentMethods.forEach(method => {
      if (method.userId === userId) {
        method.isDefault = false;
      }
    });
  }

  const paymentMethod = {
    id: uuidv4(),
    userId,
    type,
    details: {
      ...details,
      last4: type === 'card' ? details.number.slice(-4) : '****'
    },
    isDefault: isDefault || false,
    createdAt: new Date().toISOString()
  };

  paymentMethods.push(paymentMethod);
  res.status(201).json({ message: 'Payment method added', paymentMethod });
});

// 4. Get Payment Methods
router.get('/methods/:userId', (req, res) => {
  const { userId } = req.params;
  const userMethods = paymentMethods.filter(m => m.userId === userId);
  
  res.json({ paymentMethods: userMethods });
});

// 5. Delete Payment Method
router.delete('/methods/:methodId', (req, res) => {
  const { methodId } = req.params;
  const methodIndex = paymentMethods.findIndex(m => m.id === methodId);
  
  if (methodIndex === -1) {
    return res.status(404).json({ error: 'Payment method not found' });
  }

  paymentMethods.splice(methodIndex, 1);
  res.json({ message: 'Payment method deleted successfully' });
});

// 6. Process Refund
router.post('/refund', [
  body('paymentId').exists(),
  body('amount').optional().isFloat({ min: 0 }),
  body('reason').isLength({ min: 5, max: 255 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { paymentId, amount, reason } = req.body;
  const payment = payments.find(p => p.id === paymentId);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (payment.status !== 'succeeded') {
    return res.status(400).json({ error: 'Payment cannot be refunded' });
  }

  const refundAmount = amount || payment.amount;
  if (refundAmount > payment.amount) {
    return res.status(400).json({ error: 'Refund amount exceeds payment amount' });
  }

  const refund = {
    id: uuidv4(),
    paymentId,
    amount: refundAmount,
    currency: payment.currency,
    reason,
    status: 'processing',
    createdAt: new Date().toISOString()
  };

  refunds.push(refund);
  res.status(201).json({ message: 'Refund initiated', refund });
});

// 7. Get Transaction History
router.get('/transactions/:userId', (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;

  let userTransactions = payments.filter(p => p.userId === userId);
  
  if (status) {
    userTransactions = userTransactions.filter(t => t.status === status);
  }

  userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = userTransactions.slice(startIndex, endIndex);

  res.json({
    transactions: result,
    pagination: {
      page,
      limit,
      total: userTransactions.length,
      pages: Math.ceil(userTransactions.length / limit)
    }
  });
});

// 8. Create Subscription
router.post('/subscriptions', [
  body('userId').exists(),
  body('planId').exists(),
  body('amount').isFloat({ min: 0 }),
  body('currency').isLength({ min: 3, max: 3 }),
  body('interval').isIn(['day', 'week', 'month', 'year'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, planId, amount, currency, interval } = req.body;

  const subscription = {
    id: uuidv4(),
    userId,
    planId,
    amount,
    currency,
    interval,
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription created', subscription });
});

// 9. Get Subscriptions
router.get('/subscriptions/:userId', (req, res) => {
  const { userId } = req.params;
  const userSubscriptions = subscriptions.filter(s => s.userId === userId);
  
  res.json({ subscriptions: userSubscriptions });
});

// 10. Cancel Subscription
router.post('/subscriptions/:subscriptionId/cancel', (req, res) => {
  const { subscriptionId } = req.params;
  const subscriptionIndex = subscriptions.findIndex(s => s.id === subscriptionId);
  
  if (subscriptionIndex === -1) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  subscriptions[subscriptionIndex].status = 'canceled';
  subscriptions[subscriptionIndex].canceledAt = new Date().toISOString();

  res.json({ message: 'Subscription canceled', subscription: subscriptions[subscriptionIndex] });
});

// 11. Create Invoice
router.post('/invoices', [
  body('userId').exists(),
  body('items').isArray(),
  body('dueDate').isISO8601(),
  body('currency').isLength({ min: 3, max: 3 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, items, dueDate, currency } = req.body;
  
  let total = 0;
  items.forEach(item => {
    total += item.amount;
  });

  const invoice = {
    id: uuidv4(),
    userId,
    items,
    total,
    currency,
    dueDate,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  invoices.push(invoice);
  res.status(201).json({ message: 'Invoice created', invoice });
});

// 12. Get Invoices
router.get('/invoices/:userId', (req, res) => {
  const { userId } = req.params;
  const userInvoices = invoices.filter(i => i.userId === userId);
  
  res.json({ invoices: userInvoices });
});

// 13. Pay Invoice
router.post('/invoices/:invoiceId/pay', [
  body('paymentMethodId').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { invoiceId } = req.params;
  const { paymentMethodId } = req.body;
  const invoiceIndex = invoices.findIndex(i => i.id === invoiceId);
  
  if (invoiceIndex === -1) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const invoice = invoices[invoiceIndex];
  if (invoice.status !== 'pending') {
    return res.status(400).json({ error: 'Invoice cannot be paid' });
  }

  const payment = {
    id: uuidv4(),
    invoiceId,
    paymentMethodId,
    amount: invoice.total,
    currency: invoice.currency,
    userId: invoice.userId,
    status: 'succeeded',
    createdAt: new Date().toISOString()
  };

  payments.push(payment);
  invoice.status = 'paid';
  invoice.paidAt = new Date().toISOString();

  res.json({ message: 'Invoice paid successfully', payment, invoice });
});

// 14. Get Payment Stats
router.get('/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const userPayments = payments.filter(p => p.userId === userId);
  const userRefunds = refunds.filter(r => {
    const payment = payments.find(p => p.id === r.paymentId);
    return payment && payment.userId === userId;
  });

  const totalPaid = userPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = userRefunds.reduce((sum, r) => sum + r.amount, 0);
  
  const stats = {
    userId,
    totalTransactions: userPayments.length,
    totalPaid,
    totalRefunded,
    netAmount: totalPaid - totalRefunded,
    averageTransaction: userPayments.length > 0 ? totalPaid / userPayments.length : 0,
    currency: userPayments.length > 0 ? userPayments[0].currency : 'USD'
  };

  res.json(stats);
});

// 15. Webhook Handler
router.post('/webhook', [
  body('type').exists(),
  body('data').exists()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, data } = req.body;
  
  // Process webhook events
  const webhook = {
    id: uuidv4(),
    type,
    data,
    processed: true,
    receivedAt: new Date().toISOString()
  };

  // Handle different webhook types
  switch (type) {
    case 'payment.succeeded':
      // Update payment status
      break;
    case 'payment.failed':
      // Handle failed payment
      break;
    case 'subscription.created':
      // Handle new subscription
      break;
    default:
      break;
  }

  res.json({ message: 'Webhook processed successfully', webhook });
});

module.exports = router;