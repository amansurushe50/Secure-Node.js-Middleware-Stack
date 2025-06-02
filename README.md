## Project Structure
```
Secure Node.js Middleware Stack/
├── package.json
├── package-lock.json
├── README.md
├── .env.example
├── .gitignore
├── app.js                     # Main application entry point
├── middleware/
│   ├── rateLimiter.js         # Custom rate limiting middleware
│   ├── ipBlacklist.js         # IP blacklisting middleware
│   ├── sanitizer.js           # Input sanitization middleware
│   └── auth.js                # Simple auth middleware for admin routes
├── routes/
│   ├── public.js              # Public routes
│   ├── protected.js           # CSRF protected routes
│   └── admin.js               # Admin routes with auth
└──  utils/
    ├── logger.js              # Simple logging utility
    └── responseHelper.js      # Standardized API responses

```

## Setup Instructions

### 1. Initialize Project
```bash
mkdir security-middleware-app
cd security-middleware-app
npm init -y
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install express helmet express-rate-limit csurf express-mongo-sanitize xss-clean cookie-parser cors

# Development dependencies
npm install --save-dev nodemon jest supertest
```

### 3. Update package.json scripts
```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 4. Create .env.example
```
PORT=3000
NODE_ENV=development
ADMIN_API_KEY=your-secret-admin-key-here
CSRF_SECRET=your-csrf-secret-here
```

### 5. Rate Limit test
```bash
# To test the rate limit
npm run test:rate-limit
```



## Key Features Implemented

1. **Custom Rate Limiter** - In-memory storage, 100 requests per 15 minutes
2. **IP Blacklisting** - Configurable blacklist with admin management
3. **CSRF Protection** - Token-based protection for state-changing operations
4. **Input Sanitization** - NoSQL injection and XSS prevention
5. **Security Headers** - Helmet.js for secure HTTP headers
6. **Admin Routes** - API key protected admin endpoints

## API Endpoints

- `GET /api/public` - Public endpoint (rate limited)
- `POST /api/submit` - CSRF protected + sanitized
- `POST /api/contact` - Rate limited + sanitized
- `GET /api/admin/blacklist` - Admin only (view blacklist)
- `POST /api/admin/blacklist` - Admin only (add IP to blacklist)
- `DELETE /api/admin/blacklist/:ip` - Admin only (remove IP from blacklist)
- `GET /api/admin/rate-limit-status` - Admin only (view rate limit stats)

## Rate Limiting

1. **Algorithm**: Sliding window log for accurate limiting
1. **Storage**: In-memory Map (production would use Redis)
1. **Configuration**: 100 requests per 15 minutes per IP
1. **Headers**: Includes standard rate limit headers
1. **Cleanup**: Automatic cleanup of old entries

##  IP Blacklisting

1. **Storage**: In-memory Set with persistence capability
1. **Features**: Dynamic add/remove via admin API
1. **Safety**: Whitelist for localhost/admin IPs
1. **Validation**: IP format validation before blacklisting

## CSRF Protection

1. **Method**: Double-submit cookie pattern
1. **Token**: Generated per session, validated on state-changing operations
1. **Routes**: Applied to POST, PUT, DELETE operations
1. **Headers**: Supports both header and body token submission

## Input Sanitization

1. **NoSQL Injection**: Removes $ operators and . notation
1. **XSS Prevention**: HTML encoding and script tag removal
1. **Deep Sanitization**: Recursive sanitization of nested objects
1. **Custom Validators**: Email, phone, name validation functions

## Security Headers (Helmet.js)

- Content Security Policy (CSP)
- X-Frame-Options (Clickjacking protection)
- X-XSS-Protection
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)