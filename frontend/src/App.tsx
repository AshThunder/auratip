// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import type { SmartAccount } from "viem/account-abstraction";
import type { P256Credential } from "viem/account-abstraction";
import {
  loadCredential,
  clearCredential,
  registerPasskey,
  loginPasskey,
  getSmartAccount,
  publicClient,
  bundlerClient,
} from "./circle";
import { USDC_ADDRESS, USDC_DECIMALS } from "./config";
import { formatUnits, encodeFunctionData } from "viem";
import Dashboard from "./pages/Dashboard";
import TipPage from "./pages/TipPage";
import WidgetEditor from "./pages/WidgetEditor";
import SetupGuide from "./pages/SetupGuide";
import TipHistory from "./pages/TipHistory";

const erc20BalanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export default function App() {
  const [credential, setCredential] = useState<P256Credential | null>(null);
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [status, setStatus] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isTipPage = location.pathname.startsWith('/tip/');
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const claimFaucet = async () => {
    if (!account) return;
    try {
      setFaucetLoading(true);
      setStatus("Redirecting to official Circle Faucet...");
      
      // Native USDC on Arc Testnet restricts the minter role.
      // Redirect users to the official faucet to fund their smart account.
      window.open(`https://faucet.circle.com/?address=${account.address}`, '_blank');
      
      setTimeout(() => {
        setStatus("Please complete the captcha on the official Faucet to receive test USDC.");
      }, 1000);
      
      setTimeout(() => setStatus(""), 6000);
    } catch (err: any) {
      console.error(err);
      setStatus("Faucet redirection failed: " + (err.message || ""));
      setTimeout(() => setStatus(""), 4000);
    } finally {
      setFaucetLoading(false);
    }
  };

  const copyAddress = () => {
    if (!account) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Restore session on mount
  useEffect(() => {
    const saved = loadCredential();
    if (saved) {
      setCredential(saved);
      initAccount(saved);
    }
  }, []);

  // Track scroll position for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const initAccount = async (cred: P256Credential) => {
    try {
      setStatus("Loading wallet...");
      const acct = await getSmartAccount(cred);
      setAccount(acct);
      setStatus("");
      fetchBalance(acct.address);
    } catch (err: any) {
      setStatus("Failed to load wallet: " + (err.message || ""));
    }
  };

  const fetchBalance = async (address: `0x${string}`) => {
    try {
      const raw = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20BalanceAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setBalance(formatUnits(raw, USDC_DECIMALS));
    } catch {
      setBalance("0.00");
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) return;
    try {
      setStatus("Creating passkey...");
      const cred = await registerPasskey(username.trim());
      setCredential(cred);
      await initAccount(cred);
      setShowAuthModal(false);
      setUsername("");
    } catch (err: any) {
      setStatus("Registration failed: " + (err.message || ""));
    }
  };

  const handleLogin = async () => {
    try {
      setStatus("Authenticating...");
      const cred = await loginPasskey();
      setCredential(cred);
      await initAccount(cred);
      setShowAuthModal(false);
    } catch (err: any) {
      setStatus("Login failed: " + (err.message || ""));
    }
  };

  const handleLogout = () => {
    clearCredential();
    setCredential(null);
    setAccount(null);
    setBalance("0.00");
    setStatus("");
    navigate("/");
  };

  const refreshBalance = useCallback(() => {
    if (account) fetchBalance(account.address);
  }, [account]);

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex flex-col font-body-md text-body-md overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      {/* ─── Header / Navbar ─── */}
      {!isTipPage && (
        <header
          id="main-header"
          className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-padding-mobile md:px-container-padding-desktop h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 transition-all duration-300 ${
            isScrolled ? "shadow-md" : "shadow-sm"
          }`}
        >
          <Link to="/" className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              paid
            </span>
            <span className="text-headline-lg font-headline-lg font-bold text-primary tracking-tight">
              AuraTip
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              className={`hover:text-primary transition-colors text-label-md font-label-md ${
                location.pathname === "/" ? "text-primary font-bold" : "text-on-surface-variant font-medium"
              }`}
              to="/"
            >
              Dashboard
            </Link>
            <Link
              className={`hover:text-primary transition-colors text-label-md font-label-md ${
                location.pathname === "/history" ? "text-primary font-bold" : "text-on-surface-variant font-medium"
              }`}
              to="/history"
            >
              Tip History
            </Link>
            <Link
              className={`hover:text-primary transition-colors text-label-md font-label-md ${
                location.pathname === "/widget" ? "text-primary font-bold" : "text-on-surface-variant font-medium"
              }`}
              to="/widget"
            >
              Widget Editor
            </Link>
            <Link
              className={`hover:text-primary transition-colors text-label-md font-label-md ${
                location.pathname === "/setup" ? "text-primary font-bold" : "text-on-surface-variant font-medium"
              }`}
              to="/setup"
            >
              How to setup
            </Link>
          </nav>

          <div className="flex items-center">
            {account ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={copyAddress}
                  title="Click to copy wallet address"
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-surface-container hover:bg-surface-variant/70 border border-outline-variant/30 rounded-full px-2.5 sm:px-4 py-1.5 text-label-sm font-label-sm text-on-surface-variant cursor-pointer transition-all active:scale-95 group"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="hidden sm:inline">
                    {copied ? "Address Copied!" : `${account.address.slice(0, 6)}…${account.address.slice(-4)}`}
                  </span>
                  <span className="sm:hidden">
                    {copied ? "Copied!" : `${account.address.slice(0, 4)}…${account.address.slice(-2)}`}
                  </span>
                  {!copied && (
                    <span className="material-symbols-outlined text-[14px] opacity-60 group-hover:opacity-100 transition-opacity">
                      content_copy
                    </span>
                  )}
                  <span className="mx-0.5 sm:mx-1 opacity-30">|</span>
                  <span>{parseFloat(balance).toFixed(2)}<span className="hidden sm:inline"> USDC</span></span>
                </button>
                <button
                  className="text-on-surface-variant hover:text-error hover:scale-105 transition-all text-label-md font-label-md font-semibold active:scale-95 px-1 py-1"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  className="text-on-surface-variant hover:text-primary transition-colors text-label-md font-label-md font-semibold"
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthModal(true);
                  }}
                >
                  Login
                </button>
                <button
                  className="bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all duration-150 ease-in-out px-4 py-2 rounded-lg text-label-md font-label-md font-semibold flex items-center gap-2 active:scale-95 shadow-[0_4px_12px_-2px_rgba(0,92,170,0.3)]"
                  onClick={() => {
                    setAuthMode("register");
                    setShowAuthModal(true);
                  }}
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ─── Main Content ─── */}
      <main className={`flex-grow ${!isTipPage ? "pt-16" : ""}`}>
        {/* ─── Status Bar ─── */}
        {status && (
          <div className="max-w-6xl mx-auto px-container-padding-mobile md:px-container-padding-desktop">
            <div
              className={`status-bar ${status.toLowerCase().includes("fail") || status.toLowerCase().includes("error") ? "error" : ""}`}
            >
              {status}
            </div>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                account={account}
                balance={balance}
                setStatus={setStatus}
                refreshBalance={refreshBalance}
                onLogin={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                openDepositModal={() => setShowDepositModal(true)}
              />
            }
          />
          <Route
            path="/tip/:address"
            element={
              <TipPage
                account={account}
                setStatus={setStatus}
                refreshBalance={refreshBalance}
                onLogin={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                openDepositModal={() => setShowDepositModal(true)}
              />
            }
          />
          <Route
            path="/widget"
            element={
              <WidgetEditor
                account={account}
                balance={balance}
                setStatus={setStatus}
                refreshBalance={refreshBalance}
                onLogin={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                openDepositModal={() => setShowDepositModal(true)}
              />
            }
          />
          <Route
            path="/setup"
            element={
              <SetupGuide
                account={account}
                balance={balance}
                setStatus={setStatus}
                refreshBalance={refreshBalance}
                onLogin={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                openDepositModal={() => setShowDepositModal(true)}
              />
            }
          />
          <Route
            path="/history"
            element={
              <TipHistory
                account={account}
                balance={balance}
                setStatus={setStatus}
                refreshBalance={refreshBalance}
                onLogin={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                openDepositModal={() => setShowDepositModal(true)}
              />
            }
          />
        </Routes>
      </main>

      {/* ─── Footer ─── */}
      {!isTipPage && (
        <footer className="w-full mt-auto px-container-padding-mobile md:px-container-padding-desktop flex flex-col md:flex-row justify-between items-center gap-gutter bg-surface-container-highest dark:bg-inverse-surface py-12 border-t border-outline-variant/50">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-label-md font-label-md font-bold text-on-surface flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                paid
              </span>
              AuraTip
            </span>
            <p className="text-body-md font-body-md text-primary dark:text-primary-fixed-dim text-sm">
              © 2026 AuraTip Financial. Powered by USDC.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 mt-4 md:mt-0">
            <Link
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed transition-colors text-label-sm font-label-sm"
              to="/"
            >
              Dashboard
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed transition-colors text-label-sm font-label-sm"
              to="/history"
            >
              Tip History
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed transition-colors text-label-sm font-label-sm"
              to="/widget"
            >
              Widget Editor
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed transition-colors text-label-sm font-label-sm"
              to="/setup"
            >
              Setup Guide
            </Link>
            <a
              className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-primary-fixed transition-colors text-label-sm font-label-sm flex items-center gap-0.5"
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noreferrer"
            >
              <span>Arcscan Explorer</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </nav>
        </footer>
      )}

      {/* ─── Auth Modal ─── */}
      {showAuthModal && (
        <div
          className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm flex justify-center items-center z-[100] p-container-padding-mobile"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="glass-panel bg-white/95 w-full max-w-[440px] rounded-2xl p-8 flex flex-col shadow-2xl border border-white/60 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {authMode === "register" ? (
              <>
                <h3 className="text-[24px] font-bold text-on-surface mb-2">Create Account</h3>
                <p className="text-label-md font-label-md text-on-surface-variant mb-6">
                  Register with a passkey — no passwords, no seed phrases.
                </p>
                <div className="mb-6">
                  <label className="block text-label-sm font-label-sm font-semibold text-on-surface-variant mb-2">
                    Display Name
                  </label>
                  <input
                    className="w-full h-11 px-4 border border-outline-variant/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-body-md font-body-md bg-white/50"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alice"
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  />
                </div>
                <button
                  className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all py-3 rounded-xl text-label-md font-label-md font-bold shadow-md active:scale-95 flex items-center justify-center gap-2"
                  onClick={handleRegister}
                >
                  <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                  Register with Passkey
                </button>
                <p className="text-label-sm font-label-sm text-on-surface-variant mt-6 text-center">
                  Already have an account?{" "}
                  <button
                    className="text-primary font-bold hover:underline ml-1"
                    onClick={() => setAuthMode("login")}
                  >
                    Login
                  </button>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-[24px] font-bold text-on-surface mb-2">Welcome Back</h3>
                <p className="text-label-md font-label-md text-on-surface-variant mb-6">
                  Authenticate with your passkey to continue.
                </p>
                <button
                  className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all py-3 rounded-xl text-label-md font-label-md font-bold shadow-md active:scale-95 flex items-center justify-center gap-2 mb-4"
                  onClick={handleLogin}
                >
                  <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                  Login with Passkey
                </button>
                <p className="text-label-sm font-label-sm text-on-surface-variant mt-4 text-center">
                  Don't have an account?{" "}
                  <button
                    className="text-primary font-bold hover:underline ml-1"
                    onClick={() => setAuthMode("register")}
                  >
                    Sign Up
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Deposit USDC Modal ─── */}
      {showDepositModal && account && (
        <div
          className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm flex justify-center items-center z-[100] p-container-padding-mobile"
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="glass-panel bg-white/95 dark:bg-surface-container w-full max-w-[480px] rounded-2xl p-6 md:p-8 flex flex-col shadow-2xl border border-white/60 dark:border-outline-variant/30 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[28px]">account_balance_wallet</span>
                <h3 className="text-[24px] font-bold text-on-surface">Deposit USDC</h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Current Balance */}
            <div className="bg-surface-container-highest/30 dark:bg-surface-container-high/40 rounded-xl p-4 mb-6 border border-outline-variant/20 flex justify-between items-center">
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant font-medium">Your Smart Wallet Balance</p>
                <h4 className="text-headline-md font-headline-md font-black text-on-background mt-1">
                  ${parseFloat(balance).toFixed(2)} <span className="text-[14px] text-on-surface-variant font-semibold">USDC</span>
                </h4>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-[32px]">payments</span>
            </div>

            {/* Smart Wallet Address & QR Code */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-label-sm font-label-sm font-bold text-on-surface-variant mb-2">
                  Smart Wallet Address
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-grow font-mono text-[13px] bg-surface-container-highest/50 dark:bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2.5 break-all text-on-surface text-center selection:bg-primary/20">
                    {account.address}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(account.address);
                      setStatus("Wallet Address copied to clipboard!");
                      setTimeout(() => setStatus(""), 2000);
                    }}
                    className="p-3 bg-surface border border-outline-variant/30 rounded-xl text-primary hover:bg-primary/5 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center"
                    title="Copy Address"
                  >
                    <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  </button>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center py-4 bg-surface dark:bg-surface-container-high border border-outline-variant/20 rounded-2xl relative overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${account.address}`}
                  alt="Wallet QR Code"
                  className="w-40 h-40 object-contain rounded-lg shadow-sm border border-outline-variant/10 p-1 bg-white"
                />
                <p className="text-[12px] font-medium text-on-surface-variant mt-3 text-center">
                  Scan this QR code to deposit USDC directly on Arc Testnet
                </p>
              </div>
            </div>

            {/* Gasless Faucet Button */}
            <div className="space-y-3">
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-label-sm font-label-sm font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">water_drop</span>
                    Testnet Faucet
                  </span>
                  <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    Sponsored (Gasless)
                  </span>
                </div>
                <button
                  disabled={faucetLoading}
                  onClick={claimFaucet}
                  className={`w-full py-3 px-4 rounded-xl text-label-md font-label-md font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    faucetLoading
                      ? "bg-surface-container text-outline cursor-not-allowed opacity-55"
                      : "bg-primary text-on-primary hover:bg-primary/95 cursor-pointer"
                  }`}
                >
                  {faucetLoading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                      Go to Official Circle Faucet
                    </>
                  )}
                </button>
              </div>

              {/* Warning/Info Notice */}
              <div className="bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400/90 rounded-xl p-3 border border-amber-500/20 text-[12px] font-medium leading-relaxed flex gap-2">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">warning</span>
                <span>
                  This wallet runs on the <strong>Arc Testnet</strong>. Sending mainnet assets will result in permanent loss. Use the Faucet button above to top up instantly.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

