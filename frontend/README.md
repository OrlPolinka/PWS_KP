# Dance Studio Frontend

React + TypeScript frontend for Dance Studio web application.

## Features

- **Authentication**: Login, Register, Google OAuth
- **Dashboard**: Role-based dashboard for Admin, Trainer, Client
- **Schedule**: View class schedule with trainer links
- **Trainers**: View trainer profiles with specialization
- **Dance Styles**: Browse dance styles with trainer links
- **Memberships**: View and purchase memberships
- **Bookings**: Book and cancel classes
- **Chat**: Real-time messaging between users
- **News**: View studio news
- **Notifications**: User notifications
- **QR Code**: Display and download personal QR code

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- TailwindCSS
- Axios
- Lucide React (icons)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

For Google sign-in and registration, configure the OAuth web client in Google Cloud Console. Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the same `GOOGLE_CALLBACK_URL` in `backend/.env`. During development, add your Google account as a test user in the OAuth consent configuration. See the backend README for the full setup steps.

## Running

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm run preview
```

## Design

- **Background**: Dark theme (#0f0f1a)
- **Surface**: #1a1a2e
- **Primary accent**: Violet (#8b5cf6)
- **Modern UI**: Clean, minimal design with smooth transitions
