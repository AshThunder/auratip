# AuraTip

AuraTip is a decentralized, gasless tipping platform built on the Arc Testnet. 
It allows creators to receive USDC tips effortlessly without their fans needing to manage seed phrases or gas tokens, powered by Circle Smart Accounts and WebAuthn Passkeys.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS (Glassmorphism UI)
- **Smart Contracts:** Solidity (Foundry)
- **Blockchain:** Arc Testnet
- **Authentication & Wallets:** Circle Smart Accounts (Passkey embedded wallets)
- **Currency:** USDC

## Features

- **1-Click Tipping:** Gasless and seamless USDC transactions.
- **Passkey Security:** Built entirely without seed phrases.
- **Embeddable Widgets:** Drop-in, beautifully designed widgets for creators to integrate on their own websites, supporting rich customizations (theme, primary color, size).
- **Creator Dashboard:** Real-time tipping history and copy-to-clipboard widget generation.

## Getting Started

### Smart Contracts (Foundry)

```bash
cd contracts
forge install
forge build
forge test
```

### Frontend 

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment variables in `frontend/.env`:
```
VITE_CIRCLE_APP_ID=your_circle_app_id
VITE_RPC_URL=https://testnet.arcscan.app/rpc
```

3. Run the development server:
```bash
npm run dev
```

## Preview the Embedded Widget

An interactive preview environment is included to test widget layouts, themes, and colors.
Open `http://localhost:5173/preview.html` to explore the interactive mockups.

## License

MIT
