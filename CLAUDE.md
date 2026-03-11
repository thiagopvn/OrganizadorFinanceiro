# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Unity Finance** — A cross-platform PWA for couples' financial management (iOS/Android via browser install). Built with React + Firebase, deployed to Firebase Hosting.

## Commands

```bash
npm run dev      # Start dev server on port 5173
npm run build    # Production build to dist/
npm run preview  # Preview production build

# Deploy to Firebase Hosting
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Architecture

```
src/
├── App.jsx                    # Routes + global modals
├── main.jsx                   # Entry point (React + BrowserRouter)
├── index.css                  # Tailwind directives + custom utilities
├── lib/
│   ├── firebase.js            # Firebase init + all CRUD helpers + real-time listeners
│   ├── store.js               # Zustand global store (auth, transactions, budgets, goals, UI state)
│   └── utils.js               # Formatters, categories, demo data, helpers
├── components/
│   ├── ui.jsx                 # Reusable UI kit (Button, Card, Input, Modal, BottomSheet, ProgressBar, Toggle, etc.)
│   ├── charts.jsx             # Chart.js wrappers (DonutChart, BarChart, LineChart, Sparkline)
│   └── layout.jsx             # AppLayout (bottom nav + outlet), PageHeader
└── pages/
    ├── auth/                  # Login, Register
    ├── home/                  # Dashboard (main tab)
    ├── history/               # Transaction history + calendar + search
    ├── analytics/             # Reports, charts, insights
    ├── budgets/               # Goals & budget list, EditGoal form
    ├── profile/               # Settings, Privacy
    ├── transactions/          # TransactionDetail (chat), AddTransaction (numpad)
    ├── split/                 # Split & Subscriptions, SplitConfig, Settlement
    ├── cards/                 # Wallet & card management
    ├── investments/           # Couple's portfolio
    ├── travel/                # Travel mode multi-currency
    ├── notifications/         # Notification center
    ├── export/                # Export statements (PDF/CSV/OFX)
    ├── wrapped/               # Annual retrospective
    └── modals/                # SuccessModal, AchievementModal
```

## Tech Stack

- **React 18** + **Vite 5** (SPA)
- **Tailwind CSS 3** (utility-first, dark mode via class)
- **Firebase**: Auth, Cloud Firestore, Storage, Hosting
- **Zustand** for state management
- **Chart.js** + react-chartjs-2 for visualizations
- **Framer Motion** for animations
- **lucide-react** for icons
- **date-fns** with pt-BR locale for dates

## Design System

- **Primary color**: Orange (`brand-500` = `#f97316`), using Tailwind's orange palette
- **Layout**: Mobile-first, `max-w-md mx-auto`, bottom tab navigation with center FAB
- **Cards**: `rounded-2xl shadow-sm border` (white light / slate-800 dark)
- **Dark mode**: Toggle via `document.documentElement.classList.toggle('dark')`, persisted in localStorage
- **All UI text**: Brazilian Portuguese (pt-BR) — maintain this in all screens

## Key Patterns

- **Demo mode**: App works without Firebase auth using `DEMO_*` data from `utils.js`. When `isDemo` is true in the store, no Firestore calls are made.
- **Real-time sync**: `subscribeToTransactions/Budgets/Goals/Subscriptions` in `firebase.js` use Firestore `onSnapshot` for live updates.
- **Offline-first**: Store detects online/offline state; UI shows `OfflineBanner` when disconnected.
- **Bottom sheet pattern**: `AddTransaction` renders inside a global `BottomSheet` controlled by `showAddTransaction` in the store.
- **Progress bar colors**: Auto-calculated from percentage — green (<60%), amber (60-80%), orange (80-100%), red (>100%).

## Firestore Schema

Collections under `couples/{coupleId}/`: `transactions`, `budgets`, `goals`, `subscriptions`, `settlements`, `cards`, `investments`. Access restricted to `partnerIds` array members. See `firestore.rules`.

## Firebase Config

Project: `organizador-financeiro-a431c` (Blaze plan). Config is in `src/lib/firebase.js`.
