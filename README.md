# 🌐 ShortDesk — Smart, Stylish URL Shortener

> ✨ Turn long messy links into clean, beautiful, and trackable short URLs — built with Node.js, Express, MongoDB, and EJS, deployed on Vercel.

---

![ShortDesk Preview](https://ibb.co/V0hX2xzL)

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express&logoColor=white" alt="Express.js"></a>
  <a href="https://www.mongodb.com/atlas"><img src="https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas"></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"></a>
  <a href="https://github.com/AmiNilay/shortdesk-offical"><img src="https://img.shields.io/badge/Open%20Source-❤️-ff3366?style=for-the-badge&logo=github" alt="Open Source"></a>
</p>

---

## 🚀 Live Demo  
🔗 **Visit Now:** [https://shortdesk-offical.vercel.app](https://shortdesk-offical.vercel.app)

---

## 🧠 About

**ShortDesk** is a modern, lightweight, and visually elegant URL shortener.  
It transforms long, messy URLs into neat, memorable, and shareable links with QR codes — all while storing data securely in **MongoDB Atlas** and deployed serverlessly on **Vercel**.

Designed for personal use, projects, and developers who want beauty *and* performance.

---

## ✨ Features

| 🧩 Feature | 💡 Description |
|------------|----------------|
| ⚙️ Custom Alias | Define your own short URL slug (e.g. `/myproject`) |
| 🔗 Smart Validation | Accepts only valid `http://` or `https://` URLs |
| 🧠 Persistent Storage | MongoDB Atlas stores all URLs |
| 🪩 Glassmorphic UI | Sleek light-mode design for modern feel |
| 📷 QR Code Generator | Instant QR for every short link |
| 🚀 Serverless Ready | Optimized for Vercel Node runtime |
| 💾 Secure ENV Handling | Uses environment variables for sensitive data |

---

## 🛠️ Tech Stack

**Frontend**
- HTML5  
- CSS3 (Glassmorphism design)  
- EJS (Embedded JavaScript templates)

**Backend**
- Node.js + Express  
- Mongoose (MongoDB ODM)  
- QRCode.js  
- Nanoid (for unique IDs)

**Deployment**
- MongoDB Atlas  
- Vercel (Serverless functions)  
- GitHub Integration  

---

## 📦 Local Development Setup

> Follow these steps to run the project locally.

```bash
# 1️⃣ Clone the repository
git clone https://github.com/AmiNilay/shortdesk-offical.git
cd shortdesk-offical

# 2️⃣ Install dependencies
npm install

# 3️⃣ Create a .env file
touch .env
Paste the following in .env:

MONGO_URI=your_mongodb_connection_string
PORT=3000
BASE_URL=http://localhost:3000


Then start your local server:

npm start


Visit 👉 http://localhost:3000

☁️ Deployment (Vercel)

You can deploy instantly with:

vercel


Or connect the GitHub repo to Vercel manually:

Go to your Vercel Dashboard

Import your repository

Add the environment variables:

Variable	Example
MONGO_URI	mongodb+srv://blog_user:pass@cluster0.mongodb.net/shortener?retryWrites=true&w=majority&appName=Cluster0
PORT	3000
BASE_URL	https://shortdesk-offical.vercel.app

Deploy 🚀

🖼️ UI Preview
🏠 Home Page

🔗 Result Page

⚙️ Project Structure
shortdesk-offical/
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── favicon.ico
│
├── views/
│   ├── index.ejs
│   └── result.ejs
│
├── .env
├── package.json
├── server.js
├── vercel.json
└── README.md

🧑‍💻 Author

👨‍💻 Nilay Naha
📍 West Bengal, India
🎓 B.Tech in Computer Science (AIML)
💡 Focused on AI, Full-Stack Development & Product Design

🌐 GitHub

💼 LinkedIn

🛡️ License

This project is licensed under the MIT License — you are free to use, modify, and distribute it.

❤️ Acknowledgements

Thanks to these amazing tools and services:

Node.js
Express
MongoDB Atlas
Vercel
Nanoid
QRCode

💫 “Built with patience, learning, and love by Nilay.”


## ✅ How to Use

1. Copy this raw markdown text.  
2. Create a file in your project root called **`README.md`**.  
3. Paste it inside.  
4. Run these in terminal:
   ```bash
   git add README.md
   git commit -m "Add professional README with badges"
   git push
