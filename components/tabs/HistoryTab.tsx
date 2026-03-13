"use client";
import { useState } from "react";
import { useStore, MarkVersion } from "@/lib/store";
import { ChevronDown, Clock, Hash, User, ChevronRight, Badge } from "lucide-react";

function truncate(s: string, n = 16) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function HistoryTab() {
  const { exams, versions } = useStore();

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const exam = exams.find((e) => e.examId === examId);
  const students = exam?.dbStudents ?? [];

  const studentVersions = versions
    .filter((v) => v.examId === examId && v.studentId === studentId)
    .sort((a, b) => b.version - a.version);

  const latestVersion = studentVersions[0]?.version ?? null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        View the full immutable audit trail for any student&apos;s marks.
      </p>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Exam */}
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Exam ID</label>
          <div className="relative">
            <select
              value={examId}
              onChange={(e) => { setExamId(e.target.value); setStudentId(""); setExpanded(null); }}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select exam —</option>
              {exams.map((e) => (
                <option key={e.examId} value={e.examId}>{e.examId}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Student */}
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Student ID</label>
          <div className="relative">
            <select
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setExpanded(null); }}
              disabled={!examId}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">— Select student —</option>
              {students.map((s) => (
                <option key={s.studentId} value={s.studentId}>{s.studentId}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      {studentId && studentVersions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {studentVersions.length} Version{studentVersions.length !== 1 ? "s" : ""} found
          </p>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-6 bottom-6 w-px bg-slate-200" />

            <div className="space-y-3">
              {studentVersions.map((v) => (
                <VersionRow
                  key={v.version}
                  version={v}
                  isLatest={v.version === latestVersion}
                  isExpanded={expanded === v.version}
                  onToggle={() => setExpanded(expanded === v.version ? null : v.version)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {studentId && studentVersions.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
          <p className="text-slate-400 text-sm">No version history found for this student.</p>
        </div>
      )}

      {!studentId && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Clock className="mx-auto w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Select an exam and student to view their version history</p>
        </div>
      )}
    </div>
  );
}

// ─── VersionRow ───────────────────────────────────────────────────────────────

interface VersionRowProps {
  version: MarkVersion;
  isLatest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function VersionRow({ version, isLatest, isExpanded, onToggle }: VersionRowProps) {
  return (
    <div className="relative pl-12">
      {/* Circle on timeline */}
      <div
        className={`absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 -translate-x-1/2
          ${isLatest ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"}`}
      />

      <div
        className={`rounded-2xl border transition-colors cursor-pointer
          ${isExpanded ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
        onClick={onToggle}
      >
        {/* Row header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold
                ${isLatest ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}
            >
              {isLatest && "★ "}v{version.version}
              {isLatest && " Latest"}
            </span>

            {/* Marks pills */}
            <div className="flex flex-wrap gap-1">
              {version.marks.split(",").map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-slate-100 text-slate-700"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(version.timestamp).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="border-t border-blue-200 px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <DetailRow
                icon={<Hash className="w-3.5 h-3.5 text-slate-400" />}
                label="Transaction Hash"
                value={version.txHash}
                mono
              />
              <DetailRow
                icon={<Hash className="w-3.5 h-3.5 text-slate-400" />}
                label="Block Number"
                value={`#${version.blockNumber.toLocaleString()}`}
              />
              <DetailRow
                icon={<Clock className="w-3.5 h-3.5 text-slate-400" />}
                label="Timestamp"
                value={new Date(version.timestamp).toLocaleString()}
              />
              <DetailRow
                icon={<User className="w-3.5 h-3.5 text-slate-400" />}
                label="Updated By"
                value={version.updatedBy}
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Marks String</p>
              <div className="flex flex-wrap gap-2">
                {version.marks.split(",").map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-slate-400 font-medium">Q{i + 1}</span>
                    <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-sm font-bold bg-blue-100 text-blue-800">
                      {m}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
        {icon}
        {label}
      </div>
      <p className={`text-slate-700 break-all ${mono ? "font-mono text-[10px]" : "font-medium"}`}>
        {value}
      </p>
    </div>
  );
}
