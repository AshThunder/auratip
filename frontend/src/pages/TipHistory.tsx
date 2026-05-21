// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { parseAbi, formatUnits, encodeFunctionData } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "../config";
import { publicClient, bundlerClient } from "../circle";
import Sidebar from "./Sidebar";

const factoryAbi = parseAbi([
  "function getTipJar(address creator) external view returns (address)"
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

interface TipHistoryProps {
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

function formatDateTime(timestamp: bigint) {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function TipHistory({ account, balance, setStatus, refreshBalance, onLogin, openDepositModal }: TipHistoryProps) {
  const [tipJarAddress, setTipJarAddress] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [totalReceived, setTotalReceived] = useState("0.00");
  const [jarBalance, setJarBalance] = useState("0.00");
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [copyState, setCopyState] = useState<{ [key: string]: boolean }>({});

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
        args: [0n, 100n],
      }) as Tip[];
      
      setTips(fetchedTips);
    } catch (err) {
      console.error("Failed to load jar details", err);
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
      refreshBalance();
      if (tipJarAddress) {
        await loadJarDetails(tipJarAddress);
      }
    } catch (err: any) {
      setStatus("Withdrawal failed: " + (err.message || ""));
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopyState(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyState(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Process tips (filter & sort)
  const filteredTips = tips.filter(tip => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      tip.tipper.toLowerCase().includes(query) ||
      tip.message.toLowerCase().includes(query)
    );
  });

  const sortedTips = [...filteredTips].sort((a, b) => {
    if (sortBy === "newest") {
      return Number(b.timestamp - a.timestamp);
    }
    if (sortBy === "oldest") {
      return Number(a.timestamp - b.timestamp);
    }
    if (sortBy === "highest") {
      return Number(b.amount - a.amount);
    }
    if (sortBy === "lowest") {
      return Number(a.amount - b.amount);
    }
    return 0;
  });

  // Calculate tip history stats
  const totalTipsCount = filteredTips.length;
  const filteredVolume = filteredTips.reduce((sum, tip) => sum + Number(formatUnits(tip.amount, USDC_DECIMALS)), 0);
  const averageTipAmount = totalTipsCount > 0 ? (filteredVolume / totalTipsCount) : 0;

  return (
    <div className="flex-grow min-h-[calc(100vh-64px)]">
      {!account ? (
        <div className="max-w-md mx-auto my-20 p-8 rounded-2xl border border-outline-variant/30 bg-surface text-center shadow-lg">
          <span className="material-symbols-outlined text-[64px] text-primary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
            account_balance_wallet
          </span>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-2">Connect Your Wallet</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mb-6">
            Please log in or register with your passkey to view your Tip History.
          </p>
          <button
            onClick={onLogin}
            className="bg-primary text-on-primary hover:bg-primary/90 px-6 py-3 rounded-xl text-label-md font-label-md font-semibold transition-all active:scale-95 cursor-pointer shadow-md"
          >
            Connect Creator Wallet
          </button>
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
                  <h1 className="text-headline-xl font-headline-xl text-on-background">Tip History</h1>
                  <p className="text-body-md font-body-md text-on-surface-variant mb-2">
                    Review and search all support tips received by your AuraTip.
                  </p>
                  
                  {tipJarAddress && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopyText(tipJarAddress, "jar")}
                        className="group flex items-center gap-1.5 bg-surface-variant/40 dark:bg-surface-variant/25 text-primary hover:bg-surface-variant/80 dark:hover:bg-surface-variant/40 px-3 py-1 rounded-full text-label-sm font-label-sm transition-all active:scale-95 cursor-pointer"
                        title="Click to copy Deployed AuraTip Contract Address"
                      >
                        <span className="material-symbols-outlined text-[14px]">payments</span>
                        <span>AuraTip: {tipJarAddress.slice(0, 6)}...{tipJarAddress.slice(-4)}</span>
                        <span className="material-symbols-outlined text-[14px] opacity-60 group-hover:opacity-100 transition-opacity">
                          {copyState["jar"] ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!tipJarAddress ? (
                /* No Contract Deployed State */
                <div className="p-8 md:p-12 rounded-3xl border border-outline-variant/30 bg-surface/50 text-center shadow-sm max-w-xl mx-auto my-12">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      campaign
                    </span>
                  </div>
                  <h3 className="text-headline-md font-headline-md text-on-surface mb-3">No Deployed AuraTip</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant mb-6">
                    You need to deploy your AuraTip contract on the Arc Testnet first before you can receive tips and review history.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all px-6 py-3 rounded-xl text-label-md font-label-md font-semibold active:scale-95 cursor-pointer shadow-md"
                  >
                    Go to Dashboard & Deploy
                    <span className="material-symbols-outlined text-md">arrow_forward</span>
                  </Link>
                </div>
              ) : (
                /* Main History view */
                <div className="space-y-gutter">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-surface border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-md font-label-md text-on-surface-variant font-medium">Total Tips Received</span>
                        <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
                      </div>
                      <div>
                        <div className="text-headline-lg font-headline-lg font-black text-on-background">
                          {tips.length}
                        </div>
                        <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                          Lifetime tips accrued
                        </p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-surface border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-md font-label-md text-on-surface-variant font-medium">Total Tipped Volume</span>
                        <span className="material-symbols-outlined text-tertiary text-[24px]">monetization_on</span>
                      </div>
                      <div>
                        <div className="text-headline-lg font-headline-lg font-black text-on-background">
                          ${parseFloat(totalReceived).toFixed(2)} <span className="text-body-md font-bold text-on-surface-variant">USDC</span>
                        </div>
                        <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                          Accrued support value
                        </p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-surface border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-md font-label-md text-on-surface-variant font-medium">Average Tip Size</span>
                        <span className="material-symbols-outlined text-secondary text-[24px]">monitoring</span>
                      </div>
                      <div>
                        <div className="text-headline-lg font-headline-lg font-black text-on-background">
                          ${averageTipAmount.toFixed(2)} <span className="text-body-md font-bold text-on-surface-variant">USDC</span>
                        </div>
                        <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                          Based on filtered values
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Search by address or message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface-container-highest/40 dark:bg-surface-container-highest border border-outline-variant/40 rounded-xl py-2.5 pl-11 pr-4 text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <span className="text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Sort By:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-surface-container-highest/40 dark:bg-surface-container-highest border border-outline-variant/40 rounded-xl px-3 py-2 text-body-sm font-body-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Tip</option>
                        <option value="lowest">Lowest Tip</option>
                      </select>
                    </div>
                  </div>

                  {/* List / Table of tips */}
                  <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
                    {sortedTips.length === 0 ? (
                      <div className="p-12 text-center">
                        <span className="material-symbols-outlined text-[48px] text-outline mb-3">search_off</span>
                        <h4 className="text-title-lg font-title-lg text-on-surface mb-1">No tips match search</h4>
                        <p className="text-body-md font-body-md text-on-surface-variant">
                          Try searching for a different keyword or checking details.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-surface-container/50 border-b border-outline-variant/20">
                              <th className="px-6 py-4 text-label-md font-label-md text-on-surface-variant font-bold">Tipper Address</th>
                              <th className="px-6 py-4 text-label-md font-label-md text-on-surface-variant font-bold">Amount</th>
                              <th className="px-6 py-4 text-label-md font-label-md text-on-surface-variant font-bold">Message</th>
                              <th className="px-6 py-4 text-label-md font-label-md text-on-surface-variant font-bold">Timestamp</th>
                              <th className="px-6 py-4 text-label-md font-label-md text-on-surface-variant font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {sortedTips.map((tip, idx) => {
                              const uniqueKey = `${tip.tipper}-${tip.timestamp}-${idx}`;
                              const amountFormatted = parseFloat(formatUnits(tip.amount, USDC_DECIMALS)).toFixed(2);
                              
                              return (
                                <tr key={uniqueKey} className="hover:bg-surface-container-low/20 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-body-md font-medium text-on-surface break-all">
                                        {tip.tipper.slice(0, 6)}...{tip.tipper.slice(-6)}
                                      </span>
                                      <button
                                        onClick={() => handleCopyText(tip.tipper, uniqueKey)}
                                        className="text-on-surface-variant hover:text-primary p-1 rounded hover:bg-surface-variant/40 transition-all active:scale-90 cursor-pointer"
                                        title="Copy tipper address"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          {copyState[uniqueKey] ? "check" : "content_copy"}
                                        </span>
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-label-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                      ${amountFormatted} USDC
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 max-w-xs">
                                    {tip.message ? (
                                      <p className="text-body-md font-body-md text-on-surface line-clamp-2 italic">
                                        "{tip.message}"
                                      </p>
                                    ) : (
                                      <span className="text-body-sm font-body-sm text-outline italic">
                                        No message left
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-body-md font-body-md text-on-surface">
                                        {formatTimeAgo(tip.timestamp)}
                                      </span>
                                      <span className="text-body-xs font-body-xs text-on-surface-variant">
                                        {formatDateTime(tip.timestamp)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <a
                                      href={`https://testnet.arcscan.app/address/${tip.tipper}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:text-primary-container px-3 py-1.5 rounded-lg hover:bg-primary/5 text-label-sm font-label-sm transition-all"
                                    >
                                      <span>Explorer</span>
                                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
