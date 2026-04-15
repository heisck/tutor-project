# TutorAI - Complete Deployment Guide

## Project Overview

**TutorAI** is a full-stack AI-powered learning platform with:
- Modern, animated frontend built with Next.js 16, React 19, Tailwind CSS, Framer Motion
- Comprehensive backend API
- PostgreSQL database (Neon)
- Redis caching (Upstash)
- File storage with Cloudflare R2
- OAuth/Google login support
- Real-time AI tutoring sessions
- Learning analytics and streaks tracking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                     │
│  ├─ Landing Page                                         │
│  ├─ Auth Pages (Signup/Login/Reset)                     │
│  ├─ Dashboard (Stats, Streaks, Courses)                 │
│  ├─ Upload Interface (Drag & Drop)                      │
│  └─ Tutoring Session (Chat Interface)                   │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────────────────────┐
│                   Backend API                            │
│  ├─ Authentication & Authorization                      │
│  ├─ Document Processing & Storage                       │
│  ├─ AI Tutoring Engine                                  │
│  ├─ User Analytics & Streaks                            │
│  └─ Course & Progress Management                        │
└──────────────────┬──────────────────────────────────────┘
                   │
      ┌────────────┼─────────────┬──────────────┐
      │            │             │              │
   PostgreSQL   Redis       Cloudflare R2   OpenAI/
   (Neon)       (Upstash)   (Storage)      Anthropic
```

## Pre-Deployment Checklist

### Environment Setup
- [ ] All environment variables collected and ready
- [ ] Database credentials verified
- [ ] Redis credentials verified
- [ ] API keys for OAuth, AI services obtained
- [ ] File storage credentials ready
- [ ] Secrets generated (JWT, NEXTAUTH_SECRET, etc.)

### Code & Security
- [ ] All dependencies installed (`npm install`)
- [ ] No console errors/warnings in dev mode
- [ ] Security vulnerabilities checked (`npm audit`)
- [ ] Environment variables NOT committed to git
- [ ] API rate limiting configured
- [ ] CORS properly configured

### Testing
- [ ] Frontend loads without errors
- [ ] Auth flows tested (signup, login, password reset)
- [ ] File upload working
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] Redis caching working

## Deployment Steps

### Option 1: Deploy to Vercel (Recommended)

#### Step 1: Prepare Git Repository
```bash
# Make sure all changes are committed
git add .
git commit -m "Production deployment"
git push origin main
```

#### Step 2: Connect to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure build settings:
   - **Root Directory**: `packages/web` (or leave blank if monorepo root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### Step 3: Add Environment Variables in Vercel Dashboard
```
Settings → Environment Variables → Add the following:
```

**Production Environment:**
```
DATABASE_URL=your_neon_connection_string
REDIS_URL=your_upstash_redis_url
KV_URL=your_upstash_kv_url
KV_REST_API_TOKEN=your_token
NEXTAUTH_SECRET=your_32_char_secret
NEXTAUTH_URL=https://yourdomain.com
JWT_SECRET=your_32_char_secret
ANTHROPIC_API_KEY=your_key
AI_GATEWAY_API_KEY=your_key
R2_ENDPOINT=your_r2_endpoint
R2_ACCESS_KEY_ID=your_key_id
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
NEXT_PUBLIC_API_BASE_URL=https://your-api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PORT=4000
NODE_ENV=production
```

#### Step 4: Deploy
```bash
# Vercel will automatically deploy on push to main
# Or manually deploy from Vercel dashboard
```

#### Step 5: Verify Deployment
```bash
# Check build logs in Vercel dashboard
# Test the deployed URL
# Verify all features working
```

### Option 2: Deploy to Self-Hosted Server

#### Step 1: Prepare Server
```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### Step 2: Clone & Setup
```bash
# Clone repository
git clone https://github.com/yourusername/tutor-project.git
cd tutor-project

# Install dependencies
npm install

# Create .env.production.local with all variables
nano .env.production.local  # Copy from ENV_SETUP.md

# Run migrations
npm run migrate:prod
```

#### Step 3: Build
```bash
# Build the application
npm run build

# This creates optimized production bundle in .next
```

#### Step 4: Start with PM2
```bash
# Start the application
pm2 start npm --name "tutorAI" -- start

# Configure PM2 to start on server reboot
pm2 startup
pm2 save
```

#### Step 5: Set Up Reverse Proxy (Nginx)
```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/tutorAI
```

```nginx
# /etc/nginx/sites-available/tutorAI
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificate (from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API proxy (if running on different port)
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tutorAI /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL with Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option 3: Docker Deployment

#### Step 1: Create Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Build Next.js app
RUN npm run build

# Expose ports
EXPOSE 3000 4000

# Start application
CMD ["npm", "start"]
```

#### Step 2: Create Docker Compose File
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      # ... add other env vars
    depends_on:
      - postgres
      - redis
    restart: always

  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=ai_tutor
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    restart: always

  redis:
    image: redis:7
    restart: always

volumes:
  postgres_data:
```

#### Step 3: Deploy
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Post-Deployment Tasks

### Monitoring & Logging

1. **Set Up Error Tracking**
   ```bash
   # Add Sentry integration
   npm install @sentry/nextjs
   ```

2. **Set Up Performance Monitoring**
   - Use Vercel Analytics (automatic)
   - Or add Datadog, New Relic agent

3. **Configure Logging**
   - Frontend: Send logs to logging service
   - Backend: Configure structured logging
   - Database: Enable query logging for performance monitoring

### Security Hardening

1. **Enable HTTPS** (SSL/TLS)
2. **Set Security Headers**
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   Content-Security-Policy: ...
   ```

3. **Configure CORS** for specific origins only

4. **Set Up Rate Limiting**
   - API endpoints
   - Authentication endpoints (stricter limits)
   - File upload endpoints

5. **Enable Database Encryption** (at rest and in transit)

### Backups & Disaster Recovery

1. **Database Backups**
   - Neon: Automatic backups (24/7)
   - Add point-in-time recovery

2. **File Storage Backups**
   - Configure R2 versioning
   - Set up lifecycle policies

3. **Backup Testing**
   - Test restoration monthly
   - Document recovery procedures

### Performance Optimization

1. **Enable Caching**
   - Browser caching headers
   - Redis for API responses
   - CloudFlare CDN for static assets

2. **Database Optimization**
   - Add indexes on frequently queried columns
   - Monitor slow queries
   - Optimize N+1 queries

3. **Code Splitting & Lazy Loading**
   - Already configured in Next.js
   - Monitor bundle size

### Domain & DNS

1. **Set Up Custom Domain**
   - Update DNS records
   - Point to your hosting

2. **Email Configuration**
   - Set up email service (SendGrid, etc.)
   - Configure transactional email templates
   - Test password reset emails

## Monitoring Dashboard

Set up monitoring for key metrics:

- **Frontend**
  - Page load time
  - Core Web Vitals (LCP, FID, CLS)
  - User engagement
  - Conversion rates (signups, logins)

- **Backend API**
  - Response times (p50, p95, p99)
  - Error rates
  - Request throughput
  - Database query performance

- **Infrastructure**
  - Server/container health
  - Disk space
  - Memory usage
  - Network latency

## Incident Response

### Common Issues & Fixes

1. **High Memory Usage**
   - Check for memory leaks
   - Increase allocated memory
   - Optimize database queries

2. **Database Performance Degradation**
   - Check for slow queries
   - Add missing indexes
   - Archive old data

3. **API Rate Limit Errors**
   - Increase rate limits temporarily
   - Identify and fix client bugs
   - Implement exponential backoff

4. **File Upload Failures**
   - Check R2 bucket permissions
   - Verify API keys
   - Check file size limits

## Scaling

As traffic grows:

1. **Horizontal Scaling**
   - Run multiple app instances
   - Use load balancer
   - Session management via Redis

2. **Database Scaling**
   - Enable read replicas
   - Archive old data
   - Implement caching layer

3. **Static Asset Delivery**
   - Use CDN (CloudFlare, etc.)
   - Cache bust on new deployments

## Support & Maintenance

- Monitor error logs daily
- Review performance metrics weekly
- Security updates monthly
- Full backup verification quarterly
- Disaster recovery drills quarterly

## Getting Help

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Neon Docs: https://neon.tech/docs
- Upstash Docs: https://upstash.com/docs
