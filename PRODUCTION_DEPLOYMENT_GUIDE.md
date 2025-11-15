# Production Deployment Guide

## Prerequisites Checklist

### 1. Domain & DNS (Cloudflare)
- [ ] Domain purchased and added to Cloudflare
- [ ] DNS records configured:
  - [ ] A/CNAME record for main app (e.g., `app.yourdomain.com`)
  - [ ] A/CNAME record for API if needed
- [ ] SSL/TLS certificate active (Cloudflare provides this automatically)

### 2. Firebase Project Setup
- [ ] Firebase project created (https://console.firebase.google.com)
- [ ] Firebase Authentication enabled
  - [ ] Email/Password provider enabled
  - [ ] (Optional) Google OAuth configured
  - [ ] (Optional) Apple OAuth configured
- [ ] Cloud Firestore database created
  - [ ] Start in production mode
  - [ ] Deploy security rules from `firestore.rules`
- [ ] Firebase Storage enabled
  - [ ] Deploy security rules from `storage.rules`
- [ ] Billing enabled (Blaze plan required for production)

### 3. Firebase Configuration
- [ ] Download service account key JSON from Firebase Console:
  - Go to Project Settings > Service Accounts
  - Click "Generate New Private Key"
  - Save securely (never commit to git)
- [ ] Get Firebase Web App config:
  - Project Settings > General > Your Apps > Web App
  - Copy the config object values

### 4. Hosting Platform Choice

#### Cloudflare Pages (Selected)
- [ ] Create Cloudflare account (cloudflare.com)
- [ ] Connect GitHub repository to Cloudflare Pages
- [ ] Configure build settings for Next.js
- [ ] Configure environment variables
- [ ] Custom domain automatically configured (already in Cloudflare)
- [ ] SSL/TLS automatically provisioned

#### Alternative Options (Not Used)

**Option B: Vercel**
- Create Vercel account and connect GitHub repository

**Option C: Firebase Hosting**
- Enable Firebase Hosting and configure firebase.json

**Option D: Custom VPS (DigitalOcean, Hetzner, etc.)**
- Set up server with Node.js, Nginx, and PM2

---

## Environment Variables

Create `.env.production` with these values:

```bash
# Firebase Configuration (Client-side - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Disable emulator in production
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

# Firebase Admin SDK (Server-side - KEEP SECRET)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'

# App Configuration
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NODE_ENV=production

# Payment Gateway (Paystack)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Payment Gateway (Flutterwave)
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx

# Email Service (Resend - recommended)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# OR Email Service (Brevo)
BREVO_API_KEY=xkeysib-xxxxx
BREVO_FROM_EMAIL=noreply@yourdomain.com
BREVO_FROM_NAME=SchoolPortal
```

---

## Deployment Steps

### Step 1: Prepare Firebase

1. **Deploy Firestore Security Rules:**
```bash
firebase deploy --only firestore:rules
```

2. **Deploy Storage Security Rules:**
```bash
firebase deploy --only storage
```

3. **Create Firestore Indexes:**
   - Go to Firebase Console > Firestore > Indexes
   - Add composite indexes for queries used in the app:

```javascript
// Students by tenant
tenantId (Ascending) + createdAt (Descending)

// Scores by tenant and term
tenantId (Ascending) + termId (Ascending) + studentId (Ascending)

// Results by tenant and class
tenantId (Ascending) + classId (Ascending) + termId (Ascending)

// Audit logs by tenant and timestamp
tenantId (Ascending) + timestamp (Descending)

// Fees by tenant and status
tenantId (Ascending) + status (Ascending) + dueDate (Ascending)
```

### Step 2: Build and Test Locally

1. **Install dependencies:**
```bash
npm install
```

2. **Build production bundle:**
```bash
npm run build
```

3. **Test production build locally:**
```bash
npm start
```

4. **Verify:**
   - [ ] App loads without errors
   - [ ] Registration works
   - [ ] Login works
   - [ ] Firebase connections work
   - [ ] All pages load correctly

### Step 3: Deploy to Cloudflare Pages

1. **Login to Cloudflare Dashboard:**
   - Go to https://dash.cloudflare.com
   - Navigate to Pages

2. **Create New Project:**
   - Click "Create a project"
   - Connect to your GitHub account
   - Select the school-portal repository

3. **Configure Build Settings:**
   - **Framework preset:** Next.js
   - **Build command:** `npm run build`
   - **Build output directory:** `.next`
   - **Root directory:** (leave blank or `/`)
   - **Node version:** 18 or higher

4. **Configure Environment Variables:**
   - In Cloudflare Pages > Your Project > Settings > Environment Variables
   - Add all variables from `.env.production`
   - **Important:** Add these for both "Production" and "Preview" environments

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
   FIREBASE_SERVICE_ACCOUNT_KEY
   NEXT_PUBLIC_APP_URL
   NODE_ENV=production
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
   PAYSTACK_SECRET_KEY
   NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY
   FLUTTERWAVE_SECRET_KEY
   RESEND_API_KEY
   RESEND_FROM_EMAIL
   ```

5. **Configure Custom Domain:**
   - Cloudflare Pages > Your Project > Custom Domains
   - Add your domain (e.g., `app.yourdomain.com`)
   - Since domain is already in Cloudflare, DNS records are automatically configured
   - SSL/TLS certificate is automatically provisioned

6. **Deploy:**
   - Click "Save and Deploy"
   - Cloudflare Pages will automatically build and deploy
   - Every push to main branch will trigger automatic redeployment

### Step 4: Post-Deployment Verification

- [ ] Visit your production URL
- [ ] Test complete registration flow
- [ ] Test login/logout
- [ ] Test file uploads (school logo, student photos)
- [ ] Test PDF generation
- [ ] Test payment flows (Paystack/Flutterwave)
- [ ] Test email notifications
- [ ] Check Firebase Console for data
- [ ] Monitor Firebase Usage & Billing
- [ ] Set up error monitoring (Sentry recommended)

---

## Firebase Cost Optimization

### Free Tier Limits (Spark Plan)
- Authentication: 10K verifications/month
- Firestore: 1GB storage, 50K reads, 20K writes, 20K deletes per day
- Storage: 1GB storage, 1GB download per day

### Paid Tier (Blaze Plan - Pay as you go)
- Authentication: $0.0055/verification beyond 50K/month
- Firestore:
  - Reads: $0.036 per 100K
  - Writes: $0.108 per 100K
  - Deletes: $0.012 per 100K
  - Storage: $0.18/GB/month
- Storage:
  - Storage: $0.026/GB/month
  - Download: $0.12/GB

### Optimization Tips
1. **Enable Firestore caching** to reduce reads
2. **Use pagination** for large lists (already implemented)
3. **Compress images** before upload
4. **Use Storage CDN** for frequently accessed files
5. **Set Firebase Budget Alerts** in Console

---

## Security Checklist

- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules deployed and tested
- [ ] Service account key stored securely (use Vercel secrets)
- [ ] Never commit `.env` files to Git
- [ ] Enable Firebase App Check (optional but recommended)
- [ ] Set up CORS properly for API routes
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Review and restrict Firebase API keys in console

---

## Monitoring & Maintenance

### Set Up Monitoring
1. **Firebase Console:**
   - Monitor Authentication usage
   - Monitor Firestore reads/writes
   - Monitor Storage usage
   - Set up budget alerts

2. **Cloudflare Analytics:**
   - Cloudflare Pages > Your Project > Analytics
   - Monitor page views, requests, bandwidth
   - View geographic distribution
   - Track performance metrics

3. **Error Tracking (Sentry):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

4. **Additional Analytics:**
   - Enable Firebase Analytics
   - Or Google Analytics
   - Or Cloudflare Web Analytics

### Regular Maintenance
- [ ] Weekly: Check Firebase usage and costs
- [ ] Monthly: Review audit logs for suspicious activity
- [ ] Monthly: Review error logs and fix issues
- [ ] Quarterly: Security audit and dependency updates
- [ ] Backup Firestore data regularly

---

## Rollback Plan

If deployment fails or has critical issues:

1. **Cloudflare Pages:**
   - Go to Cloudflare Pages > Your Project > Deployments
   - Find the last working deployment
   - Click "..." menu > "Rollback to this deployment"
   - Or use "Retry deployment" to rebuild from same commit

2. **Firebase Rules:**
```bash
firebase deploy --only firestore:rules --project-alias previous
```

3. **Keep previous .env configuration** backed up

4. **Git Revert (if needed):**
```bash
git revert HEAD
git push origin main
# Cloudflare Pages will auto-deploy the reverted code
```

---

## Support & Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Cloudflare Pages Documentation:** https://developers.cloudflare.com/pages
- **Cloudflare Pages Framework Guide:** https://developers.cloudflare.com/pages/framework-guides/nextjs
- **Cloudflare DNS Documentation:** https://developers.cloudflare.com/dns

---

## Quick Start Commands (When Infrastructure is Ready)

```bash
# 1. Set up environment variables
cp .env.example .env.production
# Edit .env.production with your Firebase config

# 2. Deploy Firebase rules
firebase deploy --only firestore:rules,storage

# 3. Test build locally
npm run build
npm start

# 4. Push to GitHub (triggers Cloudflare Pages deployment)
git add .
git commit -m "Production deployment"
git push origin main

# 5. Monitor deployment
# Go to Cloudflare Dashboard > Pages > Your Project > Deployments

# 6. Test production
open https://your-domain.com
```

---

## Estimated Timeline

- Firebase setup: 30 minutes
- Cloudflare Pages project setup: 10 minutes
- Environment configuration: 15 minutes
- First deployment: 10 minutes (automatic)
- Testing and verification: 1 hour
- **Total: ~2 hours**

---

## Cloudflare Pages Benefits

✅ **Automatic Deployments:** Every push to main triggers a build
✅ **Preview Deployments:** Every PR gets a unique preview URL
✅ **Global CDN:** Automatic edge caching worldwide
✅ **Zero Configuration SSL:** Automatic HTTPS with Cloudflare's network
✅ **Integrated DNS:** Domain already in Cloudflare = seamless setup
✅ **DDoS Protection:** Built-in security from Cloudflare
✅ **Free Tier:** Generous limits for small to medium projects
✅ **Rollback:** One-click rollback to any previous deployment

---

## Questions to Answer Before Deployment

1. What domain will you use? (e.g., `seth.ng`)
2. Which payment gateway will you prioritize? (Paystack or Flutterwave)
3. Which email service? (Resend or Brevo)
4. What's your expected user load? (for Firebase plan selection)
5. Is your GitHub repository private or public?

---

## Next Steps

1. Ensure your code is pushed to GitHub
2. Set up Firebase project and get credentials
3. Connect GitHub repo to Cloudflare Pages
4. Configure environment variables in Cloudflare
5. Let automatic deployment handle the rest!

**When you're ready to deploy, come back with your Firebase config and domain details, and I'll help you get everything set up!**
