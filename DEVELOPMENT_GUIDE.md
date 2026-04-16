# Development Server Troubleshooting

## Issues Fixed ✅

### 1. Font Configuration Error (Next.js)
**Problem**: "Axes can only be defined for variable fonts when the weight property is nonexistent or set to `variable`"

**Fix Applied**: 
- Removed `weight` array from Fraunces (variable font using all weights by default)
- Kept `weight` array for Source Serif 4 and DM Mono
- File: `packages/web/src/app/layout.tsx`

**Status**: ✅ Fixed

---

### 2. Missing Redis URL (API)
**Problem**: "Invalid API environment: REDIS_URL: REDIS_URL must be a valid URL"

**Fixes Applied**:
1. Created `packages/api/.env.local` with default Redis URL
2. Updated validation schema to make REDIS_URL optional with default: `redis://localhost:6379`
3. File: `packages/api/src/config/env.ts`

**Status**: ✅ Fixed

**Development Behavior**:
- Defaults to `redis://localhost:6379` if not provided
- If you have Redis running locally, it will work
- If you don't have Redis, the API will still start but may fail on cache operations

---

### 3. Request Timeout on Font Loading
**Problem**: "Request timed out after 3000ms" (cascading from font config error)

**Fix**: Resolved by fixing font configuration above

**Status**: ✅ Fixed

---

## Environment Files Created

### `packages/api/.env.example`
Template showing all required environment variables with descriptions

### `packages/api/.env.local`
Development environment with defaults for:
- Local PostgreSQL: `postgresql://postgres:postgres@localhost:5432/ai_tutor`
- Local Redis: `redis://localhost:6379`
- Test credentials for OAuth, R2, OpenAI, Anthropic

### `packages/web/.env.local`
Development environment pointing to local API:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`

---

## Starting the Dev Server

### First Time Setup
```bash
cd /path/to/tutor-project
npm install
```

### Run Development (Turbo)
```bash
npm run dev
```

This will start:
- **Web (Next.js)**: http://localhost:3000
- **API (Express)**: http://localhost:3001
- **Shared (TypeScript)**: Type checking
- **DB (Prisma)**: Schema validation
- **Emails**: Email service

---

## Common Issues & Solutions

### API Still Won't Start
**If you see**: `Error: Invalid API environment: ...`

**Check**:
1. Is `.env.local` present in `packages/api/`?
   ```bash
   ls packages/api/.env.local
   ```

2. Are required keys set?
   ```bash
   grep OPENAI_API_KEY packages/api/.env.local
   grep GOOGLE_CLIENT_ID packages/api/.env.local
   ```

3. Check file is readable:
   ```bash
   cat packages/api/.env.local | head -10
   ```

**Solution**: Copy the `.env.local` file created and update with your actual API keys

---

### Web Page Shows 500 Error
**If you see**: `GET / 500 in 21226ms` or `Request timed out`

**Check**:
1. Did font fix get applied?
   ```bash
   grep "display: 'swap'" packages/web/src/app/layout.tsx
   ```

2. Clear Next.js cache:
   ```bash
   rm -rf packages/web/.next
   npm run dev
   ```

3. Check for TypeScript errors:
   ```bash
   npm run typecheck
   ```

**Solution**: The fix has been applied. Restart the dev server.

---

### Redis Connection Error
**If you see**: Connection errors when accessing cache

**Solution**: Either
- Install and run Redis locally: `redis-server`
- Or remove Redis usage in development mode
- API now defaults to localhost:6379 - adjust if needed

---

### Database Connection Error
**If you see**: `ECONNREFUSED 127.0.0.1:5432`

**Check**:
1. Is PostgreSQL running?
   ```bash
   psql -U postgres -h localhost
   ```

2. Database URL is correct in `.env.local`

**Solution**: 
- Start PostgreSQL locally
- Or update `DATABASE_URL` to match your setup
- See `ENV_SETUP.md` for examples

---

### Port Already in Use
**If you see**: `Error: listen EADDRINUSE :::3000` or `:::3001`

**Check what's using the port**:
```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000

# Mac/Linux
lsof -i :3000
```

**Solution**:
- Kill the process: `kill -9 <PID>`
- Or change ports in `package.json` scripts
- Change API port: Set `PORT=3002` in `.env.local`
- Change Web port: `npm run dev -- -p 3001` (from web folder)

---

### TypeScript Errors
**If you see**: Type errors in IDE or `npm run typecheck`

**Solution**:
1. Regenerate types:
   ```bash
   npm run typecheck
   ```

2. Clear cache:
   ```bash
   rm -rf packages/*/dist
   rm -rf packages/web/.next
   npm install
   ```

3. Rebuild:
   ```bash
   npm run dev
   ```

---

## Verifying Setup Works

### Test Web Server
```bash
curl http://localhost:3000
```
Should return HTML (not 500 error)

### Test API Server
```bash
curl http://localhost:3001/health
```
May return 404 (route not exists) but should connect

### Test TypeScript Compilation
```bash
npm run typecheck
```
Should show "0 errors" for all packages

---

## Environment Variables Explained

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API access | None | Dev: No, Prod: Yes |
| `ANTHROPIC_API_KEY` | Claude API access | None | Dev: No, Prod: Yes |
| `DATABASE_URL` | PostgreSQL connection | None | Yes |
| `REDIS_URL` | Cache/session store | localhost:6379 | No (has default) |
| `COOKIE_SECRET` | Session encryption | Test value | Yes |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth | None | Dev: No, Prod: Yes |
| `R2_*` | Cloudflare storage | None | Dev: No, Prod: Yes |
| `CORS_ORIGINS` | Allowed origins | localhost:* | Yes |
| `PORT` | API server port | 3001 | No |
| `NODE_ENV` | Environment | development | No |

---

## Next Steps

1. ✅ Verify dev server starts without errors
2. ✅ Update `.env.local` with your actual API keys (for features like Claude)
3. ✅ Set up local PostgreSQL and Redis if needed
4. ✅ Test landing page loads at http://localhost:3000
5. ✅ Test API responds at http://localhost:3001

See `packages/web/QUICK_START.md` for component development guide!

---

## Still Having Issues?

Check:
1. **Node version**: `node --version` (should be 18+)
2. **npm version**: `npm --version` (should be 9+)
3. **Git status**: `git status` (no uncommitted breaking changes)
4. **Dependencies**: `npm install` (latest packages)
5. **File permissions**: `.env.local` files readable

If stuck, restart from scratch:
```bash
npm run clean
npm install
npm run dev
```
