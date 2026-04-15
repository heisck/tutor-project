# TutorAI - Production Setup Guide

## Environment Variables Required

### Frontend (.env.local or .env.production.local)
```
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-api.com

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Optional: Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Backend (.env.production.local in root)
```
# Database
DATABASE_URL=postgresql://user:password@host/db
POSTGRES_URL=postgresql://user:password@host/db

# Redis/Upstash
REDIS_URL=rediss://user:password@host:port
KV_URL=rediss://user:password@host:port
KV_REST_API_URL=https://host.upstash.io
KV_REST_API_TOKEN=token

# Authentication
NEXTAUTH_SECRET=your_secret_key_32_chars_min
NEXTAUTH_URL=https://your-domain.com

# AI/LLM Configuration
ANTHROPIC_API_KEY=your_anthropic_key
AI_GATEWAY_API_KEY=your_gateway_key

# Security
JWT_SECRET=your_jwt_secret_32_chars_min
ENCRYPTION_KEY=your_encryption_key_32_chars_min
```

## Deployment Checklist

- [ ] **Environment Variables**: Add all required env vars to Vercel/hosting dashboard
- [ ] **Database**: Run migrations on production database
- [ ] **Email Service**: Configure email provider for password resets
- [ ] **API Keys**: Ensure all API keys are valid and have correct scopes
- [ ] **CORS**: Configure CORS properly on backend for production domain
- [ ] **Security**:
  - [ ] HTTPS enabled
  - [ ] HSTS headers configured
  - [ ] CSP headers set
  - [ ] Rate limiting enabled
  - [ ] Input validation on all endpoints
- [ ] **Monitoring**:
  - [ ] Error tracking (Sentry/similar)
  - [ ] Performance monitoring (New Relic/Datadog)
  - [ ] Logging configured
  - [ ] Alerts set up

## Build & Deploy

### Local Testing
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Test production build locally
npm run start
```

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy - Vercel will automatically run `npm run build` and `npm run start`

### Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## API Integration Points

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password with token

### Dashboard Endpoints
- `GET /api/dashboard/stats` - User statistics and streaks
- `GET /api/dashboard/courses` - List user's courses
- `POST /api/documents/upload` - Upload learning materials
- `GET /api/documents/{id}` - Get document details

### Session/Tutoring Endpoints
- `POST /api/sessions/start` - Start tutoring session
- `POST /api/sessions/{sessionId}/message` - Send message in session
- `GET /api/sessions/{sessionId}/history` - Get session history
- `POST /api/sessions/{sessionId}/question` - Request practice question

## Security Best Practices

1. **HTTPS Only**: All traffic should be encrypted
2. **API Authentication**: Use JWT tokens with short expiration
3. **CORS**: Whitelist specific origins, not `*`
4. **Rate Limiting**: Implement rate limiting on public endpoints
5. **Input Validation**: Validate all user inputs server-side
6. **Secrets Management**: Use environment variables, never hardcode secrets
7. **SQL Injection**: Use parameterized queries
8. **XSS Prevention**: Sanitize user inputs, use Content Security Policy
9. **CSRF Protection**: Implement CSRF tokens for state-changing requests
10. **Dependencies**: Keep dependencies updated, use `npm audit`

## Performance Optimization

- [ ] **Image Optimization**: Use Next.js Image component
- [ ] **Code Splitting**: Implemented with dynamic imports
- [ ] **Caching**: Configure appropriate cache headers
- [ ] **CDN**: Use CDN for static assets
- [ ] **Compression**: Enable gzip/brotli compression
- [ ] **Database**: Add indexes on frequently queried fields
- [ ] **API Caching**: Implement Redis caching for frequently accessed data

## Monitoring & Logging

### Recommended Tools
- **Error Tracking**: Sentry, Bugsnag
- **Performance**: Vercel Analytics, Datadog, New Relic
- **Logging**: ELK Stack, Datadog, CloudWatch
- **Uptime**: Uptime Robot, Pingdom

### Key Metrics to Monitor
- Page load time (LCP, FCP, CLS)
- API response times
- Error rates
- User signups/active users
- Database performance
- API rate limiting

## Support & Troubleshooting

### Common Issues

1. **CORS Errors**: Check backend CORS configuration matches frontend domain
2. **Database Connection**: Verify DATABASE_URL is correct and accessible
3. **Authentication Errors**: Check JWT_SECRET length (min 32 chars)
4. **File Upload Failures**: Check file size limits and storage permissions

### Logs Location
- Frontend: Browser console (F12)
- Server: Vercel dashboard or server logs
- Database: Check database logs for query errors
