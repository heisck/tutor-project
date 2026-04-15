# Environment Variables Setup Checklist

## Quick Copy-Paste Your Values Here

Update `.env.local` or `.env.production.local` with these variables:

```bash
# ===========================================
# DATABASE & STORAGE
# ===========================================
DATABASE_URL=postgresql://user:password@host:port/dbname
POSTGRES_URL=postgresql://user:password@host:port/dbname
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:port/dbname

# ===========================================
# REDIS / CACHE
# ===========================================
REDIS_URL=redis://user:password@host:port
KV_URL=rediss://default:password@host:port
KV_REST_API_URL=https://yourinstance.upstash.io
KV_REST_API_TOKEN=your_token_here

# ===========================================
# AUTHENTICATION & SECURITY
# ===========================================
NEXTAUTH_SECRET=generate_32_char_random_string_here
NEXTAUTH_URL=http://localhost:3000  # or your production domain
JWT_SECRET=generate_32_char_random_string_here
COOKIE_SECRET=generate_32_char_random_string_here

# ===========================================
# OAUTH / SOCIAL LOGIN (Optional)
# ===========================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/oauth/callback

# ===========================================
# AI / LLM SERVICES
# ===========================================
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
AI_GATEWAY_API_KEY=your_gateway_api_key

# ===========================================
# FILE STORAGE (Cloudflare R2 or equivalent)
# ===========================================
R2_ENDPOINT=https://accountid.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=ai-tutor-pwa-private

# ===========================================
# FRONTEND CONFIG
# ===========================================
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_GA_ID=optional_google_analytics_id

# ===========================================
# SERVER CONFIG
# ===========================================
NODE_ENV=development  # or production
PORT=4000
APP_VERSION=0.1.0
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
SESSION_TTL_HOURS=168
```

## How to Generate Required Secrets

### NEXTAUTH_SECRET & JWT_SECRET
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### GOOGLE OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:4000/api/v1/auth/oauth/callback` (local)
   - `https://your-domain.com/api/v1/auth/oauth/callback` (production)
6. Copy Client ID and Client Secret

## Database Setup

### Neon PostgreSQL (Already Configured)
Your Neon database is already connected. Just verify:
- DATABASE_URL is set
- Connection is working with: `npx drizzle-kit push`

### Local PostgreSQL (for development)
```bash
# Using Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_tutor_pwa -p 5433:5432 -d postgres:15

# Update DATABASE_URL in .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public
```

## Storage Setup

### Cloudflare R2 (Recommended)
1. Create Cloudflare account at https://www.cloudflare.com/
2. Navigate to R2 and create a new bucket
3. Create API token:
   - Go to Account Settings → API Tokens
   - Create token with R2 permissions
4. Copy the values to your .env

### Upstash Redis (Optional but Recommended)
1. Sign up at https://upstash.com/
2. Create a Redis database
3. Copy connection string to KV_URL and REST API credentials

## Quick Start for Development

1. **Copy .env.example to .env.local:**
   ```bash
   cp .env.example .env.local
   ```

2. **Update with your values** from above

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run migrations:**
   ```bash
   npx drizzle-kit push
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

6. **Access the app:**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000

## Production Deployment (Vercel)

1. **In Vercel Dashboard:**
   - Go to Settings → Environment Variables
   - Add all variables from above
   - Set NODE_ENV to `production`

2. **Deploy:**
   ```bash
   git push origin main
   ```

3. **Post-deployment:**
   - Run migrations: `npm run migrate:prod`
   - Verify email service working
   - Set up monitoring/logging
   - Test auth flows

## Verify Everything Works

### Test Frontend
```bash
# Navigate to http://localhost:3000
- Landing page loads
- Can navigate to signup/login
- Theme switcher works
- No console errors
```

### Test Backend Connection
```bash
# Test API connectivity
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

### Test Database
```bash
# From terminal, test Neon connection
psql $DATABASE_URL -c "SELECT 1"
# Should return: 1
```

### Test Authentication
```bash
# Test signup flow
POST http://localhost:4000/api/v1/auth/signup
Body: {
  "email": "test@example.com",
  "password": "Test123!@#",
  "name": "Test User"
}
# Should return: 201 with user data
```

## Troubleshooting

### "Cannot connect to database"
- [ ] Check DATABASE_URL format
- [ ] Verify Neon database is running
- [ ] Check network/firewall rules
- [ ] Verify credentials are correct

### "CORS error"
- [ ] Check CORS_ORIGINS includes frontend URL
- [ ] Verify NEXT_PUBLIC_API_BASE_URL is correct
- [ ] Check backend CORS middleware is enabled

### "Authentication fails"
- [ ] Verify NEXTAUTH_SECRET is 32+ chars
- [ ] Check NEXTAUTH_URL matches your domain
- [ ] Verify JWT_SECRET is set
- [ ] Check session storage (database connected)

### "File uploads fail"
- [ ] Verify R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
- [ ] Check R2 bucket permissions
- [ ] Verify file size limits in backend

## Next Steps

1. Add environment variables to your hosting
2. Deploy to production
3. Test all flows end-to-end
4. Set up monitoring and logging
5. Configure custom domain
6. Enable SSL/HTTPS
7. Set up automated backups
8. Create runbook for operations
