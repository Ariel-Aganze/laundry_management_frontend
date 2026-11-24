# Laundry Management & POS — Frontend

React 19 + Vite + Tailwind CSS 4. Installable as an app (PWA), responsive on every page, light/dark mode, English and Kinyarwanda.

## Run

```bash
npm install
cp .env.example .env     # defaults work for local development
npm run dev              # http://localhost:5173
```

The backend must be running on `http://127.0.0.1:8000` (see the backend README). In development, Vite proxies `/api` and `/media` to the backend, so the app also works from a phone on the same Wi-Fi: open `http://<your-computer-ip>:5173`.

## Build for production

```bash
VITE_API_BASE_URL=https://api.your-domain.com/api/v1 npm run build   # output in dist/
```

Serve `dist/` over **HTTPS**, and redirect unknown paths to `index.html` (single-page app). The "install app" option and the offline shell only work over HTTPS (or on `localhost`). If frontend and API are on different domains, add the frontend URL to the backend `CORS_ALLOWED_ORIGINS`.

## Install on a phone

- **Android (Chrome):** open the app → menu **More** → **Install app on this device** (or Chrome's "Add to Home screen").
- **iPhone (Safari):** Share button → **Add to Home Screen**.

The app then opens full-screen from its own icon, like a native app.

## Structure

```
src/
  api/            axios client (JWT + silent refresh) and endpoint functions
  context/        Auth, Theme (light/dark/system), I18n (en / rw)
  i18n/           en.js, rw.js  ← all UI text
  components/
    layout/       AppLayout: top pills + round icon sidebar (desktop), bottom nav with labels (mobile)
    orders/       badges, record-payment, receipt (print/PDF), WhatsApp composer
    ui/           buttons, cards, inputs, modal (bottom sheet on phones), loader (washing.gif)
    charts.jsx    Recharts wrappers with a colour-blind-checked palette
  pages/          one file per screen
```

## Notes

- **Translations:** every screen reads its text from `src/i18n/en.js` and `src/i18n/rw.js`. A key missing from `rw.js` falls back to English. Please have the Kinyarwanda reviewed by a native speaker.
- **API errors:** the backend returns stable error `code`s, which are translated under `errors.codes` in both files.
- **Receipts:** browser printing uses a 58mm / 80mm / A4 layout made from the receipt snapshot. The PDF comes from the backend. Set the default paper size in Settings → Receipts.
- **Permissions:** pages for Admins only are hidden from cashiers, but the backend always enforces the rules itself.
