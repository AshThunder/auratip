// @ts-nocheck
import { useState, useEffect } from "react";
import { parseAbi, formatUnits, encodeFunctionData } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "../config";
import { publicClient, bundlerClient } from "../circle";
import Sidebar from "./Sidebar";


const factoryAbi = parseAbi([
  "function getTipJar(address creator) external view returns (address)",
  "function createTipJar(string name) external returns (address)"
]);

const tipJarAbi = parseAbi([
  "function creatorName() external view returns (string)",
  "function totalReceived() external view returns (uint256)",
  "function tipCount() external view returns (uint256)",
  "function withdraw() external",
  "function getTips(uint256 offset, uint256 limit) external view returns ((address tipper, uint256 amount, string message, uint256 timestamp)[])"
]);

const erc20Abi = parseAbi([
  "function balanceOf(address account) external view returns (uint256)"
]);

interface Tip {
  tipper: string;
  amount: bigint;
  message: string;
  timestamp: bigint;
}
interface DashboardProps {
  account: any;
  balance: string;
  setStatus: (s: string) => void;
  refreshBalance: () => void;
  onLogin: () => void;
  openDepositModal?: () => void;
}

function formatTimeAgo(timestamp: bigint) {
  const seconds = Math.floor(Date.now() / 1000 - Number(timestamp));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard({ account, balance, setStatus, refreshBalance, onLogin, openDepositModal }: DashboardProps) {
  const [tipJarAddress, setTipJarAddress] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [totalReceived, setTotalReceived] = useState("0.00");
  const [jarBalance, setJarBalance] = useState("0.00");
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [mockAmount, setMockAmount] = useState("5.00");

  useEffect(() => {
    if (account) {
      checkTipJar();
    } else {
      setTipJarAddress(null);
      setTips([]);
      setTotalReceived("0.00");
      setJarBalance("0.00");
    }
  }, [account]);

  const checkTipJar = async () => {
    if (!account) return;
    try {
      setLoading(true);
      const address = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "getTipJar",
        args: [account.address],
      }) as string;

      if (address && address !== "0x0000000000000000000000000000000000000000") {
        setTipJarAddress(address);
        await loadJarDetails(address);
      } else {
        setTipJarAddress(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadJarDetails = async (jarAddr: string) => {
    try {
      const name = await publicClient.readContract({
        address: jarAddr,
        abi: tipJarAbi,
        functionName: "creatorName",
      }) as string;
      setCreatorName(name);

      const received = await publicClient.readContract({
        address: jarAddr,
        abi: tipJarAbi,
        functionName: "totalReceived",
      }) as bigint;
      setTotalReceived(formatUnits(received, USDC_DECIMALS));

      const bal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [jarAddr],
      }) as bigint;
      setJarBalance(formatUnits(bal, USDC_DECIMALS));

      const fetchedTips = await publicClient.readContract({
        address: jarAddr,
        abi: tipJarAbi,
        functionName: "getTips",
        args: [0n, 50n],
      }) as Tip[];
      
      // Sort: newest first
      const sorted = [...fetchedTips].reverse();
      setTips(sorted);
    } catch (err) {
      console.error("Failed to load jar details", err);
    }
  };

  const createTipJar = async () => {
    if (!registerName.trim() || !account) return;
    try {
      setStatus("Deploying your Tip Jar...");
      
      // Encode call to createTipJar
      const callData = {
        to: FACTORY_ADDRESS,
        data: encodeFunctionData({
          abi: factoryAbi,
          functionName: "createTipJar",
          args: [registerName.trim()],
        })
      };

      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls: [callData],
        paymaster: true,
        maxPriorityFeePerGas: 10000000000n, // 10 gwei
        maxFeePerGas: 50000000000n, // 50 gwei
      });

      setStatus("Waiting for deployment transaction...");
      await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      setStatus("Tip Jar deployed!");
      await checkTipJar();
    } catch (err: any) {
      setStatus("Failed to deploy: " + (err.message || ""));
    }
  };

  const withdrawFunds = async () => {
    if (!tipJarAddress || !account) return;
    try {
      setStatus("Withdrawing tips...");
      
      const callData = {
        to: tipJarAddress,
        data: encodeFunctionData({
          abi: tipJarAbi,
          functionName: "withdraw",
        })
      };

      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls: [callData],
        paymaster: true,
        maxPriorityFeePerGas: 10000000000n,
        maxFeePerGas: 50000000000n,
      });

      setStatus("Confirming withdraw...");
      await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      setStatus("Withdrawal successful!");
      await loadJarDetails(tipJarAddress);
      refreshBalance();
    } catch (err: any) {
      setStatus("Withdrawal failed: " + (err.message || ""));
    }
  };





  if (!account) {
    return (
      <div>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 px-container-padding-mobile md:px-container-padding-desktop hero-gradient overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-tertiary-fixed/10 rounded-full blur-3xl -z-10"></div>
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col items-start gap-6 z-10">

              <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-xl md:font-headline-xl text-on-surface max-w-2xl text-balance leading-tight">
                Support your favorite creators with USDC.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
                  Fast, gasless, and secure.
                </span>
              </h1>
              <p className="text-body-lg font-body-lg text-on-surface-variant max-w-xl">
                The next-generation financial experience for creators and fans. Instant settlements, zero hidden fees, and seamless integration with just a few lines of code.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
                <button
                  onClick={onLogin}
                  className="bg-primary text-on-primary hover:bg-primary-container transition-all px-8 py-3.5 rounded-xl text-label-md font-label-md font-bold shadow-[0_8px_20px_-4px_rgba(0,92,170,0.4)] active:scale-95 flex items-center justify-center gap-2"
                >
                  Get Started
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <a
                  href="/preview.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-transparent border border-outline text-on-surface hover:bg-surface-container transition-all px-8 py-3.5 rounded-xl text-label-md font-label-md font-semibold active:scale-95 flex items-center justify-center gap-2"
                >
                  View Demo
                </a>
              </div>
            </div>

            {/* Hero Widget Mockup */}
            <div className="relative z-10 flex justify-center lg:justify-end perspective-1000">
              <div className="glass-panel w-full max-w-[400px] rounded-2xl overflow-hidden flex flex-col transform lg:rotate-y-[-5deg] lg:rotate-x-[5deg] hover:rotate-0 transition-transform duration-500 shadow-2xl border border-white/40">
                <div className="bg-surface-container-lowest p-6 border-b border-outline-variant/20 flex flex-col items-center gap-4 relative overflow-hidden">
                  {/* Subtle glow behind avatar */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
                  <img
                    alt="Creator Profile"
                    className="w-20 h-20 rounded-full border-4 border-surface shadow-sm relative z-10 object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7HtWHAsETjSg4CZ5Mum7XTId026yGBDczXS5U9VPcj7u5fyPGTL3Trrp8eEarVpAavvWO0xfQRtnaG5nCB-smAnO8zKMZMuzWpMWhDm42sPBi4BmxxIjvw4k8vcc7xiZnR1h0ARPV8eQpiHTDYcGMuGcqguIzBc37XbFvkSvBlQDfisw3lRRKSOeyX7t4Kxva5dGOVkbTDiiRzZHP0fwEkU1k6dG-aoGZUljKF8-3be85gRwhq9REvfLJHDI65iJlovxTd3qQN-Y"
                  />
                  <div className="text-center relative z-10">
                    <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">Alex River</h3>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">Digital Artist & Educator</p>
                  </div>
                </div>
                <div className="p-6 bg-surface-bright flex flex-col gap-6">
                  <div className="flex justify-center items-end gap-1">
                    <span className="text-body-lg font-body-lg font-medium text-on-surface-variant mb-1">$</span>
                    <span className="text-headline-xl font-headline-xl text-on-surface tracking-tight">{mockAmount}</span>
                    <span className="text-label-md font-label-md font-medium text-on-surface-variant mb-1 ml-1">USDC</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all ${
                        mockAmount === "5.00"
                          ? "bg-primary/10 border border-primary/30 text-primary font-semibold"
                          : "bg-surface-container hover:bg-surface-variant text-on-surface"
                      }`}
                      onClick={() => setMockAmount("5.00")}
                    >
                      $5
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all ${
                        mockAmount === "10.00"
                          ? "bg-primary/10 border border-primary/30 text-primary font-semibold"
                          : "bg-surface-container hover:bg-surface-variant text-on-surface"
                      }`}
                      onClick={() => setMockAmount("10.00")}
                    >
                      $10
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all ${
                        mockAmount === "20.00"
                          ? "bg-primary/10 border border-primary/30 text-primary font-semibold"
                          : "bg-surface-container hover:bg-surface-variant text-on-surface"
                      }`}
                      onClick={() => setMockAmount("20.00")}
                    >
                      $20
                    </button>
                  </div>
                  <button
                    onClick={onLogin}
                    className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-3 rounded-xl text-label-md font-label-md font-bold shadow-md flex items-center justify-center gap-2 group active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">fingerprint</span>
                    Send Tip Securely
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-container-padding-mobile md:px-container-padding-desktop bg-surface-container-lowest border-t border-outline-variant/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-surface mb-4">
                Frictionless finance for the modern web
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                We've abstracted away the complexity of crypto. Your fans experience a seamless, secure checkout, while you receive instant settlements.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="glass-panel bg-surface p-8 rounded-2xl flex flex-col gap-6 group hover:shadow-lg transition-all duration-300 translate-y-0 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">fingerprint</span>
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-on-surface mb-2">Passkey Secured</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant">
                    No passwords, just FaceID or Fingerprint. Bank-grade security meets effortless user experience, reducing drop-off rates.
                  </p>
                </div>
              </div>
              {/* Feature 2 */}
              <div className="glass-panel bg-surface p-8 rounded-2xl flex flex-col gap-6 group hover:shadow-lg transition-all duration-300 translate-y-0 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-tertiary-container/10 flex items-center justify-center text-tertiary group-hover:scale-110 group-hover:bg-tertiary group-hover:text-on-tertiary transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">local_gas_station</span>
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-on-surface mb-2">Sponsored Gas</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant">
                    Zero transaction fees for fans. We handle the blockchain gas fees behind the scenes so your supporters only pay what they tip.
                  </p>
                </div>
              </div>
              {/* Feature 3 */}
              <div className="glass-panel bg-surface p-8 rounded-2xl flex flex-col gap-6 group hover:shadow-lg transition-all duration-300 translate-y-0 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-secondary-container/30 flex items-center justify-center text-on-secondary-container group-hover:scale-110 group-hover:bg-secondary group-hover:text-on-secondary transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">integration_instructions</span>
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-on-surface mb-2">Embeddable Widget</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant">
                    Add AuraTip to any site in seconds. Drop in a single line of code to render a beautiful, fully functional checkout on your own domain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="material-symbols-outlined text-primary text-[48px] animate-spin">autorenew</span>
        <p className="text-body-md font-body-md text-on-surface-variant font-medium">Loading your Dashboard details...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!tipJarAddress ? (
        <div className="max-w-6xl mx-auto px-container-padding-mobile md:px-container-padding-desktop py-12 flex justify-center">
          <div className="glass-panel bg-white/95 w-full max-w-[500px] rounded-2xl p-8 shadow-xl border border-white/60 text-center">
            <h3 className="text-[24px] font-bold text-on-surface mb-2">Setup Your Tip Jar</h3>
            <p className="text-label-md font-label-md text-on-surface-variant mb-6">
              Enter your name to deploy your personal Tip Jar smart contract on Arc Testnet.
            </p>
            <div className="mb-6 text-left">
              <label className="block text-label-sm font-label-sm font-semibold text-on-surface-variant mb-2">
                Creator Name
              </label>
              <input
                className="w-full h-11 px-4 border border-outline-variant/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-body-md font-body-md bg-white/50"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="e.g. Alice Developer"
              />
            </div>
            <button
              className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all py-3.5 rounded-xl text-label-md font-label-md font-bold shadow-md active:scale-95 flex items-center justify-center gap-2"
              onClick={createTipJar}
            >
              Deploy Tip Jar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
          <Sidebar
            balance={balance}
            jarBalance={jarBalance}
            withdrawFunds={withdrawFunds}
            openDepositModal={openDepositModal}
          />
          {/* Main Content */}


          <main className="flex-grow bg-surface-container-lowest/30 min-h-[calc(100vh-64px)] pb-24">
            <div className="max-w-7xl mx-auto p-container-padding-mobile md:p-container-padding-desktop space-y-gutter">
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-headline-xl font-headline-xl text-on-background">Overview</h1>
                  <p className="text-body-md font-body-md text-on-surface-variant mb-2">
                    Welcome back, {creatorName}! Manage your tips, track analytics, and customize your widget.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* Smart Wallet Address Badge */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(account.address);
                        setStatus("Smart Wallet Address copied to clipboard!");
                        setTimeout(() => setStatus(""), 2000);
                      }}
                      title="Click to copy Smart Wallet Address"
                      className="inline-flex items-center gap-1.5 bg-surface hover:bg-surface-container border border-outline-variant/30 px-3 py-1 rounded-full text-label-sm font-label-sm text-on-surface-variant hover:text-on-surface active:scale-95 transition-all group shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                      <span>Wallet: {account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
                      <span className="material-symbols-outlined text-[12px] opacity-40 group-hover:opacity-100 transition-opacity">content_copy</span>
                    </button>

                    {/* Tip Jar Contract Address Badge */}
                    {tipJarAddress && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tipJarAddress);
                          setStatus("Tip Jar Address copied to clipboard!");
                          setTimeout(() => setStatus(""), 2000);
                        }}
                        title="Click to copy Deployed Tip Jar Contract Address"
                        className="inline-flex items-center gap-1.5 bg-surface hover:bg-surface-container border border-outline-variant/30 px-3 py-1 rounded-full text-label-sm font-label-sm text-on-surface-variant hover:text-on-surface active:scale-95 transition-all group shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">payments</span>
                        <span>AuraTip: {tipJarAddress.slice(0, 6)}...{tipJarAddress.slice(-4)}</span>
                        <span className="material-symbols-outlined text-[12px] opacity-40 group-hover:opacity-100 transition-opacity">content_copy</span>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <a
                    href={`/tip/${account.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-outline hover:bg-surface-container transition-all px-4 py-2 rounded-lg text-label-md font-label-md font-semibold text-on-surface active:scale-95 shadow-sm"
                  >
                    View Public Page ↗
                  </a>
                </div>
              </div>

              {/* Bento Grid Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {/* Claimable Balance */}
                <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
                  <div>
                    <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
                      Claimable Balance
                    </p>
                    <h3 className="text-headline-xl font-headline-xl text-on-background">
                      ${parseFloat(jarBalance).toFixed(2)}
                    </h3>
                    <p className="text-label-sm font-label-sm text-primary mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                        check_circle
                      </span>
                      {parseFloat(jarBalance) > 0 ? "Ready for withdrawal" : "No accrued tips yet"}
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      disabled={parseFloat(jarBalance) <= 0}
                      onClick={withdrawFunds}
                      className={`text-label-md font-label-md px-6 py-3 rounded-xl w-full transition-all duration-150 flex justify-center items-center gap-2 active:scale-95 shadow-sm ${
                        parseFloat(jarBalance) <= 0
                          ? "bg-surface-container text-outline cursor-not-allowed opacity-55"
                          : "bg-primary text-on-primary hover:bg-primary-container"
                      }`}
                    >
                      <span className="material-symbols-outlined">account_balance_wallet</span>
                      Withdraw USDC
                    </button>
                  </div>
                </div>

                {/* Total Received */}
                <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                        Total Received
                      </p>
                      <span className="material-symbols-outlined text-outline-variant">trending_up</span>
                    </div>
                    <h3 className="text-headline-lg font-headline-lg text-on-background">
                      ${parseFloat(totalReceived).toFixed(2)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant/20">
                    <p className="text-label-sm font-label-sm text-on-surface-variant">
                      Lifetime earnings across all widgets.
                    </p>
                  </div>
                </div>

                {/* Tip Count */}
                <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                        Total Tips
                      </p>
                      <span className="material-symbols-outlined text-outline-variant">favorite</span>
                    </div>
                    <h3 className="text-headline-lg font-headline-lg text-on-background">
                      {tips.length}
                    </h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant/20">
                    <p className="text-label-sm font-label-sm text-on-surface-variant">
                      From supporters on-chain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bento Grid Bottom: Feed */}
              <div className="mt-gutter">
                {/* Recent Tips Feed */}
                <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-6 flex flex-col min-h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-headline-sm font-headline-sm text-on-background">Recent Tips</h2>
                    <span className="text-label-sm font-label-sm text-primary font-semibold">Feed</span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {tips.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 min-h-[300px]">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2">chat_bubble_outline</span>
                        <p className="text-label-md font-label-md text-on-surface-variant">No tips received yet.</p>
                        <p className="text-label-sm font-label-sm text-outline mt-1">Share your widget page to start receiving tips!</p>
                      </div>
                    ) : (
                      tips.map((tip, idx) => {
                        const icons = ["local_cafe", "bolt", "star", "volunteer_activism", "favorite"];
                        const colorClasses = [
                          "bg-primary-container/20 text-primary",
                          "bg-tertiary-container/20 text-tertiary",
                          "bg-secondary-container/30 text-on-secondary-container",
                          "bg-error-container/20 text-error",
                        ];
                        const icon = icons[idx % icons.length];
                        const colorClass = colorClasses[idx % colorClasses.length];

                        return (
                          <div
                            key={idx}
                            className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/20 flex gap-4 items-start hover:bg-surface-container transition-colors"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <span className="material-symbols-outlined">{icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(tip.tipper);
                                    setStatus("Tipper address copied to clipboard!");
                                    setTimeout(() => setStatus(""), 2000);
                                  }}
                                  title="Copy full tipper address"
                                  className="text-label-md font-label-md text-on-background hover:text-primary transition-colors flex items-center gap-1 group truncate cursor-pointer"
                                >
                                  {tip.tipper.slice(0, 6)}...{tip.tipper.slice(-4)}
                                  <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-60 transition-opacity">content_copy</span>
                                </button>
                                <span className="text-label-md font-label-md text-primary font-bold">
                                  +{parseFloat(formatUnits(tip.amount, USDC_DECIMALS)).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-body-md font-body-md text-on-surface-variant text-sm line-clamp-2 italic">
                                "{tip.message || "Supported the creator!"}"
                              </p>
                              <p className="text-label-sm font-label-sm text-outline mt-2">
                                {formatTimeAgo(tip.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

            </div>
          </main>
        </div>
      )}
    </div>
  );
}
