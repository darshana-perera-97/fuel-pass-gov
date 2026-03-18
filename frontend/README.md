# Fuel Pass Gov – Frontend

**Framework: React.js · Styling: Tailwind CSS**

Frontend for the Sri Lanka National Fuel Quota System. Reimplemented from the reference app in `../nextjs`.

## Stack

- **React** (React 18) – UI framework
- **Tailwind CSS** – styling (utility-first CSS)
- **Vite** – build and dev server
- **TypeScript** – type checking
- **React Router DOM** – client-side routing
- **Radix UI** – accessible primitives (Tabs, Dialog, Select, Progress, Label)
- **Leaflet / react-leaflet** – map and station markers
- **qrcode.react** – QR code generation
- **Sonner** – toasts
- **Lucide React** – icons

## Scripts

- **`npm start`** or **`npm run dev`** – start dev server (Vite, default port 5173)
- **`npm run build`** – TypeScript check + production build (Vite)
- **`npm run preview`** – serve production build locally

This project uses **Vite only** (no Webpack). If you see an error about `html-webpack-plugin` or Webpack, you are likely running a different tool (e.g. Create React App). Use the commands above from the `frontend` folder. For a clean install: remove `node_modules` and `package-lock.json`, then run `npm install` again.

## Routes

| Path | Page |
|------|------|
| `/` | Landing (map, demo credentials, how it works) |
| `/login` | Login (Admin, Station, Customer, Operator tabs) |
| `/customer/register` | Customer registration (NIC/OTP → details → vehicle) |
| `/customer/dashboard` | Customer dashboard (QR, quota, map, transactions) |
| `/admin` | Admin (quotas, stations, special vehicles, credentials) |
| `/station` | Station manager (stock, operators, incoming deliveries) |
| `/pump-operator` | Pump operator (scan QR, dispense fuel) |

## Project layout

- `src/App.tsx` – Router and Toaster
- `src/pages/` – Route components
- `src/components/` – FuelMap, DemoCredentials, HelpButton, QuotaGuide
- `src/components/ui/` – Button, Card, Input, Tabs, Dialog, Select, etc.
- `src/data/mockData.ts` – Stations, quotas, provinces
- `src/lib/utils.ts` – `cn()` (clsx + tailwind-merge)
