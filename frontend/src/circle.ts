// Circle Modular Wallets SDK helpers
import { createPublicClient } from "viem";
import { createBundlerClient, toWebAuthnAccount } from "viem/account-abstraction";
import type { P256Credential, SmartAccount } from "viem/account-abstraction";
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
} from "@circle-fin/modular-wallets-core";
import { arcTestnet } from "viem/chains";
import { CLIENT_KEY, CLIENT_URL } from "./config";

// Transports
const passkeyTransport = toPasskeyTransport(CLIENT_URL, CLIENT_KEY);
const modularTransport = toModularTransport(
  `${CLIENT_URL}/arcTestnet`,
  CLIENT_KEY
);

// Clients
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: modularTransport,
});

export const bundlerClient = createBundlerClient({
  chain: arcTestnet,
  transport: modularTransport,
});

// Credential persistence
const CRED_KEY = "tipjar_credential";

export function saveCredential(cred: P256Credential) {
  localStorage.setItem(CRED_KEY, JSON.stringify(cred));
}

export function loadCredential(): P256Credential | null {
  const raw = localStorage.getItem(CRED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as P256Credential;
  } catch {
    return null;
  }
}

export function clearCredential() {
  localStorage.removeItem(CRED_KEY);
}

// Register a new passkey
export async function registerPasskey(
  username: string
): Promise<P256Credential> {
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Register,
    username,
  });
  saveCredential(credential);
  return credential;
}

// Login with existing passkey
export async function loginPasskey(): Promise<P256Credential> {
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login,
  });
  saveCredential(credential);
  return credential;
}

// Create smart account from credential
export async function getSmartAccount(
  credential: P256Credential
): Promise<SmartAccount> {
  const account = await toCircleSmartAccount({
    client: publicClient,
    owner: toWebAuthnAccount({ credential }),
  });
  return account;
}
