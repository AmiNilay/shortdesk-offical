// ============================================================
//  ShortDesk — server.js
//  Smart, Trackable URL Shortener
// ============================================================

// --- Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// --- DNS resolver setup (ensures reliable SRV lookups on Windows & local networks)
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');
const favicon = require('serve-favicon');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();

// --- Express App Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// --- Security Headers
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.set('trust proxy', true);

// --- Environment Variables
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || null;
const REDIS_URL = process.env.REDIS_URL || null;
const GOOGLE_SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY || null;

// --- GeoIP (optional, silently skip if missing)
let geoip = null;
try {
  geoip = require('geoip-lite');
} catch (e) {
  // not installed — country detection will return 'Unknown'
}

// --- Country Flag Emoji Helper
function countryFlag(code) {
  if (!code || code === 'Unknown' || code === 'Local') return '\u{1F30D}';
  try {
    var a = code.toUpperCase().charCodeAt(0) - 65 + 0x1F1E6;
    var b = code.toUpperCase().charCodeAt(1) - 65 + 0x1F1E6;
    return String.fromCodePoint(a) + String.fromCodePoint(b);
  } catch (e) {
    return '\u{1F30D}';
  }
}

app.locals.countryFlag = countryFlag;

// --- MongoDB Config Check
if (!MONGO_URI) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('ERROR: MONGO_URI is not defined.');
    process.exit(1);
  }
  // In test mode without MONGO_URI, we run without a database
}

// --- MongoDB Connection
let dbReady = false;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { dbName: 'shortener' })
    .then(function () {
      dbReady = true;
      console.log('MongoDB connected');
    })
    .catch(function (err) {
      console.error('MongoDB connection error:', err.message);
      if (process.env.NODE_ENV !== 'test') process.exit(1);
    });

  mongoose.connection.on('connected', function () { dbReady = true; });
  mongoose.connection.on('disconnected', function () { dbReady = false; });
  mongoose.connection.on('reconnected', function () { dbReady = true; });
}

// --- Optional Redis
let redis = null;
if (REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redis = new Redis(REDIS_URL);
    redis.on('connect', function () { console.log('Redis connected'); });
    redis.on('error', function (err) { console.error('Redis error:', err.message); });
  } catch (e) {
    // ioredis not installed
  }
}

// ============================================================
//  SCHEMAS & MODELS
// ============================================================

const urlSchema = new mongoose.Schema({
  originalUrl:       { type: String, required: true, trim: true },
  shortId:           { type: String, required: true, unique: true, index: true },
  shortCode:         { type: Number, required: true },
  totalClicks:       { type: Number, default: 0 },
  maxClicks:         { type: Number, default: null },
  passwordHash:      { type: String, default: null },
  expiresAt:         { type: Date, default: null },
  createdAt:         { type: Date, default: Date.now },
  createdByIp:       { type: String, default: null },
  webhookUrl:        { type: String, default: null },
  clickThreshold:    { type: Number, default: 0 },
  thresholdNotified: { type: Boolean, default: false },
  maxClicksNotified: { type: Boolean, default: false },
  expiryNotified:    { type: Boolean, default: false }
});
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Url = mongoose.model('Url', urlSchema);

const clickEventSchema = new mongoose.Schema({
  urlId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Url', index: true },
  shortId:  { type: String, required: true, index: true },
  timestamp:{ type: Date, default: Date.now },
  ipHash:   { type: String, default: null },
  referrer: { type: String, default: 'Direct' },
  device:   { type: String, default: 'desktop' },
  browser:  { type: String, default: 'Unknown' },
  os:       { type: String, default: 'Unknown' },
  country:  { type: String, default: 'Unknown' }
});
clickEventSchema.index({ shortId: 1, timestamp: -1 });
const ClickEvent = mongoose.model('ClickEvent', clickEventSchema);

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

// ============================================================
//  UTILITIES
// ============================================================

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function base62Encode(num) {
  if (num === 0) return '000';
  var str = '';
  while (num > 0) {
    str = BASE62[num % 62] + str;
    num = Math.floor(num / 62);
  }
  while (str.length < 3) str = BASE62[0] + str;
  return str;
}

async function generateShortCode() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'urlCounter' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return { code: base62Encode(counter.seq), num: counter.seq };
}

function isValidHttpUrl(str) {
  try {
    var u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function getBaseUrl(req) {
  if (BASE_URL) return BASE_URL;
  var proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return proto + '://' + req.get('host');
}

function parseUserAgent(uaString) {
  var parser = new UAParser(uaString);
  var device = parser.getDevice();
  var browser = parser.getBrowser();
  var os = parser.getOS();
  return {
    device: device.type || 'desktop',
    browser: browser.name || 'Unknown',
    os: os.name || 'Unknown'
  };
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 16);
}

function lookupCountry(req) {
  var vercelCountry = req.headers['x-vercel-ip-country'];
  if (vercelCountry) return vercelCountry;
  var ip = req.ip;
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return 'Local';
  if (!geoip) return 'Unknown';
  try {
    var geo = geoip.lookup(ip);
    return geo ? geo.country : 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}

async function checkSafeBrowsing(url) {
  if (!GOOGLE_SAFE_BROWSING_KEY) return { safe: true };
  try {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 3000);
    var response = await fetch(
      'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + GOOGLE_SAFE_BROWSING_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'shortdesk', clientVersion: '3.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: url }]
          }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeout);
    var data = await response.json();
    if (data.matches && data.matches.length > 0) {
      return { safe: false, threat: data.matches[0].threatType };
    }
    return { safe: true };
  } catch (err) {
    return { safe: true };
  }
}

async function fireWebhook(doc, event) {
  if (!doc.webhookUrl) return;
  try {
    var payload = {
      event: event,
      shortId: doc.shortId,
      shortUrl: (BASE_URL || 'http://localhost:3000') + '/' + doc.shortId,
      originalUrl: doc.originalUrl,
      totalClicks: doc.totalClicks,
      timestamp: new Date().toISOString()
    };
    if (event === 'click_threshold_reached') payload.threshold = doc.clickThreshold;
    if (event === 'max_clicks_reached') payload.maxClicks = doc.maxClicks;
    if (event === 'link_expired') payload.expiredAt = doc.expiresAt;
    await fetch(doc.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // silently fail
  }
}

// --- Click Queue (batch writes with bounded memory protection)
var clickQueue = [];
var MAX_CLICK_QUEUE_SIZE = 5000;

function queueClick(data) {
  if (clickQueue.length >= MAX_CLICK_QUEUE_SIZE) {
    clickQueue.shift(); // Evict oldest event to guard against OOM during prolonged outages
  }
  clickQueue.push(data);
  if (clickQueue.length >= 50) flushClickQueue();
}

async function flushClickQueue() {
  if (clickQueue.length === 0) return;
  var batch = clickQueue.splice(0, clickQueue.length);
  try {
    await ClickEvent.insertMany(batch, { ordered: false });
  } catch (err) {
    // silently fail
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(flushClickQueue, 5000);
}

// --- Expiry
var EXPIRY_OPTIONS = {
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'never': null
};

function getExpiryDate(option) {
  var ms = EXPIRY_OPTIONS[option];
  if (!ms) return null;
  return new Date(Date.now() + ms);
}

var CUSTOM_ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

const RESERVED_ALIASES = new Set([
  'app', 'dashboard', 'docs', 'privacy', 'terms', 'api', 'shorten',
  'sw.js', 'robots.txt', 'health', 'favicon.ico', 'site.webmanifest',
  'service-worker.js', 'assets', 'css', 'js'
]);

/**
 * Reusable core service to validate and create a shortened URL record
 */
async function createShortLinkRecord(params) {
  var url = params.url;
  var customAlias = params.customAlias;
  var password = params.password;
  var expiry = params.expiry;
  var maxClicks = params.maxClicks;
  var webhookUrl = params.webhookUrl;
  var clickThreshold = params.clickThreshold;
  var ip = params.ip;

  if (!url || !isValidHttpUrl(url)) {
    return { error: 'Please enter a valid URL starting with http:// or https://', statusCode: 400 };
  }

  if (customAlias && customAlias.trim()) {
    var alias = customAlias.trim();
    if (!CUSTOM_ALIAS_REGEX.test(alias)) {
      return { error: 'Custom alias must be 3-30 characters: letters, numbers, _ or - only.', statusCode: 400 };
    }
    if (RESERVED_ALIASES.has(alias.toLowerCase())) {
      return { error: 'That custom alias is reserved for system routes.', statusCode: 400 };
    }
    var exists = await Url.findOne({ shortId: alias }).lean();
    if (exists) {
      return { error: 'That custom alias is already taken.', statusCode: 409 };
    }
  }

  if (webhookUrl && webhookUrl.trim() && !isValidHttpUrl(webhookUrl.trim())) {
    return { error: 'Webhook URL must be a valid http:// or https:// URL.', statusCode: 400 };
  }

  if (maxClicks !== undefined && maxClicks !== null && String(maxClicks).trim() !== '') {
    var parsedMaxClicks = parseInt(maxClicks, 10);
    if (isNaN(parsedMaxClicks) || parsedMaxClicks < 1) {
      return { error: 'Click limit must be a positive integer (minimum 1).', statusCode: 400 };
    }
  }

  // Check DB readiness after basic validation
  if (!dbReady) {
    return { error: 'Database unavailable. Please try again later.', statusCode: 500 };
  }

  var safety = await checkSafeBrowsing(url);
  if (!safety.safe) {
    return { error: 'This URL has been flagged as potentially malicious (' + safety.threat + '). Cannot shorten.', statusCode: 400 };
  }

  var shortId;
  if (customAlias && customAlias.trim()) {
    shortId = customAlias.trim();
  } else {
    var codeResult = await generateShortCode();
    shortId = codeResult.code;
  }

  var docData = {
    originalUrl: url.trim(),
    shortId: shortId,
    shortCode: 0,
    createdByIp: hashIp(ip)
  };

  if (password && password.trim().length > 0) {
    docData.passwordHash = await bcrypt.hash(password.trim(), 10);
  }
  if (expiry && expiry !== 'never') {
    docData.expiresAt = getExpiryDate(expiry);
  }
  if (maxClicks !== undefined && maxClicks !== null && String(maxClicks).trim() !== '') {
    docData.maxClicks = parseInt(maxClicks, 10);
  }
  if (webhookUrl && webhookUrl.trim()) {
    docData.webhookUrl = webhookUrl.trim();
  }
  if (clickThreshold && parseInt(clickThreshold, 10) > 0) {
    docData.clickThreshold = parseInt(clickThreshold, 10);
  }

  var doc = await Url.create(docData);

  if (redis) {
    await redis.setex('url:' + doc.shortId, 3600, JSON.stringify({
      originalUrl: doc.originalUrl,
      passwordHash: doc.passwordHash || null,
      expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null
    })).catch(function () {});
  }

  return { doc: doc };
}

// ============================================================
//  RATE LIMITERS
// ============================================================

var shortenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests. Try again in a minute.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

var redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

var apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

// ============================================================
//  ROUTES
//  ORDER: specific paths first, /:shortId catch-all near the end
// ============================================================

// ---- SYSTEM / PWA ROUTES (Prevent falling into /:shortId catch-all) ----
app.get('/sw.js', function (req, res) { res.status(404).end(); });
app.get('/service-worker.js', function (req, res) { res.status(404).end(); });
// ---- 1. HOME PAGE ----
app.get('/', function (req, res) {
  res.render('index', { error: null, success: null });
});

// ---- 1.1 PLATFORM APP STUDIO ----
app.get('/app', function (req, res) {
  res.render('app', { error: null, success: null });
});

// ---- 1.2 HEALTH CHECK ENDPOINT ----
app.get('/health', function (req, res) {
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'healthy' : 'degraded',
    database: dbReady ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ---- 2. STATIC PAGES (MUST be before /:shortId catch-all) ----
app.get('/privacy', function (req, res) {
  res.render('privacy');
});

app.get('/terms', function (req, res) {
  res.render('terms');
});

app.get('/docs', function (req, res) {
  res.render('docs');
});

// ---- 3. CREATE SHORT LINK (FORM POST) ----
app.post('/shorten', shortenLimiter, async function (req, res) {
  try {
    var result = await createShortLinkRecord({
      url: req.body.originalUrl,
      customAlias: req.body.customAlias,
      password: req.body.password,
      expiry: req.body.expiry,
      maxClicks: req.body.maxClicks,
      webhookUrl: req.body.webhookUrl,
      clickThreshold: req.body.clickThreshold,
      ip: req.ip
    });

    if (result.error) {
      return res.status(result.statusCode || 400).render('app', {
        error: result.error,
        success: null
      });
    }

    var doc = result.doc;
    var shortUrl = getBaseUrl(req) + '/' + doc.shortId;
    var qrDataUrl = await QRCode.toDataURL(shortUrl);

    res.render('result', {
      link: {
        shortId: doc.shortId,
        originalUrl: doc.originalUrl,
        shortUrl: shortUrl,
        totalClicks: 0,
        maxClicks: doc.maxClicks || null,
        createdAt: doc.createdAt,
        hasPassword: !!doc.passwordHash,
        expiresAt: doc.expiresAt,
        webhookUrl: doc.webhookUrl,
        clickThreshold: doc.clickThreshold
      },
      shortUrl: shortUrl,
      originalUrl: doc.originalUrl,
      qrUrl: qrDataUrl,
      qrDataUrl: qrDataUrl,
      clicks: 0,
      maxClicks: doc.maxClicks || null,
      createdAt: doc.createdAt,
      shortId: doc.shortId,
      hasPassword: !!doc.passwordHash,
      expiresAt: doc.expiresAt,
      webhookUrl: doc.webhookUrl,
      clickThreshold: doc.clickThreshold
    });
  } catch (err) {
    console.error('Shorten error:', err);
    res.status(500).render('app', {
      error: 'Something went wrong. Please try again.',
      success: null
    });
  }
});

// ---- 4. BULK SHORTEN (FORM POST) ----
app.post('/shorten/bulk', shortenLimiter, async function (req, res) {
  try {
    var urls = req.body.urls;

    if (!urls || !urls.trim()) {
      return res.status(400).render('app', {
        error: 'Please enter at least one URL.',
        success: null
      });
    }

    if (!dbReady) {
      return res.status(500).render('app', {
        error: 'Database unavailable. Please try again later.',
        success: null
      });
    }

    var urlList = urls.split('\n')
      .map(function (u) { return u.trim(); })
      .filter(function (u) { return u.length > 0; })
      .slice(0, 50);

    var results = [];
    var errors = [];

    for (var i = 0; i < urlList.length; i++) {
      var url = urlList[i];
      var itemResult = await createShortLinkRecord({
        url: url,
        customAlias: null,
        password: null,
        expiry: 'never',
        webhookUrl: null,
        clickThreshold: 0,
        ip: req.ip
      });

      if (itemResult.error) {
        errors.push(url + ': ' + itemResult.error);
        continue;
      }

      var doc = itemResult.doc;
      results.push({
        originalUrl: url,
        shortUrl: getBaseUrl(req) + '/' + doc.shortId,
        shortId: doc.shortId
      });
    }

    res.render('dashboard', {
      links: [],
      errors: errors,
      totalLinks: results.length,
      recentLinks: [],
      searchId: null,
      bulkResults: results,
      success: null
    });
  } catch (err) {
    console.error('Bulk shorten error:', err);
    res.status(500).render('app', {
      error: 'Bulk shortening failed.',
      success: null
    });
  }
});

// ---- 5. DASHBOARD ----
app.get('/dashboard', async function (req, res) {
  var searchId = req.query.search || null;
  var searchResults = [];
  var errors = [];
  var recentLinks = [];

  if (dbReady) {
    // Search
    if (searchId) {
      try {
        var doc = await Url.findOne({ shortId: searchId }).lean();
        if (doc) {
          searchResults.push({
            originalUrl: doc.originalUrl,
            shortUrl: getBaseUrl(req) + '/' + doc.shortId,
            shortId: doc.shortId,
            totalClicks: doc.totalClicks,
            maxClicks: doc.maxClicks || null,
            createdAt: doc.createdAt,
            hasPassword: !!doc.passwordHash,
            expiresAt: doc.expiresAt,
            webhookUrl: doc.webhookUrl,
            clickThreshold: doc.clickThreshold,
            thresholdNotified: doc.thresholdNotified
          });
        } else {
          errors.push('No link found with ID: ' + searchId);
        }
      } catch (searchErr) {
        errors.push('Search unavailable.');
      }
    }

    // Recent links
    try {
      var recentDocs = await Url.find().sort({ createdAt: -1 }).limit(50).lean();
      recentLinks = recentDocs.map(function (d) {
        return {
          originalUrl: d.originalUrl,
          shortUrl: getBaseUrl(req) + '/' + d.shortId,
          shortId: d.shortId,
          totalClicks: d.totalClicks,
          maxClicks: d.maxClicks || null,
          createdAt: d.createdAt,
          hasPassword: !!d.passwordHash,
          expiresAt: d.expiresAt,
          webhookUrl: d.webhookUrl,
          clickThreshold: d.clickThreshold,
          thresholdNotified: d.thresholdNotified
        };
      });
    } catch (dbErr) {
      // recentLinks stays empty
    }
  }

  res.render('dashboard', {
    links: searchResults,
    errors: errors,
    totalLinks: recentLinks.length,
    recentLinks: recentLinks,
    searchId: searchId,
    bulkResults: null,
    success: null
  });
});

// ---- 6. ANALYTICS PAGE ----
app.get('/analytics/:shortId', async function (req, res) {
  if (!dbReady) {
    return res.status(503).send('Database unavailable');
  }

  try {
    var shortId = req.params.shortId;
    var from = req.query.from || '';
    var to = req.query.to || '';
    var limitQuery = req.query.limit;
    var doc = await Url.findOne({ shortId: shortId }).lean();
    if (!doc) return res.status(404).send('Link not found');

    var baseUrl = getBaseUrl(req);
    var dateFilter = { shortId: shortId };
    if (from || to) {
      dateFilter.timestamp = {};
      if (from) {
        var startDate = new Date(from);
        if (!isNaN(startDate.getTime())) {
          dateFilter.timestamp.$gte = startDate;
        }
      }
      if (to) {
        var endDate = new Date(to);
        if (!isNaN(endDate.getTime())) {
          endDate.setHours(23, 59, 59, 999);
          dateFilter.timestamp.$lte = endDate;
        }
      }
    }

    var rowLimit = Math.min(parseInt(limitQuery) || 50, 500);
    var clicks = await ClickEvent.find(dateFilter)
      .sort({ timestamp: -1 }).limit(rowLimit).lean();

    var deviceBreakdown = {};
    var browserBreakdown = {};
    var osBreakdown = {};
    var referrerBreakdown = {};
    var countryBreakdown = {};
    var clicksByDate = {};

    clicks.forEach(function (c) {
      deviceBreakdown[c.device] = (deviceBreakdown[c.device] || 0) + 1;
      browserBreakdown[c.browser] = (browserBreakdown[c.browser] || 0) + 1;
      osBreakdown[c.os] = (osBreakdown[c.os] || 0) + 1;
      var ref = c.referrer || 'Direct';
      var refDisplay = ref;
      if (ref !== 'Direct') {
        try { refDisplay = new URL(ref).hostname; } catch (e) { refDisplay = ref.slice(0, 40); }
      }
      referrerBreakdown[refDisplay] = (referrerBreakdown[refDisplay] || 0) + 1;
      var country = c.country || 'Unknown';
      countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
      var date = new Date(c.timestamp).toISOString().split('T')[0];
      clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });

    var clickDateValues = Object.values(clicksByDate);
    var maxVal = clickDateValues.length > 0 ? Math.max.apply(null, clickDateValues) : 1;

    res.render('analytics', {
      link: {
        shortId: doc.shortId,
        originalUrl: doc.originalUrl,
        shortUrl: baseUrl + '/' + doc.shortId,
        totalClicks: doc.totalClicks,
        maxClicks: doc.maxClicks || null,
        createdAt: doc.createdAt,
        hasPassword: !!doc.passwordHash,
        expiresAt: doc.expiresAt,
        webhookUrl: doc.webhookUrl || null,
        clickThreshold: doc.clickThreshold || 0,
        thresholdNotified: doc.thresholdNotified || false
      },
      clicks: clicks,
      deviceBreakdown: deviceBreakdown,
      browserBreakdown: browserBreakdown,
      osBreakdown: osBreakdown,
      referrerBreakdown: referrerBreakdown,
      countryBreakdown: countryBreakdown,
      clicksByDate: clicksByDate,
      maxClicksByDate: maxVal,
      filterFrom: from,
      filterTo: to,
      rowLimit: rowLimit
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ---- 7. QR CODE API (MUST be before /:shortId catch-all) ----
app.get('/api/qr/:shortId', async function (req, res) {
  if (!dbReady) {
    return res.status(503).send('Database unavailable');
  }

  try {
    var shortId = req.params.shortId;
    var size = Math.min(parseInt(req.query.size) || 200, 500);
    var doc = await Url.findOne({ shortId: shortId }).lean();
    if (!doc) return res.status(404).send('Link not found');
    var shortUrl = getBaseUrl(req) + '/' + doc.shortId;
    var buffer = await QRCode.toBuffer(shortUrl, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.set('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(buffer);
  } catch (err) {
    console.error('QR error:', err.message);
    res.status(500).send('QR generation failed');
  }
});

// ---- 8. PASSWORD VERIFY PAGE ----
app.get('/:shortId/verify', async function (req, res) {
  if (!dbReady) {
    return res.status(503).send('Database unavailable');
  }

  try {
    var shortId = req.params.shortId;
    var doc = await Url.findOne({ shortId: shortId }).lean();
    if (!doc) return res.status(404).send('Link not found');
    if (!doc.passwordHash) return res.redirect('/' + shortId);

    var authCookie = req.cookies && req.cookies['auth_' + shortId];
    if (authCookie === 'verified') return res.redirect(doc.originalUrl);

    res.render('password', { shortId: shortId, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ---- 9. PASSWORD VERIFY POST ----
app.post('/:shortId/verify', async function (req, res) {
  if (!dbReady) {
    return res.status(503).send('Database unavailable');
  }

  try {
    var shortId = req.params.shortId;
    var password = req.body.password;
    var doc = await Url.findOne({ shortId: shortId }).lean();
    if (!doc) return res.status(404).send('Link not found');

    var match = await bcrypt.compare(password || '', doc.passwordHash || '');
    if (!match) {
      return res.status(401).render('password', {
        shortId: shortId,
        error: 'Incorrect password. Try again.'
      });
    }

    res.cookie('auth_' + shortId, 'verified', {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax'
    });

    return res.redirect(doc.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ============================================================
//  CATCH-ALL REDIRECT — MUST BE AFTER ALL OTHER GET ROUTES
// ============================================================
app.get('/:shortId', redirectLimiter, async function (req, res) {
  if (!dbReady) {
    return res.status(404).render('expired', { message: 'Link not found.' });
  }

  try {
    var shortId = req.params.shortId;
    var doc = null;

    // Check Redis cache
    if (redis) {
      var cached = await redis.get('url:' + shortId);
      if (cached) doc = JSON.parse(cached);
    }

    // Check MongoDB
    if (!doc) {
      doc = await Url.findOne({ shortId: shortId }).lean();
      if (!doc) {
        return res.status(404).render('expired', { message: 'Link not found.' });
      }
      if (redis) {
        await redis.setex('url:' + shortId, 3600, JSON.stringify({
          originalUrl: doc.originalUrl,
          passwordHash: doc.passwordHash || null,
          expiresAt: doc.expiresAt ? doc.expiresAt : null
        }));
      }
    }

    // Check expiry
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
      if (doc.webhookUrl && !doc.expiryNotified) {
        fireWebhook(doc, 'link_expired');
        Url.updateOne({ shortId: shortId }, { expiryNotified: true }).catch(function () {});
      }
      return res.status(410).render('expired', { message: 'This link has expired.' });
    }

    // Check click limit expiration
    if (doc.maxClicks && doc.totalClicks >= doc.maxClicks) {
      if (doc.webhookUrl && !doc.maxClicksNotified) {
        fireWebhook(doc, 'max_clicks_reached');
        Url.updateOne({ shortId: shortId }, { maxClicksNotified: true }).catch(function () {});
      }
      return res.status(410).render('expired', {
        message: 'This link has reached its maximum click limit of ' + doc.maxClicks + ' clicks.',
        limitReached: true,
        maxClicks: doc.maxClicks
      });
    }

    // Check password
    if (doc.passwordHash) {
      var authCookie = req.cookies && req.cookies['auth_' + shortId];
      if (authCookie !== 'verified') {
        return res.redirect('/' + shortId + '/verify');
      }
    }

    // Redirect
    res.redirect(302, doc.originalUrl);

    // Background: increment clicks
    Url.findOneAndUpdate(
      { shortId: shortId },
      { $inc: { totalClicks: 1 } },
      { new: true }
    ).lean().then(function (updated) {
      if (!updated) return;
      if (updated.webhookUrl && updated.clickThreshold > 0 &&
          !updated.thresholdNotified && updated.totalClicks >= updated.clickThreshold) {
        fireWebhook(updated, 'click_threshold_reached');
        Url.updateOne({ shortId: shortId }, { thresholdNotified: true }).catch(function () {});
      }
      if (updated.webhookUrl && updated.maxClicks &&
          !updated.maxClicksNotified && updated.totalClicks >= updated.maxClicks) {
        fireWebhook(updated, 'max_clicks_reached');
        Url.updateOne({ shortId: shortId }, { maxClicksNotified: true }).catch(function () {});
      }
      if (redis && updated.maxClicks && updated.totalClicks >= updated.maxClicks) {
        redis.del('url:' + shortId).catch(function () {});
      }
    }).catch(function () {});

    // Background: log click event
    var ua = parseUserAgent(req.headers['user-agent']);
    var country = lookupCountry(req);
    queueClick({
      urlId: doc._id || null,
      shortId: shortId,
      timestamp: new Date(),
      ipHash: hashIp(req.ip),
      referrer: req.headers.referer || req.headers.referrer || 'Direct',
      device: ua.device,
      browser: ua.browser,
      os: ua.os,
      country: country
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send('Server error');
  }
});

// ============================================================
//  API ROUTES (JSON)
// ============================================================

// ---- API: Create Short Link ----
app.post('/api/shorten', apiLimiter, async function (req, res) {
  try {
    var result = await createShortLinkRecord({
      url: req.body.url,
      customAlias: req.body.customAlias,
      password: req.body.password,
      expiry: req.body.expiry,
      maxClicks: req.body.maxClicks,
      webhookUrl: req.body.webhookUrl,
      clickThreshold: req.body.clickThreshold,
      ip: req.ip
    });

    if (result.error) {
      return res.status(result.statusCode || 400).json({ error: result.error });
    }

    var doc = result.doc;
    res.json({
      shortUrl: getBaseUrl(req) + '/' + doc.shortId,
      shortId: doc.shortId,
      originalUrl: doc.originalUrl,
      hasPassword: !!doc.passwordHash,
      expiresAt: doc.expiresAt,
      maxClicks: doc.maxClicks || null,
      webhookUrl: doc.webhookUrl || null,
      clickThreshold: doc.clickThreshold
    });
  } catch (err) {
    console.error('API Shorten error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- API: Bulk Shorten ----
app.post('/api/shorten/bulk', apiLimiter, async function (req, res) {
  if (!dbReady) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    var urls = req.body.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Provide an array of URLs.' });
    }
    if (urls.length > 50) {
      return res.status(400).json({ error: 'Max 50 URLs per batch.' });
    }

    var results = [];
    var errors = [];
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i];
      var itemResult = await createShortLinkRecord({
        url: url,
        customAlias: null,
        password: null,
        expiry: 'never',
        webhookUrl: null,
        clickThreshold: 0,
        ip: req.ip
      });

      if (itemResult.error) {
        errors.push({ url: url, error: itemResult.error });
        continue;
      }

      var doc = itemResult.doc;
      results.push({
        originalUrl: url,
        shortUrl: getBaseUrl(req) + '/' + doc.shortId,
        shortId: doc.shortId
      });
    }

    res.json({ results: results, errors: errors, total: results.length });
  } catch (err) {
    console.error('API Bulk Shorten error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- API: Analytics ----
app.get('/api/analytics/:shortId', apiLimiter, async function (req, res) {
  if (!dbReady) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    var shortId = req.params.shortId;
    var doc = await Url.findOne({ shortId: shortId }).lean();
    if (!doc) return res.status(404).json({ error: 'Link not found' });

    var clicks = await ClickEvent.find({ shortId: shortId })
      .sort({ timestamp: -1 }).limit(500).lean();

    res.json({
      shortId: doc.shortId,
      originalUrl: doc.originalUrl,
      totalClicks: doc.totalClicks,
      maxClicks: doc.maxClicks || null,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      webhookUrl: doc.webhookUrl || null,
      clickThreshold: doc.clickThreshold,
      events: clicks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
//  404 CATCH-ALL (must be last)
// ============================================================
app.use(function (req, res) {
  res.status(404).send('Page not found');
});

// ============================================================
//  EXPORT & START
// ============================================================

module.exports = app;

if (require.main === module) {
  var HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, function () {
    console.log('Server running on ' + (BASE_URL || ('http://' + HOST + ':' + PORT)));
  });

  process.on('SIGTERM', async function () {
    await flushClickQueue();
    if (redis) redis.disconnect();
    process.exit(0);
  });
}