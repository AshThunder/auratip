// @ts-nocheck
import { useState, useEffect } from "react";
import { parseAbi, formatUnits } from "viem";
import { FACTORY_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "../config";
import { publicClient } from "../circle";
import Sidebar from "./Sidebar";


interface SetupGuideProps {
  account: any;
  balance: string;
  setStatus: (s: string) => void;
  refreshBalance: () => void;
  onLogin: () => void;
  openDepositModal?: () => void;
}

export default function SetupGuide({
  account,
  balance,
  setStatus,
  refreshBalance,
  onLogin,
  openDepositModal
}: SetupGuideProps) {
  const [tipJarAddress, setTipJarAddress] = useState<string | null>(null);
  const [jarBalance, setJarBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);

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
      const factoryAbi = parseAbi([
        "function getTipJar(address creator) external view returns (address)"
      ]);
      const address = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "getTipJar",
        args: [account.address],
      }) as string;

      if (address && address !== "0x0000000000000000000000000000000000000000") {
        setTipJarAddress(address);
        const erc20Abi = parseAbi([
          "function balanceOf(address account) external view returns (uint256)"
        ]);
        const bal = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }) as bigint;
        setJarBalance(formatUnits(bal, USDC_DECIMALS));
      } else {
        setTipJarAddress(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const withdrawFunds = () => {
    setStatus("Please withdraw from your Dashboard Overview page.");
    setTimeout(() => setStatus(""), 3000);
  };

  if (!account) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-headline-lg font-headline-lg font-black text-primary">Setup Guide</h2>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto mt-4 mb-8">
          Please connect your wallet to view the step-by-step guide for integration.
        </p>
        <button
          onClick={onLogin}
          className="bg-primary text-on-primary hover:bg-primary-container px-6 py-3 rounded-xl font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
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
      <main className="flex-grow bg-surface-container-lowest/30 min-h-[calc(100vh-64px)] pb-24">


        <div className="max-w-4xl mx-auto p-container-padding-mobile md:p-container-padding-desktop space-y-gutter">
          {/* Page Header */}
          <div>
            <h1 className="text-headline-xl font-headline-xl text-on-background">How to Setup AuraTip</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Follow these simple steps to start receiving gasless USDC tips from your fans directly on your website.
            </p>
          </div>

          {/* Guide Steps Container */}
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="glass-panel bg-surface border border-outline-variant/30 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-lg border border-primary/20">
                1
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-headline-sm font-bold text-on-surface mb-2">Connect Your Passkey Wallet</h3>
                <p className="text-body-md text-on-surface-variant mb-4">
                  AuraTip uses Circle Smart Accounts secured by WebAuthn Passkeys. This means your fans and you don't need seed phrases or gas tokens. You are currently connected with wallet address:
                </p>
                <div className="bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/20 inline-flex items-center gap-2 text-mono text-sm font-mono text-on-surface-variant break-all">
                  <span className="material-symbols-outlined text-[16px] flex-shrink-0">account_balance_wallet</span>
                  <span>{account.address}</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-panel bg-surface border border-outline-variant/30 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-lg border border-primary/20">
                2
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-headline-sm font-bold text-on-surface mb-2">Deploy Your AuraTip Contract</h3>
                <p className="text-body-md text-on-surface-variant mb-4">
                  Your tips are received and secured by your own deployed smart contract.
                </p>
                {tipJarAddress ? (
                  <div className="bg-success-container/10 border border-success-container/30 text-primary px-4 py-3 rounded-xl flex items-center gap-2 text-label-md font-semibold w-max max-w-full">
                    <span className="material-symbols-outlined text-green-600 flex-shrink-0">check_circle</span>
                    <span className="truncate">Your contract is deployed at: {tipJarAddress.slice(0, 10)}...{tipJarAddress.slice(-10)}</span>
                  </div>
                ) : (
                  <div className="bg-surface-container-low px-4 py-3 rounded-xl flex items-center gap-3 border border-outline-variant/20">
                    <span className="material-symbols-outlined text-error flex-shrink-0">warning</span>
                    <span className="text-body-md text-on-surface-variant">
                      You haven't deployed your contract yet. Go to the{" "}
                      <a href="/" className="text-primary font-bold hover:underline">
                        Dashboard Overview
                      </a>{" "}
                      to deploy it.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-panel bg-surface border border-outline-variant/30 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-lg border border-primary/20">
                3
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-headline-sm font-bold text-on-surface mb-2">Customize Widget Theme & Size</h3>
                <p className="text-body-md text-on-surface-variant mb-4">
                  Navigate to the Widget Editor page to match the tipping card styling to your website branding.
                </p>
                <a
                  href="/widget"
                  className="inline-flex items-center gap-2 border border-primary text-primary hover:bg-primary-container/10 transition-colors px-4 py-2 rounded-xl text-label-md font-semibold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  Open Widget Editor
                </a>
              </div>
            </div>

            {/* Step 4 */}
            <div className="glass-panel bg-surface border border-outline-variant/30 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-lg border border-primary/20">
                4
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-headline-sm font-bold text-on-surface mb-2">Embed Code in Your Website</h3>
                <p className="text-body-md text-on-surface-variant mb-4">
                  Copy the `&lt;iframe&gt;` snippet from the Widget Editor and paste it into the HTML code of your website, blog, or landing page.
                </p>
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 font-mono text-sm text-outline select-all overflow-x-auto whitespace-nowrap max-w-full">
                  {`<iframe src="${window.location.origin}/tip/${account.address}" width="400" height="480" style="border:none;"></iframe>`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
