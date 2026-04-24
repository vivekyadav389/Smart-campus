# SmartCampuss

A full-stack, comprehensive web platform for smart college attendance tracking and geofence monitoring. Designed for students, teachers, and admins to simplify campus logistics.

## Features

- **Geofenced Attendance:** Automatic attendance detection based on campus coordinates.
- **Smart Notices:** Broadcast dynamic rich-text/PDF/image notices to target branches/batches.
- **Calendar & Leave Management:** Admins and teachers coordinate schedules perfectly.
- **Micro-animations & Modern UI:** A premium, smooth user experience on any device.
- **Device Security:** Strict "one device, one account" policy prevents proxy attendance.

## Tech Stack

- **Frontend:** React, Vite, React Router, TailwindCSS/VanillaCSS
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Mapping:** React Leaflet

## Screenshots

*(Placeholder: Add screenshots of Student Dashboard, Admin Overview, and Campus Map here)*

## Setup Instructions

### 1. Database Setup
Ensure you have MySQL installed and running. Create a database named `smart_college`.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Ensure VITE_API_BASE_URL is pointing to your backend (default is http://localhost:5000)
npm run dev
```

## Deployment Guide

We recommend a split deployment strategy for this application since it utilizes local file uploads.

### A. Deploy Backend on Render / Railway
Because the backend stores files locally (`/uploads/notices`), deploying to a persistent server or Web Service with disk support (Render/Railway) is optimal.

1. Create a Web Service on Render or Railway.
2. Link your GitHub repository.
3. Set the Root Directory to `backend` (if supported) or customize your build/start commands:
   **Build Command:** `npm install`
   **Start Command:** `npm start`
4. Supply your `.env` variables in the platform dashboard.

### B. Deploy Frontend on Vercel
1. Import the repository into Vercel.
2. Set the **Framework Preset** to `Vite`.
3. Set the **Root Directory** to `frontend`.
4. In Environment Variables, add `VITE_API_BASE_URL` and set it to your deployed Render/Railway backend URL (e.g., `https://smartcampuss-api.onrender.com`).
5. Click **Deploy**. Vercel will automatically build the React app and deploy it on a fast CDN.

---

## Environment Variables

### Backend (`/backend/.env`)
- `PORT=5000`
- `DB_HOST=localhost`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_NAME=smart_college`
- `JWT_SECRET=super_secret`
- `API_KEY=api_key`

### Frontend (`/frontend/.env`)
- `VITE_API_BASE_URL=http://localhost:5000` (or your production URL)
