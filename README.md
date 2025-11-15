# School Portal - Multi-Tenant School Management System

Modern, mobile-first school management platform built with Next.js 15, React 19, Firebase, and Tailwind CSS v4.

## 🚀 Quick Start

### 1. Start Firebase Emulator (Terminal 1)

```bash
npm run emulator
```

This starts the Firebase Emulator UI at **http://127.0.0.1:4000**

### 2. Start Next.js Dev Server (Terminal 2)

```bash
npm run dev
```

Visit: **http://localhost:3000**

## 📁 Key Files

- `app/page.tsx` - Landing page
- `lib/firebase/client.ts` - Firebase client SDK (connects to emulator)
- `lib/firebase/admin.ts` - Firebase Admin SDK (server-side)
- `firestore.rules` - Security rules (tenant isolation)
- `components/ui/` - Reusable UI components
- `hooks/useAuth.ts` - Authentication hook
- `types/index.ts` - TypeScript type definitions

## 🔥 Firebase Emulator

All Firebase services run locally - no production setup needed!

- **Firestore**: http://127.0.0.1:8080
- **Auth**: http://127.0.0.1:9099
- **Storage**: http://127.0.0.1:9199
- **UI Dashboard**: http://127.0.0.1:4000

Data persists in `./emulator-data` directory.

## 🎨 Tech Stack

- **Next.js 15** - React Server Components, App Router
- **React 19** - Latest React features
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **Firebase** - Backend (Firestore, Auth, Storage)

## 🏗️ Architecture

### Multi-Tenancy
- Single database with `tenant_id` column
- Firestore Security Rules enforce isolation
- Custom auth claims for role + tenantId

### Collections
- `tenants` - Schools
- `users` - Admins, teachers, parents
- `students` - Student records
- `scores` - Assessment scores
- `results` - Report cards

## 📝 Commands

```bash
npm run dev        # Start Next.js dev server
npm run emulator   # Start Firebase emulators
npm run build      # Build for production
```

## 📚 Documentation

See `/docs` folder:
- Business Analysis
- Architecture Design
- UX/UI Design System

Built with ❤️ following the BMAD methodology
