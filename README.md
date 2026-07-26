# 🌐 **ShortDesk** — Smart, Stylish URL Shortener

> ✨ A sleek, modern URL shortener that turns long, messy links into clean, beautiful, and trackable short URLs. Built with Node.js, Express, MongoDB, and EJS, and deployed on Vercel.

---

<p align="center">
  <img src="assets/shortdesk-banner.png" alt="ShortDesk Banner" width="100%" />
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express&logoColor=white" alt="Express.js"></a>
  <a href="https://www.mongodb.com/atlas"><img src="https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas"></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"></a>
  <a href="https://github.com/AmiNilay/shortdesk-official"><img src="https://img.shields.io/badge/Open%20Source-❤️-ff3366?style=for-the-badge&logo=github" alt="Open Source"></a>
</p>

---

## 🚀 **Live Demo**

🔗 **Visit Now:** [https://shortdesk-official.vercel.app](https://shortdesk-official.vercel.app)

---

## 🧠 **About**

**ShortDesk** is a modern, lightweight, and visually appealing URL shortener that transforms long URLs into short, memorable, and shareable links. It integrates **MongoDB Atlas** for secure data storage and is deployed serverlessly on **Vercel**.

ShortDesk is designed for personal use, project development, and developers seeking a balance of aesthetics and performance.

---

## ✨ **Features**

| 🧩 **Feature**        | 💡 **Description**                                                                 |
|----------------------|-----------------------------------------------------------------------------------|
| ⚙️ **Custom Alias**   | Create custom short URLs with personalized slugs (e.g., `/myproject`).             |
| 🔗 **Smart Validation** | Only accepts valid `http://` or `https://` URLs.                                  |
| 🧠 **Persistent Storage** | Stores all URLs securely in **MongoDB Atlas**.                                  |
| 🪩 **Glassmorphic UI** | Elegant, modern design with a glassmorphism effect for a sleek user experience.    |
| 📷 **QR Code Generator** | Generates a unique QR code for each shortened URL.                              |
| 🚀 **Serverless Ready** | Optimized for deployment on **Vercel**'s serverless Node runtime.                |
| 💾 **Secure ENV Handling** | Uses environment variables to manage sensitive data securely.                   |

---

## 🛠️ **Tech Stack**

**Frontend:**
- HTML5
- CSS3 (Glassmorphism design)
- EJS (Embedded JavaScript templates)

**Backend:**
- Node.js + Express
- Mongoose (MongoDB ODM)
- QRCode.js
- Nanoid (for unique short URLs)

**Deployment:**
- **MongoDB Atlas**
- **Vercel** (Serverless functions)
- **GitHub Integration**

---

## 📦 **Local Development Setup**

Follow these steps to run the project locally:

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/AmiNilay/shortdesk-official.git
cd shortdesk-official
