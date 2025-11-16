# 🚀 Vercel Deployment Guide

## Step-by-Step Deployment

### 1. Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Find your repository: `lighthqflutter/seth`
4. Click **"Import"**

### 2. Configure Project Settings

#### Framework Preset
- **Framework**: Next.js
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

#### Environment Variables

Click **"Environment Variables"** and add these:

```env
# Firebase Client Config (Get from Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seth-production-26d19.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seth-production-26d19
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seth-production-26d19.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# App Config
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

# Firebase Admin SDK (IMPORTANT!)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"seth-production-26d19",...}
```

**⚠️ IMPORTANT**:
- Copy the entire content of `firebase-service-account-production.json` as a single-line JSON string
- To get single-line JSON: `cat firebase-service-account-production.json | tr -d '\n'`

### 3. Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Once deployed, you'll get a URL like: `https://seth-xxx.vercel.app`

---

## 🔧 Post-Deployment Setup

### 1. Get Your Firebase Admin SDK Service Account Key

If you don't have it already:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **seth-production-26d19**
3. Click ⚙️ Settings → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Save the JSON file

### 2. Convert to Single-Line JSON

**Option A: Using Terminal**
```bash
cat firebase-service-account-production.json | tr -d '\n' | tr -s ' '
```

**Option B: Using Node.js**
```bash
node -e "console.log(JSON.stringify(require('./firebase-service-account-production.json')))"
```

Copy the output and paste it as the value for `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel.

### 3. Update Firebase Settings for Production

#### A. Add Vercel Domain to Firebase

1. Go to Firebase Console → **Authentication** → **Settings**
2. Scroll to **Authorized domains**
3. Click **"Add domain"**
4. Add your Vercel domain: `seth-xxx.vercel.app`

#### B. Update Firestore Security Rules

Make sure your `/firestore.rules` includes super admin permissions:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserTenant() {
      return request.auth.token.tenantId;
    }

    function isSuperAdmin() {
      return request.auth != null &&
             request.auth.token.role == 'superadmin' &&
             request.auth.token.tenantId == 'SUPER_ADMIN';
    }

    function isAdmin() {
      return request.auth != null && request.auth.token.role == 'admin';
    }

    function isTeacher() {
      return request.auth != null &&
             (request.auth.token.role == 'admin' || request.auth.token.role == 'teacher');
    }

    // Tenants - Super admin can read/write all
    match /tenants/{tenantId} {
      allow read: if isSuperAdmin() ||
                     (isAuthenticated() && getUserTenant() == tenantId);
      allow write: if isSuperAdmin();
    }

    // Users - Super admin can read all
    match /users/{userId} {
      allow read: if isSuperAdmin() ||
                     (isAuthenticated() && resource.data.tenantId == getUserTenant());
      allow create: if isSuperAdmin() || isAdmin();
      allow update, delete: if isSuperAdmin() || isAdmin();
    }

    // ... rest of your rules ...
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Testing After Deployment

### 1. Test Landing Page

Visit: `https://your-app.vercel.app`

**Check**:
- ✅ No "Get Started" or "Register" buttons
- ✅ Only "Login to Your School Portal" button
- ✅ "Contact us to get started →" link present
- ✅ Click contact link → goes to `/contact`

### 2. Test Contact Form

Visit: `https://your-app.vercel.app/contact`

**Check**:
- ✅ Form loads correctly
- ✅ Fill in school details
- ✅ Submit → email client opens with pre-filled message
- ✅ Success confirmation shows

### 3. Test Super Admin Login

Visit: `https://your-app.vercel.app/login`

**Credentials**:
- Email: `support@lighthousemultimedia.net`
- Password: `LighthouseSETH2025!`

**Check**:
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ Can access `/register` page
- ✅ Can create a test school

### 4. Test Registration (Super Admin Only)

Visit: `https://your-app.vercel.app/register`

**As Super Admin**:
- ✅ Page loads (not redirected)
- ✅ Can fill in school details
- ✅ Can set student quota
- ✅ Can create school successfully

**As Regular User** (logout first, login as school admin):
- ✅ Redirected to `/dashboard`
- ✅ Cannot access `/register`

**Not Logged In**:
- ✅ Redirected to `/login?redirect=/register`

### 5. Test Template Builder

Visit: `https://your-app.vercel.app/dashboard/settings/report-cards`

**Check**:
- ✅ Can create new template
- ✅ Step 4: Only "Preset Layout" active
- ✅ Step 4: "Custom Layout" shows "Coming Soon"
- ✅ Step 5: Visual preview shows colors/fonts
- ✅ Can save template successfully

---

## 🔒 Security Checklist

- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set in Vercel environment variables
- [ ] Vercel domain added to Firebase authorized domains
- [ ] Firestore security rules include super admin permissions
- [ ] `.env.local` is in `.gitignore` (never commit secrets!)
- [ ] Super admin password changed after first login
- [ ] All environment variables set to production values (not demo/emulator)

---

## 🐛 Troubleshooting

### Issue: "Missing or insufficient permissions"

**Solution**:
1. Check Firestore security rules are deployed
2. Verify super admin custom claims are set
3. Re-deploy rules: `firebase deploy --only firestore:rules`

### Issue: "FIREBASE_SERVICE_ACCOUNT_KEY not found"

**Solution**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` exists
3. Make sure it's a single-line JSON string (no line breaks)
4. Re-deploy if you added it after initial deployment

### Issue: Registration redirects super admin

**Solution**:
1. Check custom claims: In Firebase Console → Authentication → Users → Click user
2. Verify `customClaims` shows: `{"role": "superadmin", "tenantId": "SUPER_ADMIN"}`
3. If not set, run: `npx tsx scripts/create-super-admin.ts` again

### Issue: Build fails on Vercel

**Solution**:
1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors (run `npm run build` locally first)
   - Node version mismatch (check `package.json` engines)

### Issue: "Cannot find module 'dotenv'"

**Solution**:
This only affects the `create-super-admin.ts` script which runs locally, not in production.
The script is for initial setup only.

---

## 📊 Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Your Project → Analytics

**Key Metrics**:
- Page views
- Unique visitors
- Top pages
- Performance metrics

### Firebase Analytics

Already configured via Firebase SDK.

**Key Events**:
- User logins
- School registrations (super admin)
- Template creations
- Report card generations

---

## 🔄 Continuous Deployment

Vercel automatically deploys on every push to `main` branch:

1. Make changes locally
2. Commit: `git commit -m "your message"`
3. Push: `git push origin main`
4. Vercel auto-deploys (takes 2-3 minutes)
5. Check deployment status in Vercel dashboard

---

## 📞 Support

**Deployment Issues**: Check Vercel deployment logs

**Firebase Issues**: Check Firebase Console → Functions/Firestore logs

**Super Admin Access**:
- Email: support@lighthousemultimedia.net
- Reset password via Firebase Console if needed

---

## ✅ Deployment Checklist

### Pre-Deployment
- [x] All changes committed to GitHub
- [x] Build successful locally: `npm run build`
- [ ] Environment variables documented
- [ ] Firebase service account key ready

### Vercel Setup
- [ ] Project imported from GitHub
- [ ] All environment variables added
- [ ] Domain configured
- [ ] First deployment successful

### Firebase Setup
- [ ] Vercel domain added to authorized domains
- [ ] Security rules updated with super admin permissions
- [ ] Security rules deployed
- [ ] Super admin custom claims verified

### Testing
- [ ] Landing page loads
- [ ] Contact form works
- [ ] Super admin login works
- [ ] Can access `/register` as super admin
- [ ] Cannot access `/register` as regular user
- [ ] Template builder works
- [ ] Can create test school

### Post-Deployment
- [ ] Change super admin password
- [ ] Test all workflows end-to-end
- [ ] Enable Vercel analytics
- [ ] Set up monitoring alerts

---

**Last Updated**: November 17, 2025
**Status**: Ready for deployment
