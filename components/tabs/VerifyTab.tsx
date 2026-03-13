"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { sha256, examDataToString } from "@/lib/crypto";
import {
  ShieldCheck, ShieldAlert, RefreshCw, Zap, ChevronDown,
  CheckCircle2, XCircle, Hash, Link, Database, LinkIcon,
} from "lucide-react";

interface StudentDiff {
  studentId: string;
  version: number;
  txHash: string;
  chainMarks: string;
  dbMarks: string;
  chainHash: string;
  dbHash: string;
  match: boolean;
}

const GRADE_BG: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-200 text-red-900",
};

function truncateHash(h: string, n = 14) {
  return h.length > n ? h.slice(0, 10) + "" + h.slice(-6) : h;
}

function MarkPill({
  mark, tampered = false, neutral = false,
}: { mark: string; tampered?: boolean; neutral?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ring-1
        ${tampered
          ? "bg-red-200 text-red-900 ring-red-500"
          : neutral
          ? "bg-slate-100 text-slate-600 ring-transparent"
          : (GRADE_BG[mark] ?? "bg-slate-100 text-slate-600") + " ring-transparent"
        }`}
    >
      {mark || "?"}
    </span>
  );
}

export default function VerifyTab() {
  const { exams, versions, simulateTampering, resetTampering } = useStore();

  const [selectedId, setSelectedId] = useState<string>("");
  const [overallChainHash, setOverallChainHash] = useState<string>("");
  const [overallDbHash, setOverallDbHash] = useState<string>("");
  const [entryDiffs, setEntryDiffs] = useState<StudentDiff[]>([]);
  const [computing, setComputing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const exam = exams.find((e) => e.examId === selectedId);

  useEffect(() => {
    if (!selectedId) {
      setOverallChainHash(""); setOverallDbHash(""); setEntryDiffs([]);
      return;
    }

    let cancelled = false;
    setComputing(true);
    setExpandedRow(null);

    // Snapshot everything synchronously before going async
    const snap = exams.find((e) => e.examId === selectedId);
    const snapVersions = versions;

    if (!snap) {
      setComputing(false);
      return;
    }

    async function run() {
      if (!snap) return;

      const diffs: StudentDiff[] = await Promise.all(
        snap.blockchainStudents.map(async (chainStu) => {
          const dbStu = snap.dbStudents.find((s) => s.studentId === chainStu.studentId);
          const dbMarks = dbStu?.marks ?? "";

          const [chainHash, dbHash] = await Promise.all([
            sha256(`${chainStu.studentId}:${chainStu.marks}`),
            sha256(`${chainStu.studentId}:${dbMarks}`),
          ]);

          const stuVersions = snapVersions.filter(
            (v) => v.examId === snap.examId && v.studentId === chainStu.studentId
          );
          const latestV = stuVersions.length
            ? stuVersions.reduce((a, b) => (a.version > b.version ? a : b))
            : null;

          return {
            studentId: chainStu.studentId,
            version: latestV?.version ?? 1,
            txHash: latestV?.txHash ?? snap.txHash,
            chainMarks: chainStu.marks,
            dbMarks,
            chainHash,
            dbHash,
            match: chainHash === dbHash,
          };
        })
      );

      const [ch, dh] = await Promise.all([
        sha256(examDataToString(snap.examId, snap.blockchainStudents)),
        sha256(examDataToString(snap.examId, snap.dbStudents)),
      ]);

      if (!cancelled) {
        setEntryDiffs(diffs);
        setOverallChainHash(ch);
        setOverallDbHash(dh);
        setComputing(false);
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, exams, versions]);

  const overallMatch = !!(overallChainHash && overallDbHash && overallChainHash === overallDbHash);
  const tamperedCount = entryDiffs.filter((d) => !d.match).length;

  // Build per-student tampered set for panel highlighting
  const tamperedStudentIds = new Set(entryDiffs.filter((d) => !d.match).map((d) => d.studentId));

  return (
    <div className="space-y-6">
      {/*  Exam selector  */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label className="text-sm font-semibold text-slate-700 shrink-0">Select Exam</label>
        <div className="relative flex-1 max-w-md">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value=""> Choose an exam </option>
            {exams.map((e) => (
              <option key={e.examId} value={e.examId}>
                {e.examId}  {e.examName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {exam && (
        <>
          {/*  Overall integrity banner  */}
          <div
            className={`rounded-2xl px-6 py-4 border ${
              computing
                ? "bg-slate-50 border-slate-200"
                : overallMatch
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {computing ? (
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin shrink-0" />
              ) : overallMatch ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-base font-bold ${
                  computing ? "text-slate-500" : overallMatch ? "text-emerald-800" : "text-red-800"
                }`}>
                  {computing
                    ? "Computing hashes"
                    : overallMatch
                    ? "EXAM INTEGRITY VERIFIED  ALL RECORDS MATCH"
                    : ` INTEGRITY VIOLATION  ${tamperedCount} TAMPERED ENTR${tamperedCount === 1 ? "Y" : "IES"} DETECTED`}
                </p>
                <p className="text-xs mt-0.5 text-slate-500">
                  {computing
                    ? "Running per-entry + overall SHA-256 via Web Crypto API"
                    : overallMatch
                    ? "Overall exam hash and all individual student entry hashes match the blockchain."
                    : "The overall exam hash differs from blockchain. Tampered rows are highlighted in the Database Record below."}
                </p>
              </div>
            </div>

            {!computing && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <HashBox label="Blockchain (overall SHA-256)" value={overallChainHash} tone="chain" />
                <HashBox
                  label="Database (overall SHA-256)"
                  value={overallDbHash}
                  tone={overallMatch ? "ok" : "bad"}
                  mismatch={!overallMatch}
                />
              </div>
            )}
          </div>

          {/*  Two-panel record view  */}
          {!computing && entryDiffs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/*  Blockchain Record Panel  */}
              <RecordPanel
                title="Blockchain Record"
                subtitle={`Block #${exam.blockNumber.toLocaleString()} · TX: ${truncateHash(exam.txHash)}`}
                icon={<LinkIcon className="w-4 h-4 text-white" />}
                headerClass="bg-blue-700"
                borderClass="border-blue-200"
                rows={entryDiffs.map((d) => ({
                  studentId: d.studentId,
                  version: d.version,
                  txHash: d.txHash,
                  marks: d.chainMarks,
                  tampered: false, // blockchain is always authoritative
                }))}
              />

              {/*  Database Record Panel  */}
              <RecordPanel
                title="Database Record"
                subtitle="Current live state in database"
                icon={<Database className="w-4 h-4 text-white" />}
                headerClass={overallMatch ? "bg-emerald-700" : "bg-red-700"}
                borderClass={overallMatch ? "border-emerald-200" : "border-red-300"}
                rows={entryDiffs.map((d) => ({
                  studentId: d.studentId,
                  version: d.version,
                  txHash: d.txHash,
                  marks: d.dbMarks,
                  tampered: !d.match,
                  chainMarks: d.chainMarks, // for per-mark diff highlighting
                }))}
              />
            </div>
          )}

          {/*  Per-entry audit table  */}
          {!computing && entryDiffs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Per-Entry Hash Audit
                <span className="ml-2 text-xs font-normal text-slate-400">
                  click a row to expand cryptographic proof
                </span>
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="px-4 py-2.5 text-left">Student</th>
                      <th className="px-3 py-2.5 text-center">Ver.</th>
                      <th className="px-3 py-2.5 text-left hidden md:table-cell">Entry TX</th>
                      <th className="px-3 py-2.5 text-left">Blockchain Marks</th>
                      <th className="px-3 py-2.5 text-left">Database Marks</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entryDiffs.map((d) => (
                      <EntryRow
                        key={d.studentId}
                        diff={d}
                        expanded={expandedRow === d.studentId}
                        onToggle={() => setExpandedRow(expandedRow === d.studentId ? null : d.studentId)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/*  Computing skeleton  */}
          {computing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {["Blockchain Record", "Database Record"].map((t) => (
                <div key={t} className="rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="h-12 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-2">
                        <div className="w-20 h-5 bg-slate-100 rounded" />
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((j) => <div key={j} className="w-5 h-5 bg-slate-100 rounded" />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/*  Action buttons  */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => simulateTampering(exam.examId)}
              className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Simulate Tampering
            </button>
            {!overallMatch && !computing && (
              <button
                onClick={() => resetTampering(exam.examId)}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Blockchain State
              </button>
            )}
          </div>
        </>
      )}

      {!selectedId && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <ShieldCheck className="mx-auto w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Select an exam above to verify its integrity</p>
        </div>
      )}
    </div>
  );
}

//  HashBox 

function HashBox({
  label, value, tone, mismatch,
}: { label: string; value: string; tone: "chain" | "ok" | "bad"; mismatch?: boolean }) {
  const bg =
    tone === "chain" ? "bg-blue-900/5 border-blue-200"
    : tone === "ok" ? "bg-emerald-900/5 border-emerald-200"
    : "bg-red-50 border-red-300";
  const text =
    tone === "chain" ? "text-blue-900"
    : tone === "ok" ? "text-emerald-900"
    : "text-red-900";
  return (
    <div className={`rounded-xl border px-3 py-2 ${bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Hash className={`w-3 h-3 ${text}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${text}`}>{label}</span>
        {mismatch && <span className="ml-auto text-[10px] font-bold text-red-600">MISMATCH</span>}
      </div>
      <p className={`font-mono text-[10px] break-all ${text}`}>{value || ""}</p>
    </div>
  );
}

//  RecordPanel 

interface RecordRow {
  studentId: string;
  version: number;
  txHash: string;
  marks: string;
  tampered: boolean;
  chainMarks?: string; // only provided for DB panel to highlight per-mark diffs
}

function RecordPanel({
  title, subtitle, icon, headerClass, borderClass, rows,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  headerClass: string;
  borderClass: string;
  rows: RecordRow[];
}) {
  return (
    <div className={`rounded-2xl border ${borderClass} overflow-hidden`}>
      <div className={`${headerClass} px-5 py-3 flex items-center gap-2`}>
        {icon}
        <div>
          <p className="font-bold text-white text-sm">{title}</p>
          <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="bg-white divide-y divide-slate-100">
        {rows.map((row) => {
          const markList = row.marks.split(",");
          const chainList = row.chainMarks ? row.chainMarks.split(",") : null;
          return (
            <div
              key={row.studentId}
              className={`flex items-center gap-2.5 px-4 py-2.5 ${row.tampered ? "bg-red-50" : ""}`}
            >
              {/* Student ID + version */}
              <div className="flex flex-col w-24 shrink-0">
                <span className="font-mono text-[11px] font-semibold text-slate-700 truncate">
                  {row.studentId}
                </span>
                <span className={`inline-flex items-center self-start rounded-full px-1.5 py-0 text-[9px] font-bold leading-4 mt-0.5
                  ${row.version > 1 ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                  v{row.version}
                </span>
              </div>

              {/* Marks */}
              <div className="flex flex-wrap gap-1 flex-1">
                {markList.map((m, i) => {
                  // Highlight pill if this is the DB panel and this mark differs from chain
                  const isDiff = chainList ? chainList[i] !== m : false;
                  return (
                    <MarkPill key={i} mark={m} tampered={isDiff} neutral={!isDiff && !row.tampered} />
                  );
                })}
              </div>

              {/* Tampered badge */}
              {row.tampered && (
                <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white">
                  <XCircle className="w-2.5 h-2.5" /> TAMPERED
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

//  EntryRow (audit table) 

function EntryRow({
  diff, expanded, onToggle,
}: { diff: StudentDiff; expanded: boolean; onToggle: () => void }) {
  const rowBg = diff.match ? "" : "bg-red-50/60";
  const chainParts = diff.chainMarks.split(",");
  const dbParts = diff.dbMarks.split(",");

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-slate-50 transition-colors ${rowBg}`}
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
          {diff.studentId}
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none
            ${diff.version > 1 ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            v{diff.version}
          </span>
        </td>
        <td className="px-3 py-2.5 hidden md:table-cell">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
            <Link className="w-3 h-3 shrink-0" />
            {truncateHash(diff.txHash)}
          </span>
        </td>
        {/* Blockchain Marks */}
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {chainParts.map((m, i) => (
              <MarkPill key={i} mark={m} neutral />
            ))}
          </div>
        </td>
        {/* Database Marks  highlight only the differing pills */}
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {dbParts.map((m, i) => (
              <MarkPill key={i} mark={m} tampered={chainParts[i] !== m} neutral={chainParts[i] === m} />
            ))}
          </div>
        </td>
        <td className="px-4 py-2.5 text-center">
          {diff.match ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> MATCH
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              <XCircle className="w-3 h-3" /> TAMPERED
            </span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className={rowBg}>
          <td colSpan={6} className="px-4 pb-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1">
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Blockchain Entry Hash</p>
                <p className="font-mono text-[10px] break-all text-blue-900">{diff.chainHash}</p>
                <p className="text-[10px] text-blue-600 font-mono">TX: {diff.txHash}</p>
              </div>
              <div className={`rounded-lg border p-3 space-y-1 ${diff.match ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-300"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${diff.match ? "text-emerald-700" : "text-red-700"}`}>
                  Database Entry Hash
                </p>
                <p className={`font-mono text-[10px] break-all ${diff.match ? "text-emerald-900" : "text-red-900"}`}>
                  {diff.dbHash}
                </p>
                {!diff.match && (
                  <p className="text-[10px] font-bold text-red-700"> Hash does not match blockchain record</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

