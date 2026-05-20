# AuraTip Smart Contracts

The smart contracts for AuraTip are built using Foundry and deployed on the Arc Testnet. 
The core functionality is split into a Factory contract (`TipJarFactory`) and individual `TipJar` proxy/clone contracts for each creator.

## Core Contracts

- **`TipJarFactory.sol`**: A permissionless factory that uses the EIP-1167 Minimal Proxy pattern to deploy new `TipJar` instances at deterministic addresses. It maintains a registry of all deployed TipJars.
- **`TipJar.sol`**: The actual tipping contract for each creator. It natively integrates with the Circle USDC stablecoin, allowing supporters to tip using `transferFrom`. It emits events containing the tipper, amount, and an optional custom message.

## Setup & Deployment

### Dependencies

Install the necessary libraries (Forge Standard Library):
```bash
forge install
```

### Testing

Run the exhaustive test suite which includes both unit tests and fork tests against the Arc Testnet environment:

```bash
forge test -vvv
```

### Deploying to Arc Testnet

Create a `.env` file containing your deployment keys:
```
PRIVATE_KEY=your_deployer_key
```

Execute the deployment script:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://testnet.arcscan.app/rpc --private-key $PRIVATE_KEY --broadcast
```

### Verifying on ArcScan

To verify your smart contracts on the block explorer after deployment:
```bash
forge verify-contract <address> <contract> --verifier blockscout --verifier-url https://testnet.arcscan.app/api
```
