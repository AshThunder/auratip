import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  balance: string;
  jarBalance: string;
  withdrawFunds: () => void;
  openDepositModal?: () => void;
}

export default function Sidebar({ balance, jarBalance, withdrawFunds, openDepositModal }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = (
    <>
      <Link
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 mx-2 text-label-md font-label-md transition-all hover:translate-x-1 duration-200 ${
          currentPath === "/"
            ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
            : "text-on-surface-variant dark:text-outline hover:bg-surface-variant/50"
        }`}
        to="/"
      >
        <span className="material-symbols-outlined">dashboard</span>
        Dashboard
      </Link>
      <Link
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 mx-2 text-label-md font-label-md transition-all hover:translate-x-1 duration-200 ${
          currentPath === "/history"
            ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
            : "text-on-surface-variant dark:text-outline hover:bg-surface-variant/50"
        }`}
        to="/history"
      >
        <span className="material-symbols-outlined">payments</span>
        Tip History
      </Link>
      <Link
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 mx-2 text-label-md font-label-md transition-all hover:translate-x-1 duration-200 ${
          currentPath === "/widget"
            ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
            : "text-on-surface-variant dark:text-outline hover:bg-surface-variant/50"
        }`}
        to="/widget"
      >
        <span className="material-symbols-outlined">edit_note</span>
        Widget Editor
      </Link>
      <Link
        className={`flex items-center gap-3 rounded-xl px-4 py-3 mx-2 text-label-md font-label-md transition-all hover:translate-x-1 duration-200 ${
          currentPath === "/setup"
            ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
            : "text-on-surface-variant dark:text-outline hover:bg-surface-variant/50"
        }`}
        to="/setup"
        onClick={() => setIsOpen(false)}
      >
        <span className="material-symbols-outlined">help_outline</span>
        How to setup
      </Link>
    </>
  );

  return (
    <>
      {/* Mobile Burger Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 md:hidden bg-primary text-on-primary w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Open Navigation Menu"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      {/* Mobile Sidebar Slide-Over Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          ></div>
          
          {/* Drawer Panel */}
          <aside className="fixed top-0 left-0 h-full w-72 bg-surface dark:bg-surface-container z-50 shadow-2xl border-r border-outline-variant/30 flex flex-col py-6 md:hidden animate-enter">
            <div className="flex justify-between items-center px-6 mb-6">
              <span className="text-headline-sm font-headline-sm font-bold text-primary">TipJar Hub</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-6 mb-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-variant mb-4 overflow-hidden border-2 border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_circle
                </span>
              </div>
              <h2 className="text-headline-sm font-headline-sm font-black text-primary">Creator Hub</h2>
              <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
                USDC Balance: ${parseFloat(balance).toFixed(2)}
              </p>
              <button
                disabled={parseFloat(jarBalance) <= 0}
                onClick={() => {
                  withdrawFunds();
                  setIsOpen(false);
                }}
                className={`mt-4 w-full text-label-md font-label-md py-2.5 rounded-xl transition-all duration-150 active:scale-95 ${
                  parseFloat(jarBalance) <= 0
                    ? "bg-surface-container text-outline cursor-not-allowed opacity-55"
                    : "bg-primary-container text-on-primary-container hover:opacity-90 shadow-sm cursor-pointer"
                }`}
              >
                Withdraw
              </button>
              <button
                onClick={() => {
                  if (openDepositModal) openDepositModal();
                  setIsOpen(false);
                }}
                className="mt-2 w-full bg-primary text-on-primary hover:bg-primary/95 text-label-md font-label-md py-2.5 rounded-xl transition-all duration-150 active:scale-95 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Deposit USDC
              </button>
            </div>

            <nav className="flex flex-col gap-1 flex-grow">
              {navLinks}
            </nav>
          </aside>
        </>
      )}

      {/* Desktop Persistent Sidebar (md and up) */}
      <aside className="hidden md:flex w-64 bg-surface-container-low dark:bg-surface-container-lowest border-r border-outline-variant/20 flex-col py-6 flex-shrink-0 min-h-[calc(100vh-64px)]">
        <div className="px-6 mb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-variant mb-4 overflow-hidden border-2 border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_circle
            </span>
          </div>
          <h2 className="text-headline-sm font-headline-sm font-black text-primary">Creator Hub</h2>
          <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
            USDC Balance: ${parseFloat(balance).toFixed(2)}
          </p>
          <button
            disabled={parseFloat(jarBalance) <= 0}
            onClick={withdrawFunds}
            className={`mt-4 w-full text-label-md font-label-md py-2 rounded-lg transition-all duration-150 active:scale-95 ${
              parseFloat(jarBalance) <= 0
                ? "bg-surface-container text-outline cursor-not-allowed opacity-55"
                : "bg-primary-container text-on-primary-container hover:opacity-90 shadow-sm cursor-pointer"
            }`}
          >
            Withdraw
          </button>
          <button
            onClick={openDepositModal}
            className="mt-2 w-full bg-primary text-on-primary hover:bg-primary/95 text-label-md font-label-md py-2 rounded-lg transition-all duration-150 active:scale-95 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Deposit USDC
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          {navLinks}
        </nav>
      </aside>
    </>
  );
}
