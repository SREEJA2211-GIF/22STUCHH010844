const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const winston = require('winston');
const { nanoid } = require('nanoid');

const Url = require('./models/Url'); // Import the model

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Winston Logger Setup
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('MongoDB connected'))
.catch((err) => logger.error('MongoDB connection error:', err));

// Root Test Route
app.get('/', (req, res) => {
  res.json({ message: "✅ Backend API is working." });
});

// POST /shorturls – Create a short URL
app.post('/shorturls', async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const code = shortcode || nanoid(6);
    const expiry = new Date(Date.now() + validity * 60 * 1000);

    const existing = await Url.findOne({ shortcode: code });
    if (existing) return res.status(409).json({ error: 'Shortcode already exists' });

    const newUrl = new Url({
      originalUrl: url,
      shortcode: code,
      expiry,
    });

    await newUrl.save();
    logger.info(`Shortened URL created: ${code}`);

    res.json({
      shortLink: `http://localhost:5000/${code}`,
      expiry: expiry.toISOString(),
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:shortcode – Redirect to the original URL
app.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const urlDoc = await Url.findOne({ shortcode });

    if (!urlDoc || urlDoc.expiry < new Date()) {
      return res.status(404).json({ error: 'Link expired or not found' });
    }

    urlDoc.clicks += 1;
    urlDoc.analytics.push({
      timestamp: new Date(),
      referrer: req.get('Referrer') || '',
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
    });

    await urlDoc.save();

    res.redirect(urlDoc.originalUrl);
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /shorturls/:shortcode – Get analytics
app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const urlDoc = await Url.findOne({ shortcode });

    if (!urlDoc) {
      return res.status(404).json({ error: 'Shortcode not found' });
    }

    res.json({
      originalUrl: urlDoc.originalUrl,
      clicks: urlDoc.clicks,
      analytics: urlDoc.analytics,
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

