# AI Buddy 🤖✨

> **Your intelligent AI-powered learning companion** — personalized roadmaps, smart quizzes, interview prep, and study planning, all powered by Google Gemini.

![AI Buddy Banner](https://img.shields.io/badge/Powered%20by-Google%20Gemini-8b5cf6?style=for-the-badge&logo=google)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb)

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Roadmap Generator** | AI creates personalized 8-12 topic learning paths with curated resources |
| 🧠 **Quiz Practice** | AI-generated 5-question MCQ quizzes per topic with instant scoring |
| 💼 **Interview Prep** | Technical, behavioral & system design questions tailored to your profile |
| 📅 **Study Planner** | Day-by-day tasks and weekly milestones from your roadmap |
| 📈 **Progress Tracker** | Track topic completion with visual progress bars |
| 👤 **AI Profile Parser** | Upload resume → AI extracts your skills, projects & experience |

---

## 🏗️ Tech Stack

**Backend**
- Node.js + Express 5
- MongoDB + Mongoose
- Google Gemini AI (`@google/generative-ai`)
- JWT Authentication (access + refresh tokens)
- Multer + pdf-parse + mammoth for resume parsing

**Frontend**
- React 19 + Vite
- React Router v7
- Axios with interceptors
- CSS custom design system (glassmorphism + animations)
- React Hot Toast

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Altamash346-max/AI_BUDDY.git
cd AI_BUDDY

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=8000
MONGODB_URI=mongodb+srv://...
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGIN=http://localhost:5173
```

> 🔑 Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 3. Run the Application

**Terminal 1 — Backend:**
```bash
npm run dev
# Server starts at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

---

## 📁 Project Structure

```
AI_BUDDY/
├── src/                        # Backend
│   ├── controllers/            # Business logic
│   │   ├── user.controller.js
│   │   ├── roadmap.controller.js
│   │   ├── quiz.controller.js
│   │   ├── interviewPrep.controller.js
│   │   ├── studyPlanner.controller.js
│   │   ├── progress.controller.js
│   │   └── candidateProfile.controller.js
│   ├── routes/                 # Express routes
│   ├── models/                 # Mongoose schemas
│   ├── middlewares/            # JWT auth middleware
│   ├── utils/                  # Helpers (Gemini, multer, etc.)
│   ├── db/                     # Database connection
│   ├── app.js                  # Express app setup
│   └── index.js                # Entry point
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── pages/              # All page components
│   │   ├── components/         # Shared components (Sidebar)
│   │   ├── context/            # Auth context
│   │   ├── utils/              # API client
│   │   └── index.css           # Global design system
│   └── vite.config.js          # Vite + proxy config
├── .env.example                # Environment template
└── package.json
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/signup` | Register new user |
| POST | `/api/users/login` | Login user |
| POST | `/api/users/logout` | Logout user |
| GET | `/api/users/me` | Get current user |
| POST | `/api/roadmap/generate` | Generate AI roadmap |
| GET | `/api/roadmap/me` | Get my roadmaps |
| GET | `/api/roadmap/:id` | Get roadmap with topics |
| POST | `/api/quiz/:topicId/generate` | Generate quiz for topic |
| POST | `/api/quiz/:topicId/submit` | Submit quiz answers |
| POST | `/api/interview/generate` | Generate interview questions |
| GET | `/api/interview/me` | My interview preps |
| POST | `/api/interview/profile/upload` | Upload & parse resume |
| GET | `/api/interview/profile` | Get parsed profile |
| POST | `/api/planner/generate/:roadmapId` | Generate study plan |
| POST | `/api/progress/complete` | Mark topic complete |
| GET | `/api/progress/stats` | Get progress statistics |

---

## 🎨 Design System

The frontend uses a custom glassmorphism dark theme with:
- **Color Palette**: Purple → Indigo → Cyan gradient
- **Typography**: Inter + Outfit fonts
- **Animations**: Floating blobs, staggered reveals, AI loading orbs
- **Components**: Glass cards, animated buttons, progress bars

---

## 📄 License

ISC License — Built by Altamash