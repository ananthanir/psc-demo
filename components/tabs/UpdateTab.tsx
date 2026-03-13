"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ChevronDown, ArrowRight, GitCommitVertical, Loader2 } from "lucide-react";

const GRADES = ["A", "B", "C", "D", "E"];

export default function UpdateTab() {
  const { exams, versions, updateMark, addToast } = useStore();

  function latestVer(eId: string, sId: string): number {
    const vs = versions.filter((v) => v.examId === eId && v.studentId === sId);
    return vs.length ? Math.max(...vs.map((v) => v.version)) : 1;
  }

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [markIndex, setMarkIndex] = useState<number | "">("");
  const [newGrade, setNewGrade] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    before: string;
    after: string;
    version: number;
    txHash: string;
    blockNumber: number;
    timestamp: string;
  } | null>(null);

  const exam = exams.find((e) => e.examId === examId);
  const student = exam?.dbStudents.find((s) => s.studentId === studentId);
  const markCount = student ? student.marks.split(",").length : 0;
  const currentMark = student && markIndex !== "" ? student.marks.split(",")[markIndex as number] : null;

  const handleSubmit = async () => {
    if (!examId || !studentId || markIndex === "" || !newGrade) return;
    if (!student) return;

    setSubmitting(true);
    // Simulate async blockchain write
    await new Promise((r) => setTimeout(r, 800));

    const beforeMarks = student.marks;
    const version = updateMark(examId, studentId, markIndex as number, newGrade);
    setSubmitting(false);

    if (version) {
      const afterParts = beforeMarks.split(",");
      afterParts[markIndex as number] = newGrade;
      const afterMarks = afterParts.join(",");

      setResult({
        before: beforeMarks,
        after: afterMarks,
        version: version.version,
        txHash: version.txHash,
        blockNumber: version.blockNumber,
        timestamp: version.timestamp,
      });

      addToast({
        type: "success",
        title: `Mark updated — v${version.version} recorded`,
        message: `TX: ${version.txHash.slice(0, 20)}…  ·  Block #${version.blockNumber.toLocaleString()}`,
      });
    }
  };

  const handleReset = () => {
    setExamId("");
    setStudentId("");
    setMarkIndex("");
    setNewGrade("");
    setResult(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-slate-500">
        Update a student&apos;s mark and record a new immutable version on the blockchain.
      </p>

      {/* Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        {/* Exam selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Exam ID</label>
          <div className="relative">
            <select
              value={examId}
              onChange={(e) => { setExamId(e.target.value); setStudentId(""); setMarkIndex(""); setNewGrade(""); setResult(null); }}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select exam —</option>
              {exams.map((e) => (
                <option key={e.examId} value={e.examId}>{e.examId} — {e.examName}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Student ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Student ID</label>
          <div className="relative">
            <select
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setMarkIndex(""); setNewGrade(""); setResult(null); }}
              disabled={!exam}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">— Select student —</option>
              {exam?.dbStudents.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.studentId} (v{latestVer(examId, s.studentId)}) — {s.marks}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Mark index + current marks display */}
        {student && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Current Marks</label>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${
                latestVer(examId, studentId) > 1
                  ? "bg-violet-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}>
                v{latestVer(examId, studentId)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {student.marks.split(",").map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setMarkIndex(i); setNewGrade(""); setResult(null); }}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-colors
                    ${markIndex === i
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300"
                    }`}
                >
                  <span className="text-[10px] font-normal opacity-70">Q{i + 1}</span>
                  {m}
                </button>
              ))}
            </div>
            {markIndex !== "" && (
              <p className="text-xs text-blue-700 font-medium">
                Selected: Question {(markIndex as number) + 1} — current answer: <strong>{currentMark}</strong>
              </p>
            )}
          </div>
        )}

        {/* New grade */}
        {markIndex !== "" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">New Grade</label>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setNewGrade(g)}
                  disabled={g === currentMark}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors
                    ${newGrade === g
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : g === currentMark
                      ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        {newGrade && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Recording on blockchain…</>
            ) : (
              <><GitCommitVertical className="w-4 h-4" /> Submit Update</>
            )}
          </button>
        )}
      </div>

      {/* Result / diff */}
      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GitCommitVertical className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-emerald-800">
              Version {result.version} committed to blockchain
            </h3>
          </div>

          {/* Before / After diff */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 rounded-xl border border-red-200 bg-white p-4">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Before</p>
              <div className="flex flex-wrap gap-1">
                {result.before.split(",").map((m, i) => (
                  <span
                    key={i}
                    className={`inline-flex flex-col items-center justify-center w-8 h-8 rounded-lg text-xs font-bold
                      ${markIndex === i ? "bg-red-200 text-red-900 ring-2 ring-red-400" : "bg-slate-100 text-slate-600"}`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 self-center shrink-0" />
            <div className="flex-1 rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">After</p>
              <div className="flex flex-wrap gap-1">
                {result.after.split(",").map((m, i) => (
                  <span
                    key={i}
                    className={`inline-flex flex-col items-center justify-center w-8 h-8 rounded-lg text-xs font-bold
                      ${markIndex === i ? "bg-emerald-200 text-emerald-900 ring-2 ring-emerald-400" : "bg-slate-100 text-slate-600"}`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tx details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <MetaItem label="Transaction Hash" value={result.txHash.slice(0, 20) + "…"} mono />
            <MetaItem label="Block Number" value={`#${result.blockNumber.toLocaleString()}`} />
            <MetaItem label="Timestamp" value={new Date(result.timestamp).toLocaleString()} />
          </div>

          <button
            onClick={handleReset}
            className="text-sm text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2"
          >
            Update another mark
          </button>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-white border border-emerald-100 p-3">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-slate-800 font-medium break-all ${mono ? "font-mono text-[11px]" : ""}`}>{value}</p>
    </div>
  );
}
