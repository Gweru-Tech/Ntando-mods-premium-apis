const express = require('express');
const router = express.Router();
const natural = require('natural');
const { authenticateApiKey } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticateApiKey);
router.use(dynamicRateLimiter);

const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

router.post('/analyze', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text parameter is required'
      });
    }
    
    // Tokenize
    const tokens = tokenizer.tokenize(text.toLowerCase());
    
    // Word count
    const wordCount = tokens.length;
    const charCount = text.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    
    // Sentiment analysis
    const sentiment = analyzer.getSentiment(tokens);
    
    // Word frequency
    const wordFreq = {};
    tokens.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    
    res.json({
      success: true,
      data: {
        statistics: {
          characters: charCount,
          words: wordCount,
          sentences: sentenceCount,
          averageWordLength: (charCount / wordCount).toFixed(2)
        },
        sentiment: {
          score: sentiment,
          label: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral'
        },
        topWords: topWords
      },
      tier: req.apiTier
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

router.post('/summarize', (req, res) => {
  try {
    const { text, sentences = 3 } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text parameter is required'
      });
    }
    
    const allSentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const numSentences = Math.min(parseInt(sentences), allSentences.length);
    
    // Simple extractive summarization (take first N sentences)
    const summary = allSentences.slice(0, numSentences).join('. ') + '.';
    
    res.json({
      success: true,
      data: {
        original: {
          length: text.length,
          sentences: allSentences.length
        },
        summary: {
          text: summary,
          length: summary.length,
          sentences: numSentences
        }
      },
      tier: req.apiTier
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;
