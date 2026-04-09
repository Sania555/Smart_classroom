# Smart Classroom Attendance Tracking System

## Tech Stack
- **Frontend**: React.js, React Router, Axios, Socket.io-client, face-api.js
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB + Mongoose
- **Notifications**: Nodemailer (email) + Web Push
- **Scheduling**: node-cron
- **Auth**: JWT

## Project Structure
```
smart-classroom/
├── backend/
│   ├── controllers/    # Business logic
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routes
│   ├── middleware/      # Auth, upload
│   ├── services/       # Email, push, cron, notifications
│   └── server.js
└── frontend/
    └── src/
        ├── pages/      # student/ and teacher/ pages
        ├── components/ # Shared UI components
        ├── context/    # Auth + Socket context
        └── services/   # API + face-api.js
```

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env   # Fill in your values
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm start
```

### 3. Face Recognition Models
Download face-api.js models and place them in `frontend/public/models/`:
- https://github.com/justadudewhohacks/face-api.js/tree/master/weights
- Required: `tiny_face_detector`, `face_landmark_68`, `face_recognition`

### 4. MongoDB
Make sure MongoDB is running locally or set `MONGO_URI` in `.env` to your Atlas connection string.

### 5. Web Push (optional)
```bash
npx web-push generate-vapid-keys
```
Add the keys to `.env`.

## Features
- Student & Teacher registration/login (JWT)
- Face recognition attendance (face-api.js)
- OTP backup attendance method
- GPS location validation (100m radius)
- Weekly timetable with conflict detection
- Real-time notifications via Socket.io
- Email notifications via Nodemailer
- Browser push notifications
- Automated cron jobs (reminders, absent marking, daily/weekly summaries)
- Teacher dashboard with live attendance tracking
- OTP generation for manual attendance
- Bulk reminders to absent students
- Attendance reports with CSV export
- Subject-wise attendance percentage
- Absence reason submission
- Parent email alerts on absence
