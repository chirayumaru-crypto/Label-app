# Eye-Test Data Labeling App

A full-stack concurrent data labeling application for medical AI training.

## Features
- **CSV Upload**: Import system-generated logs.
- **Concurrent Labeling**: Row-level locking ensures no two users label the same row at the same time.
- **Human-in-the-loop**: Rich annotation interface with validation.
- **Auto-Lock Management**: Locks expire after 15 minutes of inactivity.
- **Export**: Download labeled data as CSV.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Lucide icons.
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL.
- **Infrastructure**: Docker, Docker Compose.

## Getting Started

### Prerequisites
- Docker & Docker Compose

### Fast Start
1. Clone the repository
2. Run `docker-compose up -d --build`
3. The app will be available at:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:8000](http://localhost:8000)

### Seed Test Users
Once the containers are running, seed the database with test users:
```bash
docker-compose exec backend python seed.py
```

**Credentials:**
- **Admin**: `admin@example.com` / `adminpassword`
- **Labelers**: `labeler1@example.com` / `password123`, `labeler2@example.com` / `password123`

## Data Schema
The app expects CSVs with the following columns (case-insensitive):
- Session_ID, timestamp, Speaker, Utterance, R_SPH, R_CYL, R_AXIS, R_ADD, L_SPH, L_CYL, L_AXIS, L_ADD, PD, Chart_Number, Occluder_State, Chart_Display.
