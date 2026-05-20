// @ts-nocheck
import { useState, useEffect } from "react";
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
  "function withdraw() external"
]);

const erc20Abi = parseAbi([
  "function balanceOf(address account) external view returns (uint256)"
]);

interface WidgetEditorProps {
  account: any;
  balance: string;
  setStatus: (s: string) => void;
  refreshBalance: () => void;
  onLogin: () => void;
  openDepositModal?: () => void;
}

export default function WidgetEditor({
  account,
  balance,
  setStatus,
  refreshBalance,
  onLogin,
  openDepositModal
}: WidgetEditorProps) {
  const [tipJarAddress, setTipJarAddress] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [jarBalance, setJarBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);

  // Widget customizer states (initialized from local storage if present)
  const [widgetTheme, setWidgetTheme] = useState(() => {
    return localStorage.getItem("tipjar_widget_theme") || "light";
  });
  const [widgetColor, setWidgetColor] = useState(() => {
    return localStorage.getItem("tipjar_widget_color") || "#00d4a4";
  });
  const [widgetSize, setWidgetSize] = useState(() => {
    return localStorage.getItem("tipjar_widget_size") || "standard";
  });

  // Persist selections
  useEffect(() => {
    localStorage.setItem("tipjar_widget_theme", widgetTheme);
  }, [widgetTheme]);

  useEffect(() => {
    localStorage.setItem("tipjar_widget_color", widgetColor);
  }, [widgetColor]);

  useEffect(() => {
    localStorage.setItem("tipjar_widget_size", widgetSize);
  }, [widgetSize]);

  useEffect(() => {
    if (account) {
      checkTipJar();
    } else {
      setTipJarAddress(null);
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
      console.error("Failed to check tip jar", err);
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

      const bal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [jarAddr],
      }) as bigint;
      setJarBalance(formatUnits(bal, USDC_DECIMALS));
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
      await loadJarDetails(tipJarAddress);
      refreshBalance();
    } catch (err: any) {
      setStatus("Withdrawal failed: " + (err.message || ""));
    }
  };

  const getEmbedCode = () => {
    if (!account) return "Connect wallet to generate embed code.";
    if (widgetSize === "floating") {
      return `<iframe src="${window.location.origin}/tip/${account.address}?theme=${widgetTheme}&color=${encodeURIComponent(widgetColor)}&size=floating" width="360" height="520" style="position: fixed; bottom: 24px; right: 24px; border: none; z-index: 999999; background: transparent;" title="${creatorName || 'TipJar'}"></iframe>`;
    }
    return `<iframe src="${window.location.origin}/tip/${account.address}?theme=${widgetTheme}&color=${encodeURIComponent(widgetColor)}&size=${widgetSize}" width="${widgetSize === 'slim' ? '320' : '400'}" height="480" style="border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: rgba(0, 0, 0, 0.05) 0 4px 6px;" title="${creatorName || 'TipJar'}"></iframe>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setStatus("Embed code copied to clipboard!");
    setTimeout(() => setStatus(""), 3000);
  };

  // Logged-out layout state redirect
  if (!account) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-headline-lg font-headline-lg font-black text-primary">Creator Widget Editor</h2>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto mt-4 mb-8">
          Please connect your wallet to access your customizer panel and generate embed codes.
        </p>
        <button
          onClick={onLogin}
          className="bg-primary text-on-primary hover:bg-primary-container px-6 py-3 rounded-xl font-semibold shadow-md active:scale-95 transition-all"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      <Sidebar
        balance={balance}
        jarBalance={jarBalance}
        withdrawFunds={withdrawFunds}
        openDepositModal={openDepositModal}
      />
      {/* Main Content Area */}


      <main className="flex-grow bg-surface-container-lowest/30 min-h-[calc(100vh-64px)] pb-24">
        <div className="max-w-7xl mx-auto p-container-padding-mobile md:p-container-padding-desktop space-y-gutter">
          {/* Header */}
          <div>
            <h1 className="text-headline-xl font-headline-xl text-on-background">Widget Editor</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Customize the look and dimensions of your public tipping card, then copy the embed code below to display it on your website.
            </p>
          </div>

          {!tipJarAddress && !loading ? (
            <div className="glass-panel bg-surface rounded-xl border border-outline-variant/30 p-8 text-center max-w-xl mx-auto shadow-md">
              <span className="material-symbols-outlined text-[48px] text-primary mb-4">settings_suggest</span>
              <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface mb-2">Tip Jar Required</h2>
              <p className="text-body-md font-body-md text-on-surface-variant mb-6">
                You need to set up and deploy your Tip Jar smart contract first before configuring widget styling.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-container transition-all px-6 py-3 rounded-xl text-label-md font-label-md font-semibold active:scale-95 shadow-md"
              >
                Go to Dashboard Overview
              </a>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-sm p-0 flex flex-col lg:flex-row h-auto lg:h-[600px] overflow-hidden">
              {/* Customizer Controls (Left Side) */}
              <div className="p-6 lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-outline-variant/20">
                <div className="mb-6">
                  <h2 className="text-headline-sm font-headline-sm text-on-background flex items-center gap-2">
                    <span className="material-symbols-outlined">tune</span>
                    Widget Customizer
                  </h2>
                </div>
                
                <div className="space-y-6 flex-grow overflow-y-auto pr-1">
                  {/* Theme Selector */}
                  <div>
                    <label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider block mb-3">
                      Theme
                    </label>
                    <div className="flex gap-2 bg-surface-container-low p-1 rounded-lg w-max border border-outline-variant/20">
                      <button
                        className={`px-4 py-2 rounded-md text-label-md font-label-md flex items-center gap-2 transition-all ${
                          widgetTheme === "light"
                            ? "bg-surface text-on-background shadow-sm font-semibold"
                            : "text-on-surface-variant hover:bg-surface-variant/50"
                        }`}
                        onClick={() => setWidgetTheme("light")}
                      >
                        <span className="material-symbols-outlined text-sm">light_mode</span>
                        Light
                      </button>
                      <button
                        className={`px-4 py-2 rounded-md text-label-md font-label-md flex items-center gap-2 transition-all ${
                          widgetTheme === "dark"
                            ? "bg-surface text-on-background shadow-sm font-semibold"
                            : "text-on-surface-variant hover:bg-surface-variant/50"
                        }`}
                        onClick={() => setWidgetTheme("dark")}
                      >
                        <span className="material-symbols-outlined text-sm">dark_mode</span>
                        Dark
                      </button>
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider block mb-3">
                      Size
                    </label>
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant/30 text-on-background text-body-md font-body-md rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                      value={widgetSize}
                      onChange={(e) => setWidgetSize(e.target.value)}
                    >
                      <option value="standard">Standard (400px)</option>
                      <option value="slim">Slim (320px)</option>
                      <option value="wide">Wide (100%)</option>
                      <option value="floating">Floating Button & Popover</option>
                    </select>
                  </div>

                  {/* Accent Color Picker */}
                  <div>
                    <label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider block mb-3">
                      Accent Color
                    </label>
                    <div className="flex gap-3 items-center">
                      {[
                        { name: "Blue", hex: "#005caa" },
                        { name: "Green", hex: "#10b981" },
                        { name: "Purple", hex: "#8b5cf6" },
                        { name: "Rose", hex: "#f43f5e" },
                      ].map((color) => (
                        <button
                          key={color.hex}
                          style={{ backgroundColor: color.hex }}
                          className={`w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center ${
                            widgetColor.toLowerCase() === color.hex.toLowerCase()
                              ? "ring-2 ring-offset-2 ring-primary scale-105"
                              : "opacity-80 hover:opacity-100"
                          }`}
                          onClick={() => setWidgetColor(color.hex)}
                        >
                          {widgetColor.toLowerCase() === color.hex.toLowerCase() && (
                            <span className="material-symbols-outlined text-white text-sm">check</span>
                          )}
                        </button>
                      ))}
                      
                      {/* Custom Color Input */}
                      <div className="relative w-8 h-8 rounded-full border border-outline border-dashed hover:bg-surface-container transition-colors flex items-center justify-center cursor-pointer overflow-hidden">
                        <span className="material-symbols-outlined text-sm text-outline pointer-events-none">add</span>
                        <input
                          type="color"
                          value={widgetColor}
                          onChange={(e) => setWidgetColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Embed Code Card */}
                <div className="mt-6 pt-6 border-t border-outline-variant/20">
                  <label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">
                    Embed Code
                  </label>
                  <div className="relative">
                    <textarea
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg p-3 text-label-sm font-label-sm text-outline font-mono h-20 resize-none outline-none focus:border-primary transition-colors"
                      readOnly
                      value={getEmbedCode()}
                    />
                    <button
                      onClick={copyEmbedCode}
                      className="absolute bottom-2 right-2 bg-surface text-on-surface-variant border border-outline-variant/30 rounded-md px-3 py-1 text-label-sm font-label-sm hover:bg-surface-container transition-colors shadow-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Widget Live Preview (Right Side) */}
              <div className="lg:w-1/2 bg-surface-container relative flex items-center justify-center p-8 glass-panel overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[64px] rounded-full transition-all duration-500"
                    style={{ backgroundColor: `${widgetColor}15` }}
                  ></div>
                </div>

                {/* Styled IFrame Container */}
                <div
                  className="w-full relative z-10 flex justify-center transition-all duration-300 animate-fade-in"
                  style={{
                    maxWidth: widgetSize === "slim" ? "320px" : widgetSize === "wide" ? "100%" : "360px"
                  }}
                >
                  <iframe
                    src={`${window.location.origin}/tip/${account?.address}?theme=${widgetTheme}&color=${encodeURIComponent(widgetColor)}&size=${widgetSize}`}
                    className={`w-full ${
                      widgetSize === "floating" ? "h-[520px]" : "h-[460px]"
                    } transition-all duration-300 ${
                      widgetSize === "floating"
                        ? "border-none shadow-none"
                        : "rounded-2xl shadow-xl border border-outline-variant/25 bg-surface"
                    }`}
                    title="Widget Preview"
                    style={{
                      backgroundColor: widgetSize === "floating" ? "transparent" : (widgetTheme === "dark" ? "#131b2e" : "#ffffff")
                    }}
                  />
                </div>

                {/* Preview Label */}
                <div className="absolute top-4 right-4 bg-surface/80 backdrop-blur-sm border border-outline-variant/20 px-3 py-1 rounded-full text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  Live Preview
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
