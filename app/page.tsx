"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Shield, Upload, ShieldCheck, PenLine, Clock, ChevronRight, List } from "lucide-react";
import { ToastContainer } from "@/components/ToastContainer";

// Lazy-load tabs to avoid SSR issues with Web Crypto API
const UploadTab = dynamic(() => import("@/components/tabs/UploadTab"), { ssr: false });
const VerifyTab = dynamic(() => import("@/components/tabs/VerifyTab"), { ssr: false });
const UpdateTab = dynamic(() => import("@/components/tabs/UpdateTab"), { ssr: false });
const HistoryTab = dynamic(() => import("@/components/tabs/HistoryTab"), { ssr: false });
const MarkListTab = dynamic(() => import("@/components/tabs/MarkListTab"), { ssr: false });

const TABS = [
  {
    id: "upload",
    label: "Upload Mark List",
    shortLabel: "Upload",
    icon: Upload,
    description: "Upload a CSV and commit exam marks to the blockchain",
  },
  {
    id: "verify",
    label: "Verify Integrity",
    shortLabel: "Verify",
    icon: ShieldCheck,
    description: "Compare database records against blockchain state via SHA-256",
  },
  {
    id: "update",
    label: "Update Mark",
    shortLabel: "Update",
    icon: PenLine,
    description: "Record a corrected mark as a new immutable version on chain",
  },
  {
    id: "history",
    label: "Version History",
    shortLabel: "History",
    icon: Clock,
    description: "Full audit trail of every change for any student record",
  },
  {
    id: "marklist",
    label: "Full Mark List",
    shortLabel: "Marks",
    icon: List,
    description: "Complete student mark list with per-question grade distribution",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/20 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold leading-tight tracking-tight">
              MR Mark List Integrity System
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-blue-200 hidden sm:block">Blockchain Demo · Prototype</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex overflow-x-auto -mb-px" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 sm:px-5 py-3.5 text-sm font-medium border-b-2 transition-colors shrink-0
                    ${
                      isActive
                        ? "border-blue-700 text-blue-800"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-700" : "text-slate-400"}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Kerala PSC</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-700 font-medium">{active.label}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{active.label}</h2>
          <p className="text-sm text-slate-500 mt-1">{active.description}</p>
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
          {activeTab === "upload" && <UploadTab />}
          {activeTab === "verify" && <VerifyTab />}
          {activeTab === "update" && <UpdateTab />}
          {activeTab === "history" && <HistoryTab />}
          {activeTab === "marklist" && <MarkListTab />}
        </div>
      </main>

      {/* ── Toasts ─────────────────────────────────────────────────────── */}
      <ToastContainer />
    </div>
  );
}
