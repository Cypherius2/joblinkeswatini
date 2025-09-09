# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

JobLinkEswatini is a full-stack job board application for Eswatini, built with Node.js/Express backend and vanilla JavaScript frontend. The platform serves both job seekers and companies, with features for job posting, applications, messaging, and profile management.

## Development Commands

### Backend Development
```bash
# Start the backend server (from backend directory)
cd backend
npm start

# Development with nodemon (if available)
nodemon server.js

# Install dependencies
npm install
```

### Database Setup
```bash
# Ensure MongoDB is running locally, or configure cloud MongoDB URI
# Copy environment variables
cp .env.example .env
# Edit .env with your values: MONGO_URI, JWT_SECRET, Cloudinary credentials
```

### Testing Individual Components
```bash
# Test specific route with curl
curl -X GET http://localhost:3000/api/jobs

# Test authentication endpoint
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test protected routes (replace TOKEN with actual JWT)
curl -X GET http://localhost:3000/api/users/me \
  -H "x-auth-token: TOKEN"
```

### Frontend Development
```bash
# Serve frontend (use any static server)
# For development, update js/config.js to use localhost
npx http-server . -p 8080

# Or use Python's built-in server
python -m http.server 8080
```

## Code Architecture

### Backend Structure

**Core Architecture Pattern**: RESTful API with MongoDB/Mongoose ODM
- **Entry Point**: `backend/server.js` - Express app setup, middleware, and route mounting
- **Database**: MongoDB with Mongoose ODM, connection logic in `config/db.js`
- **Authentication**: JWT-based auth with custom middleware (`middleware/authMiddleware.js`)
- **File Storage**: Cloudinary integration for images/documents

**Data Models** (`backend/models/`):
- **User**: Dual-role model (seeker/company) with embedded schemas for experience, skills, documents
- **Job**: Job postings with deadline validation and company association
- **Application**: Job applications linking users and jobs with status tracking
- **Message**: Real-time messaging between users

**API Routes** (`backend/routes/`):
- `userRoutes.js`: Registration, auth, profile management, file uploads
- `jobRoutes.js`: Job CRUD with role-based access and deadline enforcement
- `applicationRoutes.js`: Job application workflow
- `messageRoutes.js`: User messaging and chat functionality
- `skillRoutes.js`: Skills management

### Frontend Structure

**Architecture Pattern**: Modular vanilla JavaScript with API integration
- **Entry Points**: Static HTML files with corresponding JavaScript logic
- **Configuration**: `js/config.js` - API URL configuration for different environments
- **Main Logic**: `js/main.js` - Header navigation, global chat module, and authentication

**Key Frontend Modules**:
- **headerModule**: Dynamic navigation based on user authentication state
- **chatModule**: Real-time messaging with polling-based notifications
- **API Integration**: Fetch-based API calls with JWT token management

### Database Relationships
```
User (1) ----< (N) Job (company creates jobs)
User (1) ----< (N) Application (seeker applies)
Job (1) ----< (N) Application (job receives applications)
User (1) ----< (N) Message (as sender)
User (1) ----< (N) Message (as receiver)
```

### Authentication Flow
1. User registers/logs in via `/api/users/register` or `/api/users/login`
2. Server returns JWT token
3. Frontend stores token in localStorage
4. All protected requests include `x-auth-token` header
5. Backend middleware validates token and adds user context to request

### Role-Based Access Control
- **Seekers**: Can apply to jobs, manage profile, message companies
- **Companies**: Can post jobs, view applications, message job seekers
- Route-level protection ensures proper authorization

## Environment Configuration

### Required Environment Variables
```bash
MONGO_URI=mongodb://localhost:27017/joblinkeswatini
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Deployment Configuration
- **Production API**: Currently configured for Render.com deployment
- **Local Development**: Update `js/config.js` to uncomment localhost URL
- **File Uploads**: Configured for Cloudinary storage in production

## Key Development Patterns

### Error Handling
- Consistent error responses with descriptive messages
- JWT token validation with proper error codes
- MongoDB operation error handling with appropriate HTTP status codes

### Data Validation
- Mongoose schema validation for all models
- Route-level validation for required fields
- Deadline validation for job applications

### File Upload Pattern
- Multer + Cloudinary Storage for file handling
- Document attachment system for user profiles and applications
- Image optimization for profile pictures and cover photos

### Security Patterns
- Password hashing with bcryptjs
- JWT token expiration (5 hours)
- Role-based route protection
- CORS enabled for cross-origin requests

## Database Seeding
- `backend/seed.js` available for initial data population
- Run with `node seed.js` from backend directory after setting up database

## Common Development Tasks

### Adding New API Routes
1. Create route handler in appropriate routes file
2. Add middleware for authentication if needed
3. Update server.js to mount new routes
4. Test with appropriate HTTP client

### Adding New Database Models
1. Create Mongoose schema in `backend/models/`
2. Define relationships with existing models
3. Export model for use in routes
4. Update seed data if needed

### Frontend Page Development
1. Create new HTML file following existing structure
2. Add corresponding JavaScript logic
3. Integrate with existing header and chat modules
4. Update navigation links as needed
