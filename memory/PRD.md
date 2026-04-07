# MediLang Care - Smart Prescription & Patient Companion

## Overview
Mobile app designed for elderly users to scan prescriptions, get AI-powered explanations in multiple languages, manage daily medication routines, and alert caregivers about missed doses.

## Tech Stack
- **Frontend**: Expo/React Native with TypeScript
- **Backend**: FastAPI with MongoDB
- **AI**: OpenAI GPT-4o via Emergent Integrations (for OCR & explanations)
- **Languages**: English, Hindi, Tamil

## Design System
- Primary: #C2510A (deep orange)
- Background: #FDF6EC (warm cream)
- Surface: #FFF8F0
- Secondary: #7A5C2E (muted olive brown)
- Minimum 18sp fonts, 56dp touch targets

## Features

### Page 1: Prescription Scanner
- Camera/Gallery image input
- OCR via OpenAI Vision
- AI-powered prescription explanation
- Text-to-Speech in 3 languages
- Add to routine functionality

### Page 2: Daily Routine
- Morning/Afternoon/Night sections
- Large checkboxes for dose tracking
- Local notifications for reminders
- Weekly PDF report generation

### Page 3: User Management
- User profile with language preference
- Super user (caregiver) setup
- Compliance dashboard
- Missed dose alerts

## API Endpoints
- POST /api/scan-prescription - OCR + AI explanation
- GET/POST /api/prescriptions - CRUD prescriptions
- GET/POST /api/routines - Daily routines
- POST /api/dose-log - Mark dose taken
- GET/POST /api/users - User profiles
- GET /api/weekly-report - Generate PDF report
