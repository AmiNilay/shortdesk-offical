// --- Load environment variables safely
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const { customAlphabet } = require('nanoid');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');

const app = express();

// --- App settings
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.set('trust proxy', true);

// --- Create nanoid generator
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-', 8);

// --- Environment Variables
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || null;

console.log('🧠 Loaded MONGO_URI =', MONGO_URI ? '✅ Found' : '❌ Undefined');

if (!MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI is not defined in .env');
  process.exit(1);
}

// --- MongoDB Connection
mongoose.connect(MONGO_URI, { dbName: 'shortener' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// --- Schema & Model
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true, trim: true },
  shortId: { type: String, required: true, unique: true, index: true },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Url = mongoose.model('Url', urlSchema);

// --- Helper Functions
function isValidHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getBaseUrl(req) {
  if (BASE_URL) return BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

const CUSTOM_ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// --- Routes

// Home page
app.get('/', (req, res) => {
  res.render('index', { error: null });
});

// Create short link
app.post('/shorten', async (req, res) => {
  try {
    const { originalUrl, customAlias } = req.body;

    if (!originalUrl || !isValidHttpUrl(originalUrl)) {
      return res.status(400).render('index', { error: 'Please enter a valid URL starting with http:// or https://' });
    }

    let shortId;
    if (customAlias && customAlias.trim()) {
      if (!CUSTOM_ALIAS_REGEX.test(customAlias)) {
        return res.status(400).render('index', { error: 'Custom alias must be 3–30 characters: letters, numbers, _ or - only.' });
      }

      const exists = await Url.findOne({ shortId: customAlias.trim() }).lean();
      if (exists) {
        return res.status(409).render('index', { error: 'That custom alias is already taken. Try another.' });
      }
      shortId = customAlias.trim();
    } else {
      shortId = nanoid();
      let tries = 0;
      while (await Url.findOne({ shortId }).lean()) {
        shortId = nanoid();
        if (++tries > 3) break;
      }
    }

    const doc = await Url.create({ originalUrl, shortId });

    const shortUrl = `${getBaseUrl(req)}/${doc.shortId}`;
    const qrDataUrl = await QRCode.toDataURL(shortUrl);

    res.render('result', {
      shortUrl,
      originalUrl: doc.originalUrl,
      qrDataUrl,
      clicks: doc.clicks,
      createdAt: doc.createdAt,
      shortId: doc.shortId
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('index', { error: 'Something went wrong while creating your short link. Please try again.' });
  }
});

// --- Redirect + Count Clicks
app.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    const doc = await Url.findOneAndUpdate(
      { shortId },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!doc) return res.status(404).send('Link not found');
    return res.redirect(doc.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- Start Server
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${process.env.BASE_URL || `http://${HOST}:${PORT}`}`);
});

