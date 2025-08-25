# Vercel Environment Variables for New Age Fotografie CRM

## Required Database Configuration

### Primary Database (Your External Neon Account)
```
DATABASE_URL=postgresql://neondb_owner:npg_D2bKWziIZj1G@ep-morning-star-a2i1gglu-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Database Components (Alternative Configuration)
If Vercel requires separate components:
```
PGHOST=ep-morning-star-a2i1gglu-pooler.eu-central-1.aws.neon.tech
PGDATABASE=neondb
PGUSER=neondb_owner
PGPASSWORD=npg_D2bKWziIZj1G
PGPORT=5432
```

## Authentication & Session Management
```
SESSION_SECRET=your_secure_session_secret_here
NODE_ENV=production
```

## Payment Processing (Stripe)
```
STRIPE_SECRET_KEY=sk_live_51LfKgtFphNBaSN5p...
VITE_STRIPE_PUBLIC_KEY=pk_live_51LfKgtFphNBaSN5p...
```

## AI Services
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
TOGNINJA_ASSISTANT_ID=asst_nlyO3yRav2oWtyTvkq0cHZaU
```

## Email Services
```
EMAIL_PASSWORD=your_smtp_password
SMTP_HOST=your_smtp_host
SMTP_PORT=587
```

## Print Services (Prodigi)
```
PRODIGI_API_KEY=c14420b0-bb43-4915-80fd-1c84d0c0678f
PRODIGI_ENDPOINT=https://api.prodigi.com/v4.0
```

## Security Notes
- Never use the internal Replit database URL (ep-bitter-tooth) for production
- Use your external Neon database URL (ep-morning-star) for all deployments
- Ensure SESSION_SECRET is a strong, unique value for production
- Switch Stripe keys from test to live mode for production

## Deployment Steps
1. Create new Vercel project
2. Add all environment variables above
3. Deploy from your Replit repository
4. Test database connectivity
5. Verify all CRM functions work correctly

---
*Database: 2,153 clients ready for production deployment*
*Last Updated: 2025-08-25*