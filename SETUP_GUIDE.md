# Faculty Work Load Management (WLM) - Setup Guide

## ✨ Project Overview

WLM is a comprehensive faculty workload management system designed for academic institutions. It provides tools to manage faculty workloads, courses, allocations, and submissions across multiple academic years and sections.

### Key Features
- 👤 Multi-role authentication (Admin, Faculty)
- 📚 Course management with credits and hours
- 👥 Faculty management and workload assignment
- 📊 Course allocation and distribution
- 📝 Submission tracking and audit logs
- 🔐 Security-first design with JWT, rate limiting, and CORS protection
- 📈 Workload analytics and statistics

---

## 🚀 Quick Start

### Option 1: Local Development (Recommended)

#### Prerequisites
- Node.js 18+ and npm 9+
- MongoDB (local or Atlas cloud instance)

#### Setup Steps

1. **Configure Environment**
   ```bash
   # Create .env file with your settings
   cp .env .env.local
   # Edit .env and set:
   # - MONGO_URI: Your MongoDB connection string
   # - JWT_SECRET: Strong secret key (minimum 64 characters)
   # - CLIENT_ORIGIN: Your frontend URL
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Initialize Database**
   ```bash
   # Create indexes
   npm run --prefix server create-indexes
   
   # Optional: Seed with sample data
   npm run --prefix server seed
   ```

4. **Start Development Servers**
   
   **Windows:**
   ```bash
   .\start.bat
   ```
   
   **Mac/Linux:**
   ```bash
   bash start.sh
   ```
   
   Or manually:
   ```bash
   # Terminal 1: Start API Server
   npm run dev:server
   
   # Terminal 2: Start React Client
   npm run dev:client
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/api/health

---

### Option 2: Docker Compose (For Production-like Environment)

#### Prerequisites
- Docker Desktop or Docker Engine
- Docker Compose 2.0+

#### Setup Steps

1. **Configure Environment**
   ```bash
   # Create .env file
   cp .env .env.local
   # Edit .env - MongoDB URI will be auto-configured
   ```

2. **Start with Docker**
   ```bash
   # Production (without UI):
   docker-compose up -d
   
   # Development (with MongoDB UI):
   docker-compose --profile debug up -d
   ```

3. **Access Services**
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/api/health
   - MongoDB Express (debug only): http://localhost:8081
   - Login: admin / admin123

4. **View Logs**
   ```bash
   docker-compose logs -f wlm-server
   ```

5. **Stop Services**
   ```bash
   docker-compose down -v
   ```

---

## 📋 Project Structure

```
WLM/
├── server/                 # Express API Server
│   ├── src/
│   │   ├── index.js       # Main server file
│   │   ├── db.js          # MongoDB connection
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API endpoints
│   │   ├── utils/         # JWT, logging, audit, etc.
│   │   └── scripts/       # Database setup scripts
│   └── package.json
│
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.js         # Root component
│   │   ├── LoginPage.jsx  # Authentication
│   │   ├── Dashboard.jsx  # Main dashboard
│   │   ├── pages/         # Feature pages
│   │   ├── utils/         # API calls, auth
│   │   └── config.js      # App configuration
│   ├── public/
│   └── package.json
│
├── .env                    # Environment variables
├── docker-compose.yml      # Docker services definition
├── Dockerfile             # API server Docker image
├── start.bat              # Windows startup script
├── start.sh               # Unix startup script
└── README.md              # This file
```

---

## 🔑 Test Credentials

After seeding the database, use these credentials:

### Admin Account
- **Employee ID:** ADMIN001
- **Password:** admin123
- **Access:** Full admin dashboard

### Faculty Accounts
- **Employee ID:** FAC001, FAC002, FAC003, FAC004
- **Password:** faculty123
- **Access:** Limited faculty dashboard

---

## 📡 API Endpoints

### Authentication
```
POST /api/auth/login               # Login with employeeId & password
POST /api/auth/forgot-password     # Request password reset
POST /api/auth/reset-password      # Reset password with token
PUT  /api/auth/change-password     # Change password (requires auth)
GET  /api/auth/me                  # Get current user info
```

### Faculty Management
```
GET    /api/faculty                # List all faculty
GET    /api/faculty/:empId         # Get faculty details
POST   /api/faculty                # Create faculty (admin only)
PUT    /api/faculty/:empId         # Update faculty (admin only)
DELETE /api/faculty/:empId         # Delete faculty (admin only)
```

### Courses
```
GET    /api/courses                # List courses
GET    /api/courses/:id            # Get course details
POST   /api/courses                # Create course (admin only)
PUT    /api/courses/:id            # Update course (admin only)
DELETE /api/courses/:id            # Delete course (admin only)
```

### Workloads
```
GET    /api/workloads              # List workloads
GET    /api/workloads/:id          # Get workload details
POST   /api/workloads              # Assign workload (admin only)
PUT    /api/workloads/:id          # Update workload (admin only)
DELETE /api/workloads/:id          # Delete workload (admin only)
```

### Course Allocations
```
GET    /api/allocations            # List allocations
POST   /api/allocations            # Create allocation (admin only)
PUT    /api/allocations/:id        # Update allocation (admin only)
DELETE /api/allocations/:id        # Delete allocation (admin only)
```

### Submissions
```
GET    /api/submissions            # List submissions
POST   /api/submissions            # Create submission (faculty)
GET    /api/submissions/export/csv # Export as CSV (admin only)
```

### Settings
```
GET    /api/settings/:key          # Get setting value
PUT    /api/settings/:key          # Update setting (admin only)
```

### Statistics
```
GET    /api/stats/dashboard        # Dashboard statistics
GET    /api/stats/workload         # Workload statistics
```

### Audit & Health
```
GET    /api/audit-logs             # List audit logs (admin only)
GET    /api/health                 # Health check
```

---

## 🔐 Security Features

✅ **JWT Authentication** - Secure token-based auth with configurable expiry
✅ **Role-Based Access Control** - Admin and Faculty roles with permission checks
✅ **Rate Limiting** - Protect against brute force attacks
✅ **Password Security** - Bcrypt hashing with salt
✅ **CORS Protection** - Whitelist allowed origins
✅ **Input Validation** - Express-validator for all inputs
✅ **Audit Logging** - Track all sensitive actions
✅ **Account Lockout** - Lock account after failed attempts
✅ **Security Headers** - HSTS, CSP, X-Frame-Options, etc.

---

## 🛠️ Configuration

### Environment Variables (in `.env`)

```env
# Server
NODE_ENV=development              # development or production
PORT=5000                         # API server port

# Database
MONGO_URI=mongodb://...           # MongoDB connection string

# Authentication
JWT_SECRET=<64+ chars>            # MUST be 64+ characters!
JWT_EXPIRES_IN=8h                 # Token expiry time

# Login Security
MAX_FAILED_LOGIN_ATTEMPTS=5       # Max failed login attempts
ACCOUNT_LOCK_MINUTES=15           # Account lock duration
AUTH_LOGIN_RATE_LIMIT=10          # Login attempts per window

# CORS
CLIENT_ORIGIN=http://...          # Allowed client origins

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email@example.com
SMTP_PASS=app-password
SMTP_FROM=noreply@example.com
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
```
Error: ENOENT: no such file or directory

Solution:
1. Ensure MongoDB is running
2. Verify MONGO_URI in .env is correct
3. Check database credentials
4. Try: mongodb://localhost:27017/wlm (local) or
        mongodb+srv://user:pass@cluster.mongodb.net/wlm (Atlas)
```

### Port Already in Use
```
Error: EADDRINUSE :::5000

Solution:
1. Change PORT in .env
2. Or kill process: lsof -ti:5000 | xargs kill -9 (Mac/Linux)
                   netstat -ano | findstr :5000 (Windows)
```

### JWT Secret Too Short
```
Error: JWT_SECRET must be at least 64 characters

Solution:
1. Generate: openssl rand -base64 64
2. Update .env
3. Restart server
```

### Database Indexes Failed
```
Solution:
1. Run: npm run --prefix server create-indexes
2. Check MongoDB connection
3. Verify permissions on database
```

---

## 📊 Development Workflow

### Adding a New Feature

1. **Create API Route**
   - Add route file in `server/src/routes/`
   - Register in `server/src/index.js`

2. **Add Database Model**
   - Create model in `server/src/models/`
   - Define Mongoose schema with indexes

3. **Add Validation**
   - Create validator in `server/src/middleware/validators.js`

4. **Create React Component**
   - Add component in `client/src/` (JSX/CSS pair)
   - Import in Dashboard.jsx
   - Add navigation item

5. **Test**
   - Manual API testing with curl/Postman
   - Component testing in browser dev tools

### Running Tests
```bash
# Lint TypeScript
npm run lint

# Check server diagnostics
npm run --prefix server diagnostic
```

---

## 📚 Database Schema

### Users
- empId (unique), name, email, designation
- passwordHash, role (admin/faculty)
- failedLoginAttempts, lockUntil

### Faculty
- empId, name, email, mobile
- designation, department
- timestamps

### Courses
- courseId (unique), program, courseType
- subjectCode, subjectName, shortName
- L, T, P (hours), C (credits)
- year

### Workloads
- empId, courseId, year, section
- facultyRole (Main Faculty/Supporting/TA)
- fixedL, fixedT, fixedP, C
- unique indexes for role, TA, Department Electives

### CourseAllocations
- courseId, year, section
- mainFacultyId, supportingFacultyIds
- tutorialSlots, practicalSlots

### Submissions
- empId (unique), courseList (JSON)
- timestamps

### Audit Logs
- userId, action, entity, entityId
- metadata, IP address, timestamp

---

## 🚀 Deployment

### Deploy to Render
1. Connect GitHub repository
2. Set environment variables in Render dashboard
3. Use `render.yaml` for automatic deployment configuration

### Deploy to AWS/Azure
1. Build Docker image
2. Push to ECR/Docker Hub
3. Deploy to ECS/Container Instances

### Deploy to DigitalOcean
1. Use App Platform
2. Connect GitHub
3. Configure build and runtime settings

---

## 📞 Support & Documentation

- **Issues:** Check existing issues or create new ones
- **Logs:** Check `logs/` directory for application logs
- **Database:** Use MongoDB Compass or CLI for inspection
- **API:** See endpoint documentation above

---

## 📄 License

This project is proprietary. Unauthorized copying or distribution is prohibited.

---

## ✅ Verification Checklist

Before deploying, ensure:
- [ ] `.env` file created with all required variables
- [ ] MongoDB is accessible and connected
- [ ] JWT_SECRET is at least 64 characters
- [ ] All dependencies installed (npm install:all)
- [ ] Database indexes created (npm run --prefix server create-indexes)
- [ ] Server health check passes (GET /api/health)
- [ ] Authentication works (POST /api/auth/login)
- [ ] Audit logs are being recorded

---

**Last Updated:** 2026-04-07
**Version:** 1.0.0
