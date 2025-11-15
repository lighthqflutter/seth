# 🚀 Quick Start Guide

## Your School Portal is Ready!

### ⚡ Running Right Now
- **Next.js App**: http://localhost:3000 ✅
- **Status**: Running in background

---

## 🔥 Start Firebase Emulator (Required)

**Open a NEW terminal** and run:

```bash
cd /Users/lighthqmini/school-portal
npm run emulator
```

**Wait for:**
```
✔  All emulators ready!
i  View Emulator UI at http://127.0.0.1:4000
```

**Access Emulator UI:** http://127.0.0.1:4000

---

## 📝 Test the App (5 Minutes)

### 1. **Register Your First School**

Visit: **http://localhost:3000**

Click: **"Get Started"** or **"Register your school"**

**Fill in the wizard:**

**Step 1 - School Info:**
- School Name: `Cedar School`
- Email: `info@cedarschool.com`
- Phone: `+234 800 000 0000`
- Address: `Lagos, Nigeria`

**Step 2 - Admin Account:**
- Name: `John Doe`
- Email: `admin@cedarschool.com`
- Password: `password123`
- Confirm: `password123`

**Step 3 - Subdomain:**
- Subdomain: `cedarschool`
- Click: **Create School**

**Success!** 🎉

### 2. **Login to Dashboard**

Visit: **http://localhost:3000/login**

Credentials:
- Email: `admin@cedarschool.com`
- Password: `password123`

Click: **Sign In**

**You're in!** 🎯

---

## 🎨 What You Can See

### **Pages Built:**
- ✅ Landing page (http://localhost:3000)
- ✅ Login (http://localhost:3000/login)
- ✅ Register (http://localhost:3000/register)
- ✅ Dashboard (http://localhost:3000/dashboard)

### **Features:**
- ✅ Multi-step registration wizard
- ✅ Firebase authentication
- ✅ Protected routes (can't access dashboard without login)
- ✅ Mobile-responsive design
- ✅ Role-based navigation
- ✅ Stats cards
- ✅ Quick actions

---

## 📊 View Your Data

**Firebase Emulator UI:** http://127.0.0.1:4000

**Check:**
- **Firestore** tab → See your school, admin user, and term
- **Authentication** tab → See your admin account

---

## 🛠️ Commands

```bash
# Already running
npm run dev              # http://localhost:3000

# Start in new terminal
npm run emulator        # http://127.0.0.1:4000

# Stop emulator (if needed)
pkill -f firebase

# Reset emulator data (start fresh)
rm -rf emulator-data
```

---

## 🎯 Next Features to Build

- [ ] Student management (CRUD)
- [ ] Teachers management
- [ ] Classes & Subjects
- [ ] Score entry
- [ ] Result generation
- [ ] PDF export

---

## 📚 Documentation

- **PHASE7_COMPLETE.md** - Detailed testing guide
- **SETUP_COMPLETE.md** - Project overview
- **README.md** - Setup instructions
- **/docs/** - BMAD methodology documents

---

## 🐛 Troubleshooting

**Can't access dashboard?**
- Make sure you're logged in
- Try: http://localhost:3000/login

**Emulator errors?**
1. Check emulator is running: http://127.0.0.1:4000
2. Restart: `pkill -f firebase && npm run emulator`

**Page not loading?**
1. Refresh browser (Cmd+R / Ctrl+R)
2. Check console for errors (F12)

---

## ✅ Success Checklist

Test these in order:

1. [ ] Visit localhost:3000 (landing page loads)
2. [ ] Start Firebase Emulator (new terminal)
3. [ ] Register a school (complete 4 steps)
4. [ ] Check Emulator UI (data appears)
5. [ ] Login with your credentials
6. [ ] Dashboard loads successfully
7. [ ] Logout works
8. [ ] Can't access dashboard when logged out

**All working?** You're ready to build more features! 🚀

---

**Questions?** Check **PHASE7_COMPLETE.md** for detailed testing scenarios.
