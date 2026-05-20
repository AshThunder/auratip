// Constants and configuration for the TipJar app

export const CLIENT_KEY = import.meta.env.VITE_CLIENT_KEY as string;
export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL as string;
export const FACTORY_ADDRESS = (import.meta.env.VITE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Arc Testnet USDC (ERC-20, 6 decimals)
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as `0x${string}`;
export const USDC_DECIMALS = 6;
