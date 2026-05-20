# AuraTip Frontend

AuraTip's frontend is a modern, high-performance React application built with Vite and Tailwind CSS. It leverages the Circle Web3 Services SDKs to provide a seamless, gasless tipping experience via embedded smart accounts.

## Tech Stack

- **Framework:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (featuring Glassmorphism, dark mode, and dynamic styling)
- **Web3 SDKs:** `@circle-fin/app-kit` / `@circle-fin/user-controlled-wallets`
- **Blockchain Interaction:** `viem` (for EVM read/write and ABIs)

## Architecture

- `src/App.tsx`: Main routing and layout wrapper, including the responsive sidebar and navigation.
- `src/pages/TipPage.tsx`: The core tipping widget interface. It dynamically adjusts its layout (Standard, Slim, Floating) and color theme based on URL query parameters.
- `src/pages/Dashboard.tsx`: Marketing homepage and developer documentation showcasing the widget capabilities.
- `src/pages/WidgetEditor.tsx`: An interactive dashboard where creators can customize their widget's appearance and generate embed codes.
- `public/preview.html`: An interactive iframe sandbox demonstrating how the widget looks embedded on a standard blog or website.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables. Copy `.env.example` to `.env` and fill in your Circle App ID:
```
VITE_CIRCLE_APP_ID=your_circle_app_id
VITE_RPC_URL=https://testnet.arcscan.app/rpc
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.
