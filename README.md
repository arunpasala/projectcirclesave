💰 CircleSave — Secure Digital Savings Circles (ROSCA)

CircleSave is a full-stack web application that enables users to create and participate in digital savings circles (ROSCA) with a strong focus on security, trust, and fairness.
The system supports authenticated users, OTP-based verification, secure contributions, and controlled payouts, designed as a graduate-level capstone project.

🎯 Project Goals

Build a production-style full-stack system

Digitize savings circles with transparency and trust

Apply security-first design principles

Demonstrate graduate-level system design, threat modeling, and validation

🧱 System Architecture
Next.js (Frontend)
        ↓
Next.js API Routes (Backend)
        ↓
PostgreSQL (Docker)

Key Characteristics

API-driven architecture

JWT-based authentication

OTP verification for trust

Database-enforced integrity

Role-aware access control

🛠 Tech Stack
Frontend

Next.js (App Router)

TypeScript

CSS (custom styling)

Backend

Next.js API Routes

JWT Authentication

bcrypt for password hashing

OTP generation & verification

Database

PostgreSQL 16

Running via Docker

SQL-enforced constraints

🔐 Security Features

Password hashing using bcrypt

JWT-based session authentication

OTP verification for account activation

Authorization middleware for protected routes

Database-level integrity constraints

Explicit trust boundaries between client, API, and database

✨ Core Features
✅ Authentication

User signup with email & password

OTP verification via email

Secure login with JWT

Logout support

🔁 Savings Circles

Create a savings circle

Join an existing circle

View circles a user belongs to

Owner-based permissions

📊 Dashboard

User dashboard

Auth-protected routes

Token-based session handling

🗂 Project Structure
app/
 ├── api/
 │   ├── auth/
 │   │   ├── login/
 │   │   ├── signup/
 │   │   └── otp/
 │   ├── circles/
 │   │   ├── create/
 │   │   ├── join/
 │   │   └── my/
 │   └── db-check/
 ├── login/
 ├── signup/
 ├── dashboard/
 └── globals.css

lib/
 └── auth.ts

🚀 Getting Started
1️⃣ Clone the repository
git clone https://github.com/arunpasala/projectcirclesave.git
cd projectcirclesave

2️⃣ Install dependencies
npm install

3️⃣ Start PostgreSQL (Docker)
docker run --name circlesave_db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=circlesave \
  -p 5432:5432 \
  -d postgres:16

4️⃣ Create database tables

Connect to Postgres:

docker exec -it circlesave_db psql -U postgres -d circlesave


Create tables:

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_codes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

5️⃣ Start the app
npm run dev


Open:

http://localhost:3000

🧪 API Testing (Example)
Invoke-RestMethod `
  -Uri http://localhost:3000/api/auth/login `
  -Method POST `
  -Headers @{ "Content-Type"="application/json" } `
  -Body '{"email":"test@gmail.com","password":"Pass@1234"}'

📚 Academic Context

Course: Graduate Capstone / Software Engineering

Focus Areas:

Secure system design

Threat modeling (STRIDE)

Trust and fairness analysis

Concurrency & transaction safety

Designed to support formal evaluation and reporting

🔮 Planned Enhancements

Contribution scheduling & enforcement

Payout sequencing algorithms

Fairness analysis comparison

Admin analytics dashboard

Rate-limiting & abuse prevention

Deployment (Vercel + managed DB)

👤 Author

Bala Arun Pasala
Master’s in Computer Science
Aspiring Full-Stack & Security-Focused Software Engineer
