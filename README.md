# 💰 CircleSave – Secure Savings Circle Platform

CircleSave is a full-stack web application that enables users to create and manage digital savings circles (ROSCA).  
The system focuses on **security, trust, and fairness**, ensuring transparent financial interactions among members.

This project is developed as part of a **Graduate Capstone (CS-685)** at Western New England University.

---

## 🚀 Features

### 👤 Authentication & Security
- User signup & login
- JWT-based authentication
- OTP email verification
- Protected API routes
- Role-based access control (RBAC)

### 👥 Circle Management
- Create savings circles
- Join requests & owner approvals
- Member role management (Owner / Member)

### 💵 Financial Workflows
- Contribution tracking
- Payment confirmation system
- Automated payout scheduling
- Cycle completion validation

### 🔔 Notifications
- Real-time notifications for:
  - Join requests
  - Approvals
  - Cycle updates

### 🔐 Security & Trust (Capstone Focus)
- Backend validation of all critical actions
- Prevention of unauthorized access
- Enforcement of contribution rules
- Audit logging for system actions
- Failure case testing (invalid actions, duplicate attempts)

---

## 🧠 Project Focus

This project emphasizes:

- Security validation (not just UI behavior)
- Trust enforcement in financial workflows
- Fairness in payout mechanisms
- Backend-driven system integrity

---

## 🏗️ Tech Stack

### Frontend
- Next.js
- React
- Tailwind CSS

### Backend
- Next.js API Routes (Node.js)
- TypeScript

### Database
- PostgreSQL
- Supabase

### Authentication & Security
- JWT (jsonwebtoken)
- bcryptjs

### Email Services
- Nodemailer (OTP verification)

---

## 📦 Installation & Setup

### 1. Prerequisites

Install:

- Node.js (v18+)
- Git
- PostgreSQL (if using local DB)

---

### 2. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
