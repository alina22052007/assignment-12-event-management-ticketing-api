# 🎟️ Event Management & High-Concurrency Ticketing REST API

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-lightgrey.svg)](https://expressjs.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore%20Admin-orange.svg)](https://firebase.google.com/)
[![OpenAPI 3.0](https://img.shields.io/badge/Swagger-OpenAPI%203.0-brightgreen.svg)](https://swagger.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A high-concurrency Event Management & Live Booking REST API built with **Node.js**, **Express.js**, and **Google Firebase Firestore**. Secured with **JWT Role-Based Access Control (Organizer vs Attendee)**, hardened with **Anti-Scalper Rate Limiting** against bot spikes, and fully documented with **OpenAPI 3.0 via Swagger UI**.

---

## 🌟 Key Features

1. **⚡ Firestore ACID Transactions (`runTransaction`)**: Guaranteed atomic ticket decrement and inventory management during flash sales. Available tickets can **never drop below zero** under concurrent traffic.
2. **🔐 Role-Based Access Control (RBAC)**:
   - **`organizer`**: Create, edit, delete event listings and audit attendee rosters with revenue breakdowns.
   - **`attendee`**: Browse upcoming events, purchase tickets, view personal bookings, and cancel tickets with automatic inventory restoration.
3. **🛡️ Anti-Scalper Rate Limiting**: `express-rate-limit` enforces a strict **10 requests / minute** threshold on booking endpoints to mitigate bot abuse and ticket scalping.
4. **📖 Interactive Swagger Documentation**: OpenAPI 3.0 compliant interactive specification at `/api-docs` customized with a modern dark theme and parameter schemas.
5. **☁️ Zero-Config Render.com Deployment**: Multi-source Firebase credentials loader supporting raw JSON, Base64 strings, or local keys.

---

## 🏗️ Project Architecture

```text
Kartik_Wagh/
├── config/
│   ├── firebaseConfig.js    # Firebase Admin SDK initialization (Env & Local fallback)
│   └── swagger.js           # Swagger JSDoc & OpenAPI 3.0 custom UI styling
├── controllers/
│   ├── authController.js    # Register, login, and user profile management
│   ├── eventController.js   # Event CRUD, filters, and attendee rosters
│   └── ticketController.js  # Atomic transaction booking & cancellation
├── middleware/
│   ├── auth.js              # JWT Bearer token authentication
│   ├── checkRole.js         # RBAC guard (organizer vs attendee)
│   └── rateLimiter.js       # Strict booking rate limit & general DDoS limiter
├── routes/
│   ├── authRoutes.js        # /api/auth endpoints
│   ├── eventRoutes.js       # /api/events endpoints
│   └── ticketRoutes.js      # /api/tickets endpoints
├── docs/
│   └── README.md            # Submission screenshots directory
├── test_concurrency.js      # Automated concurrency & rate-limiting test runner
├── .env.example             # Environment variable template
├── .gitignore               # Git security ignores (node_modules, .env, serviceAccountKey.json)
├── package.json             # Scripts & dependencies
├── server.js                # Express app entry point
└── README.md                # Project documentation
```

---

## 🗄️ Firestore Data Schema

### 1. `events` Collection
```json
{
  "id": "event_techconf_2026",
  "title": "Global Cloud & AI Summit 2026",
  "description": "Annual flagship backend conference featuring distributed systems and cloud architecture.",
  "category": "Technology",
  "eventDate": "2026-06-15T09:00:00.000Z",
  "venue": "Bandra Kurla Complex, Mumbai",
  "organizerId": "usr_organizer_01",
  "organizerName": "TechEvents Global",
  "ticketPrice": 1499,
  "totalCapacity": 500,
  "availableTickets": 482,
  "createdAt": "2026-03-01T12:00:00.000Z"
}
```

### 2. `tickets` Collection
```json
{
  "id": "ticket_rec_88219",
  "eventId": "event_techconf_2026",
  "eventTitle": "Global Cloud & AI Summit 2026",
  "userId": "usr_attendee_99",
  "attendeeName": "Kunal Sharma",
  "attendeeEmail": "kunal@gmail.com",
  "quantity": 2,
  "totalPaid": 2998,
  "bookingRef": "TKT-2026-88219",
  "status": "confirmed",
  "bookedAt": "2026-03-02T16:20:00.000Z"
}
```

### 3. `users` Collection
```json
{
  "id": "usr_organizer_01",
  "name": "Kunal Sharma",
  "email": "kunal@gmail.com",
  "password": "$2a$10$hashedPasswordHere...",
  "role": "organizer",
  "createdAt": "2026-03-01T10:00:00.000Z"
}
```

---

## 📋 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | Public | Register as `attendee` or `organizer` |
| `POST` | `/api/auth/login` | Public | Authenticate credentials and receive JWT |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated user profile & role |

### 🎪 Event Management (`/api/events`)

| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/events` | Public | Browse upcoming events (`?category=Technology&city=Mumbai&search=AI`) |
| `GET` | `/api/events/:id` | Public | Get single event details & live ticket availability |
| `POST` | `/api/events` | **Organizer** | Create new event listing |
| `PUT` | `/api/events/:id` | **Organizer** | Update event details (Creator only) |
| `DELETE` | `/api/events/:id` | **Organizer** | Delete event listing (Creator only) |
| `GET` | `/api/events/:id/attendees` | **Organizer** | List all registered attendees, ticket count & revenue |

### 🎟️ Ticket Booking & Scalper Protection (`/api/tickets`)

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|:---:|:---:|---|
| `POST` | `/api/tickets/book` | **Attendee** | **10 req/min** | **Atomic Booking**: Transactional inventory decrement |
| `GET` | `/api/tickets/my-tickets` | **Attendee** | Standard | Retrieve tickets purchased by logged-in attendee |
| `POST` | `/api/tickets/:id/cancel` | **Attendee** | Standard | Cancel booking & atomically restore event inventory |

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- [Firebase Console](https://console.firebase.google.com/) Account

### 2. Clone and Install Dependencies
```bash
cd Desktop/assignment-12-event-management-ticketing-api/Kartik_Wagh
npm install
```

### 3. Setup Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In the left menu, navigate to **Firestore Database** -> **Create Database** (start in Test mode).
3. Go to **Project Settings** (gear icon) -> **Service Accounts** tab.
4. Click **Generate New Private Key** to download your `serviceAccountKey.json`.
5. Place the downloaded file into the `Kartik_Wagh/` directory (it is already included in `.gitignore`).

### 4. Configure Environment Variables
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Edit your `.env` file:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRES_IN=7d
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

### 5. Start the Server
```bash
# Start in development mode (with nodemon)
npm run dev

# Or start in production mode
npm start
```

Open your browser at:
- **Interactive Swagger UI:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## ⚡ Concurrency & Rate Limiting Verification

This project includes a test script `test_concurrency.js` to simulate high concurrency flash sales:

```bash
node test_concurrency.js
```

### What this script verifies:
1. Registers an organizer and creates an event with `totalCapacity: 5`.
2. Registers an attendee.
3. Fires **8 simultaneous concurrent booking requests** (`Promise.all`).
4. **ACID Transaction Guarantee**: Exactly 5 bookings succeed (`201 Created`), while 3 bookings fail cleanly (`400 Insufficient tickets available`). The final event `availableTickets` remains exactly `0` and never drops below zero.
5. **Anti-Scalper Rate Limiter**: Rapidly fires 12 booking calls and confirms that excess requests are throttled with `429 Too Many Requests`.

---

## ☁️ Deploying to Render.com

### Step 1: Push Repository to GitHub
```bash
git init
git add .
git commit -m "feat: complete event ticketing API with Firestore transactions and Swagger UI"
git branch -M main
git remote add origin https://github.com/<your-username>/itm-assignment-12-event-ticketing-api.git
git push -u origin main
```

### Step 2: Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) -> Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Fill in the build settings:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### Step 3: Add Environment Variables in Render
In Render Settings -> **Environment Variables**:
| Key | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Single-line JSON string of your `serviceAccountKey.json` or base64-encoded string |
| `JWT_SECRET` | A secure 32+ character random string |
| `NODE_ENV` | `production` |

> 💡 **Tip for Firebase JSON**: If pasting raw JSON causes parsing issues in Render's UI, base64-encode your key locally with `base64 -i serviceAccountKey.json` and paste the resulting string into `FIREBASE_SERVICE_ACCOUNT_JSON`. `config/firebaseConfig.js` automatically decodes it.

---
DEPLOYMENT LINK : 
https://assignment-12-event-management-ticketing-7w58.onrender.com/

## 👨‍💻 Author

**Kartik Wagh**  
*Backend Development — Event Management & Ticketing API*
