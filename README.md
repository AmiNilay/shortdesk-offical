Here is the complete updated `README.md`:

---

```markdown
# ShortDesk — Smart, Trackable URL Shortener

> A sleek, open-source URL shortener with password protection, analytics, QR codes, webhooks, and dark/light mode. Built with Node.js, Express, MongoDB Atlas, and EJS. Deployed on Vercel.

---

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express.js-5.2-black?style=for-the-badge&logo=express&logoColor=white" alt="Express.js"></a>
  <a href="https://www.mongodb.com/atlas"><img src="https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas"></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"></a>
  <a href="https://github.com/AmiNilay/shortdesk-official"><img src="https://img.shields.io/badge/Open_Source-ff3366?style=for-the-badge&logo=github&logoColor=white" alt="Open Source"></a>
</p>

---

## Live Demo

**Visit Now:** [https://shortdesk-official.vercel.app](https://shortdesk-official.vercel.app)

---

## About

**ShortDesk** is a modern, lightweight URL shortener that transforms long URLs into clean, memorable, and shareable short links. It goes beyond basic shortening with password-protected links, click analytics, bulk shortening, webhook notifications, malicious URL detection, and a polished dark/light theme — all without requiring user accounts.

Built for developers, teams, and anyone who needs more than just a redirect.

---

## Features

| Feature | Description |
|---|---|
| **Custom Alias** | Create personalized short slugs (e.g., `/myproject`). 3-30 characters, alphanumeric with `-` and `_`. |
| **Password Protection** | Lock links behind a password. Passwords are bcrypt-hashed, never stored in plain text. |
| **Link Expiration** | Set links to expire after 1 hour, 1 day, 7 days, 30 days, or never. Expired links show a clean 410 page. |
| **Click Analytics** | Track device, browser, OS, country, referrer, and click timeline for every shortened link. |
| **Bulk Shortening** | Paste multiple URLs (one per line) and shorten them all at once. Up to 50 per batch. |
| **QR Code Generator** | Every link gets a unique QR code, downloadable as PNG. |
| **Webhook Notifications** | Get notified when a link hits a click threshold or expires. Send events to any webhook URL. |
| **Malicious URL Detection** | All submitted URLs are checked against Google Safe Browsing API before shortening. |
| **Dark / Light Theme** | Full theme toggle with persistent preference saved in localStorage. Logo switches with theme. |
| **Dashboard** | Search, browse, and manage all shortened links with real-time click counts. |
| **Rate Limiting** | Built-in rate limiting on all endpoints to prevent abuse. |
| **Responsive Design** | Fully responsive UI with glassmorphic design, noise overlays, and staggered reveal animations. |
| **REST API** | JSON API for programmatic link creation, bulk shortening, and analytics retrieval. |

---

## Tech Stack

**Frontend:**
- HTML5 + EJS (Embedded JavaScript Templates)
- CSS3 with custom properties, glassmorphism, dark/light themes
- Google Fonts (Syne + DM Mono)

**Backend:**
- Node.js 18+ with Express 5
- Mongoose (MongoDB ODM)
- bcryptjs (password hashing)
- QRCode (server-side QR generation)
- express-rate-limit
- UA Parser JS (user-agent parsing)
- geoip-lite (country detection)

**Infrastructure:**
- MongoDB Atlas (cloud database)
- Vercel (serverless deployment)
- Google Safe Browsing API (optional)
- Redis (optional, for caching)
- GitHub (source code + CI/CD)

---

## Project Structure

```
shortdesk-official/
├── assets/
│   ├── dm.png              # Dark mode logo
│   └── lm.png              # Light mode logo
├── public/
│   ├── assets/
│   │   ├── dm.png          # Served dark mode logo
│   │   └── lm.png          # Served light mode logo
│   ├── css/
│   │   └── style.css       # Full stylesheet
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   └── site.webmanifest
├── views/
│   ├── index.ejs           # Home page (shorten form)
│   ├── result.ejs          # Link created result page
│   ├── dashboard.ejs       # Link management dashboard
│   ├── analytics.ejs       # Per-link analytics
│   ├── password.ejs        # Password verification page
│   ├── expired.ejs         # Expired / not found page
│   ├── privacy.ejs         # Privacy policy
│   ├── terms.ejs           # Terms of service
│   └── docs.ejs            # API documentation
├── server.js               # Main application entry point
├── package.json
├── .env                    # Environment variables (not committed)
├── .gitignore
└── README.md
```

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AmiNilay/shortdesk-official.git
cd shortdesk-official
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/shortener?retryWrites=true&w=majority
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
GOOGLE_SAFE_BROWSING_KEY=your_google_safe_browsing_api_key
REDIS_URL=redis://localhost:6379
```

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `PORT` | No | Server port (default: `3000`) |
| `BASE_URL` | No | Base URL for short links (auto-detected if not set) |
| `NODE_ENV` | No | Set to `production` for live deployment |
| `GOOGLE_SAFE_BROWSING_KEY` | No | Google Safe Browsing API key for malicious URL detection |
| `REDIS_URL` | No | Redis connection string for caching (optional) |

### 4. Start the Server

```bash
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add -A
git commit -m "Deploy ShortDesk"
git push origin main
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `AmiNilay/shortdesk-official` repository
3. Add environment variables in the Vercel dashboard:
   - `MONGO_URI` = your MongoDB Atlas connection string
   - `BASE_URL` = `https://shortdesk-official.vercel.app`
   - `GOOGLE_SAFE_BROWSING_KEY` = (optional)
   - `REDIS_URL` = (optional)
4. Click **Deploy**

Vercel auto-detects the `server.js` entry point via `package.json`.

---

## API Reference

### Create Short Link

```
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very-long-page",
  "customAlias": "my-link",
  "password": "secret123",
  "expiry": "7d",
  "webhookUrl": "https://your-server.com/webhook",
  "clickThreshold": 100
}
```

**Response:**

```json
{
  "shortUrl": "https://shortdesk-official.vercel.app/my-link",
  "shortId": "my-link",
  "originalUrl": "https://example.com/very-long-page",
  "hasPassword": true,
  "expiresAt": "2025-08-03T12:00:00.000Z",
  "webhookUrl": "https://your-server.com/webhook",
  "clickThreshold": 100
}
```

### Bulk Shorten

```
POST /api/shorten/bulk
Content-Type: application/json

{
  "urls": [
    "https://example.com/page-1",
    "https://example.com/page-2"
  ]
}
```

### Get Analytics

```
GET /api/analytics/:shortId
```

**Response includes:** total clicks, click events (device, browser, OS, country, referrer, timestamp), link metadata.

### Get QR Code

```
GET /api/qr/:shortId?size=300
```

Returns a PNG image. Size range: 50-500px (default: 200px).

---

## Expiration Options

| Value | Duration |
|---|---|
| `1h` | 1 hour |
| `1d` | 1 day |
| `7d` | 7 days |
| `30d` | 30 days |
| `never` | No expiration (default) |

---

## Webhook Events

When configured, ShortDesk sends a POST request to your webhook URL with a JSON payload:

### `click_threshold_reached`

```json
{
  "event": "click_threshold_reached",
  "shortId": "abc123",
  "shortUrl": "https://shortdesk-official.vercel.app/abc123",
  "originalUrl": "https://example.com",
  "totalClicks": 100,
  "threshold": 100,
  "timestamp": "2025-07-27T12:00:00.000Z"
}
```

### `link_expired`

```json
{
  "event": "link_expired",
  "shortId": "abc123",
  "shortUrl": "https://shortdesk-official.vercel.app/abc123",
  "originalUrl": "https://example.com",
  "totalClicks": 42,
  "expiredAt": "2025-07-28T12:00:00.000Z",
  "timestamp": "2025-07-28T12:00:01.000Z"
}
```

---

## Security

- **Password hashing:** All link passwords are hashed with bcrypt (10 salt rounds) before storage.
- **Malicious URL detection:** URLs are checked against Google Safe Browsing API before shortening.
- **Rate limiting:** 30 requests/min for link creation, 100 requests/min for redirects, 60 requests/min for API.
- **IP hashing:** Creator IP addresses are SHA-256 hashed before storage — never stored in plain text.
- **HTTP-only cookies:** Password verification uses secure, HTTP-only cookies with 30-minute expiry.
- **No user accounts:** ShortDesk does not collect names, emails, or personal data.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](https://github.com/AmiNilay/shortdesk-official/blob/main/LICENSE) file for details.

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please open an [Issue](https://github.com/AmiNilay/shortdesk-official/issues) first for bugs or feature requests.

---

## Author

Built by **Nilay** — [github.com/AmiNilay](https://github.com/AmiNilay)

---

<p align="center">
  <strong>ShortDesk</strong> — Smart, trackable, password-protected short links.<br>
  Open source and free forever.
</p>
``