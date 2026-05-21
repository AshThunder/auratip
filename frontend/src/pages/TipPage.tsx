// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { parseAbi, formatUnits, parseUnits, encodeFunctionData } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "../config";
import { publicClient, bundlerClient } from "../circle";

const factoryAbi = parseAbi([
  "function getTipJar(address creator) external view returns (address)"
]);

const tipJarAbi = parseAbi([
  "function creatorName() external view returns (string)",
  "function totalReceived() external view returns (uint256)",
  "function tipCount() external view returns (uint256)",
  "function tip(uint256 amount, string calldata message) external"
]);

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)"
]);

export default function TipPage({ account, setStatus, refreshBalance, onLogin }: any) {
  const { address } = useParams<{ address: string }>();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get("theme") || "light";
  const color = searchParams.get("color") || "#00d4a4";
  const size = searchParams.get("size") || "standard";

  const [tipJarAddress, setTipJarAddress] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("Creator");
  const [totalReceived, setTotalReceived] = useState("0.00");
  const [selectedAmount, setSelectedAmount] = useState<string>("5");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tipping, setTipping] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState("0.00");
  const [txHash, setTxHash] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const isFloating = size === "floating";

  // Dynamic CSS properties
  const pageStyle = {
    "--brand-green": color,
    "--brand-green-deep": color,
    backgroundColor: isFloating ? "transparent" : "var(--surface-soft)",
    minHeight: isFloating ? "auto" : "100vh",
    padding: isFloating ? "0" : "40px 24px"
  } as React.CSSProperties;

  useEffect(() => {
    if (isFloating) {
      document.body.style.backgroundColor = "transparent";
      document.body.style.background = "transparent";
      document.documentElement.style.backgroundColor = "transparent";
      document.documentElement.style.background = "transparent";
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.style.backgroundColor = "transparent";
        rootEl.style.background = "transparent";
      }
    }
  }, [isFloating]);

  useEffect(() => {
    if (isFloating) {
      window.parent.postMessage({ type: "auratip-toggle", expanded: isExpanded }, "*");
    }
  }, [isFloating, isExpanded]);

  useEffect(() => {
    if (address) {
      fetchJarAddress();
    }
  }, [address]);

  const fetchJarAddress = async () => {
    try {
      setLoading(true);
      const jarAddr = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "getTipJar",
        args: [address as `0x${string}`],
      }) as string;

      if (jarAddr && jarAddr !== "0x0000000000000000000000000000000000000000") {
        setTipJarAddress(jarAddr);
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
      } else {
        setTipJarAddress(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTip = async () => {
    if (!account) {
      onLogin();
      return;
    }
    if (!tipJarAddress) return;

    const amount = selectedAmount === "custom" ? customAmount : selectedAmount;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setStatus("Please enter a valid amount.");
      return;
    }

    try {
      setTipping(true);
      setStatus("Preparing your sponsored tip...");

      const amountRaw = parseUnits(amount, USDC_DECIMALS);

      // Batch transaction: Approve USDC + Call tip()
      const calls = [
        {
          to: USDC_ADDRESS,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [tipJarAddress, amountRaw],
          })
        },
        {
          to: tipJarAddress,
          data: encodeFunctionData({
            abi: tipJarAbi,
            functionName: "tip",
            args: [amountRaw, message],
          })
        }
      ];

      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls,
        paymaster: true,
        maxPriorityFeePerGas: 10000000000n, // 10 gwei
        maxFeePerGas: 50000000000n, // 50 gwei
      });

      setStatus("Sending tip to " + creatorName + "...");
      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      const hash = receipt.receipt?.transactionHash || "";
      
      setTxHash(hash);
      setSuccessAmount(amount);
      setSuccess(true);
      setStatus("");
      
      // Clear forms
      setMessage("");
      setCustomAmount("");
      
      // Reload stats
      const received = await publicClient.readContract({
        address: tipJarAddress,
        abi: tipJarAbi,
        functionName: "totalReceived",
      }) as bigint;
      setTotalReceived(formatUnits(received, USDC_DECIMALS));
      refreshBalance();
    } catch (err: any) {
      setStatus("Tipping failed: " + (err.message || ""));
    } finally {
      setTipping(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + "/tip/" + address);
    setStatus("Tipping link copied to clipboard!");
    setTimeout(() => setStatus(""), 3000);
  };

  if (loading) {
    if (isFloating) {
      return (
        <div className={theme === 'dark' ? 'dark' : ''}>
          <div className="fixed bottom-4 right-4 z-50">
            <div className="w-14 h-14 rounded-full bg-surface dark:bg-surface-container border border-outline-variant/30 shadow-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] animate-spin" style={{ color }}>autorenew</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background dark:bg-inverse-surface text-on-background dark:text-on-primary-container p-4">
          <span className="material-symbols-outlined text-[48px] animate-spin mb-4" style={{ color }}>autorenew</span>
          <p className="text-body-md font-body-md font-medium text-on-surface-variant">Finding AuraTip details...</p>
        </div>
      </div>
    );
  }

  if (!tipJarAddress) {
    if (isFloating) {
      return (
        <div className={`${theme === 'dark' ? 'dark' : ''} h-screen overflow-y-auto no-scrollbar w-full relative`}>
          <div className="fixed bottom-4 right-4 z-50">
            <div className="w-14 h-14 rounded-full bg-surface dark:bg-surface-container border border-outline-variant/30 shadow-lg flex items-center justify-center text-error" title="Jar Not Found">
              <span className="material-symbols-outlined text-[24px]">error</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={`${theme === 'dark' ? 'dark' : ''} h-screen overflow-y-auto no-scrollbar w-full relative`}>
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background dark:bg-inverse-surface text-on-background dark:text-on-primary-container p-4">
          <div className="glass-panel bg-surface dark:bg-surface-container rounded-2xl p-8 max-w-[360px] text-center shadow-lg border border-outline-variant/30">
            <span className="material-symbols-outlined text-[48px] text-error mb-4">error</span>
            <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold mb-2">Jar Not Found</h2>
            <p className="text-body-md font-body-md text-on-surface-variant">This creator hasn't set up their AuraTip yet.</p>
          </div>
        </div>
      </div>
    );
  }

  const widthClass = 
    size === "slim" ? "max-w-[320px]" : 
    size === "wide" ? "max-w-[600px]" : 
    "max-w-[400px]";

  const outerWrapperClass = isFloating 
    ? "fixed bottom-20 right-4 z-50 pointer-events-auto w-[350px] shadow-2xl animate-enter" 
    : "min-h-screen w-full flex items-center justify-center p-4 bg-background dark:bg-inverse-surface transition-colors duration-300";

  const cardWrapperClass = isFloating 
    ? "w-full shadow-2xl" 
    : `w-full ${widthClass}`;

  if (success) {
    return (
      <div className={`${theme === 'dark' ? 'dark' : ''} ${isFloating ? 'w-full h-full pointer-events-none' : 'h-screen overflow-y-auto no-scrollbar w-full relative'}`} style={pageStyle}>
        {isFloating && (
          <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
            <button
              onClick={() => {
                setSuccess(false);
                setIsExpanded(false);
              }}
              style={{ backgroundColor: color }}
              className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Close"
            >
              <span className="material-symbols-outlined text-[28px] text-white">close</span>
            </button>
          </div>
        )}

        <div className={isFloating ? "fixed bottom-20 right-4 z-50 pointer-events-auto w-[350px] shadow-2xl animate-enter" : "min-h-screen w-full flex items-center justify-center p-4 bg-background dark:bg-inverse-surface transition-colors duration-300"}>
          <main className={cardWrapperClass}>
            {/* Glassmorphic Card Wrapper */}
            <div className="relative bg-surface dark:bg-surface-container rounded-[24px] overflow-hidden border border-outline-variant/30 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] backdrop-blur-md">
              {/* Confetti Pattern Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                style={{ 
                  backgroundImage: `radial-gradient(circle at 2px 2px, ${color} 1px, transparent 0)`, 
                  backgroundSize: "24px 24px" 
                }}
              ></div>
              
              {/* Header (Close intent only) */}
              <div className="flex justify-end p-4 relative z-10">
                <button 
                  aria-label="Close" 
                  onClick={() => {
                    setSuccess(false);
                    if (isFloating) setIsExpanded(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              {/* Content Canvas */}
              <div className="px-6 pb-8 flex flex-col items-center text-center relative z-10">
                {/* Success Icon */}
                <div 
                  style={{ backgroundColor: color }}
                  className="w-20 h-20 rounded-full text-white flex items-center justify-center mb-6 animate-check shadow-lg shadow-tertiary-container/20"
                >
                  <span className="material-symbols-outlined text-[40px] text-white">check</span>
                </div>
                
                {/* Primary Text */}
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Tip Sent!</h1>
                
                {/* Value */}
                <div className="font-headline-xl text-headline-xl text-primary dark:text-primary-fixed-dim mb-4 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: "32px", color }}>attach_money</span>
                  {parseFloat(successAmount).toFixed(2)} <span className="text-on-surface-variant font-body-lg text-body-lg mt-2">USDC</span>
                </div>
                
                {/* Status Pill */}
                <div className="inline-flex items-center gap-2 bg-surface-container-high dark:bg-surface-container-low px-4 py-2 rounded-full mb-8">
                  <span className="material-symbols-outlined text-primary text-[16px]" style={{ color }}>lock</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">Gasless &amp; Secured by Passkey</span>
                </div>
                
                {/* Actions Container */}
                <div className="w-full flex flex-col gap-unit">
                  {/* Primary Action */}
                  <button 
                    onClick={() => {
                      setSuccess(false);
                      if (isFloating) setIsExpanded(false);
                    }}
                    style={{ backgroundColor: color }}
                    className="w-full py-4 text-white rounded-[12px] font-label-md text-label-md hover:brightness-95 transition-colors shadow-md active:scale-95 cursor-pointer"
                  >
                    Done
                  </button>
                  
                  {/* Secondary Action Row */}
                  <div className="flex gap-unit w-full mt-2">
                    <a 
                      href={txHash ? `https://testnet.arcscan.app/tx/${txHash}` : "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 py-3 border border-outline-variant/50 text-primary dark:text-primary-fixed-dim rounded-[12px] font-label-md text-label-md hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 text-center"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>receipt_long</span>
                      View Tx
                    </a>
                    <button 
                      onClick={handleShare}
                      className="flex-1 py-3 border border-outline-variant/50 text-on-surface rounded-[12px] font-label-md text-label-md hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>share</span>
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle} className={`${theme === 'dark' ? 'dark' : ''} ${isFloating ? 'w-full h-full pointer-events-none' : 'h-screen overflow-y-auto no-scrollbar w-full relative'}`}>
      {/* Floating action button toggle */}
      {isFloating && (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ backgroundColor: color }}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer group relative animate-fade-in"
            title={isExpanded ? "Close AuraTip" : `Tip ${creatorName}`}
          >
            <span className="material-symbols-outlined text-[28px] text-white">
              {isExpanded ? "close" : "payments"}
            </span>
            {!isExpanded && (
              <span className="absolute right-16 bg-surface dark:bg-surface-container text-on-surface border border-outline-variant/30 px-3 py-1.5 rounded-lg text-label-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
                Tip {creatorName}
              </span>
            )}
          </button>
        </div>
      )}

      {(!isFloating || isExpanded) && (
        <div className={isFloating ? "fixed bottom-20 right-4 z-50 pointer-events-auto w-[350px] shadow-2xl animate-enter" : "min-h-screen w-full flex items-center justify-center p-4 bg-background dark:bg-inverse-surface transition-colors duration-300"}>
          <div className={cardWrapperClass + " bg-surface dark:bg-surface-container rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden flex flex-col"}>
            {/* Card Header */}
            <div className="bg-surface-container-low dark:bg-surface-container-low/40 p-4 flex items-center justify-between gap-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div
                  style={{ color }}
                  className="w-10 h-10 rounded-full bg-surface border border-outline-variant/30 flex items-center justify-center font-bold text-lg"
                >
                  {creatorName[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-label-md font-label-md font-bold text-on-background">Tip {creatorName}</p>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">{parseFloat(totalReceived).toFixed(2)} USDC received</p>
                </div>
              </div>
              {isFloating && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant/40 transition-colors cursor-pointer"
                  title="Collapse AuraTip"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            {/* Card Body */}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-label-sm font-label-sm font-semibold text-on-surface-variant mb-3">
                  Select Amount (USDC)
                </label>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {["2", "5", "10", "25"].map(amt => (
                    <button
                      key={amt}
                      style={selectedAmount === amt ? { borderColor: color, backgroundColor: `${color}12`, color: color } : {}}
                      className={`py-2.5 rounded-xl border text-label-md font-label-md font-semibold transition-all active:scale-95 cursor-pointer ${
                        selectedAmount === amt
                          ? "border-primary text-primary"
                          : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                      }`}
                      onClick={() => setSelectedAmount(amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    style={selectedAmount === "custom" ? { borderColor: color, backgroundColor: `${color}12`, color: color } : {}}
                    className={`col-span-2 py-2.5 rounded-xl border text-label-md font-label-md font-semibold transition-all active:scale-95 cursor-pointer ${
                      selectedAmount === "custom"
                        ? "border-primary text-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                    }`}
                    onClick={() => setSelectedAmount("custom")}
                  >
                    Custom Amount
                  </button>
                </div>

                {selectedAmount === "custom" && (
                  <div className="relative mb-2 animate-fade-in">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Enter custom amount"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-label-sm font-label-sm font-semibold text-on-surface-variant mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Say something nice..."
                  maxLength={140}
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-body-md font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface resize-none"
                />
              </div>

              <button
                onClick={handleTip}
                disabled={tipping}
                style={{ backgroundColor: color, color: '#ffffff' }}
                className="w-full py-3.5 rounded-xl font-label-md text-label-md font-bold flex justify-center items-center gap-2 mt-2 hover:brightness-95 active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                {account ? (tipping ? "Tipping..." : `Tip ${creatorName}`) : "Login to Tip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
