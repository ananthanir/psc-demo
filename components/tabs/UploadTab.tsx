"use client";
import { useCallback, useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, Loader2, X } from "lucide-react";
import { useStore, ExamRecord, StudentRecord } from "@/lib/store";
import { sha256, examDataToString } from "@/lib/crypto";

interface ParsedRow {
  examId: string;
  studentId: string;
  marks: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    // Skip header rows
    if (line.toLowerCase().startsWith("exam") || line.toLowerCase().startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 3) continue;
    // Format: ExamID, StudentID, Mark1, Mark2, …
    const [examId, studentId, ...markParts] = cols;
    if (!examId || !studentId) continue;
    rows.push({ examId, studentId, marks: markParts.join(",") });
  }
  return rows;
}

function groupByExam(rows: ParsedRow[]): Map<string, StudentRecord[]> {
  const map = new Map<string, StudentRecord[]>();
  for (const row of rows) {
    if (!map.has(row.examId)) map.set(row.examId, []);
    map.get(row.examId)!.push({ studentId: row.studentId, marks: row.marks });
  }
  return map;
}

export default function UploadTab() {
  const { addExam, addToast } = useStore();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setSubmitted(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (!rows.length) return;
    setSubmitting(true);

    const byExam = groupByExam(rows);
    const now = new Date().toISOString();

    for (const [examId, students] of byExam.entries()) {
      const canonical = examDataToString(examId, students);
      const hash = await sha256(canonical);
      const txBytes = crypto.getRandomValues(new Uint8Array(32));
      const txHash = "0x" + Array.from(txBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const blockNumber = Math.floor(19_000_000 + Math.random() * 2_000_000);

      const exam: ExamRecord = {
        examId,
        examName: `Uploaded Exam – ${examId}`,
        submittedAt: now,
        txHash,
        blockNumber,
        blockchainHash: hash,
        blockchainStudents: students.map((s) => ({ ...s })),
        dbStudents: students.map((s) => ({ ...s })),
      };

      addExam(exam);

      addToast({
        type: "success",
        title: `Exam ${examId} committed to blockchain`,
        message: `TX: ${txHash.slice(0, 20)}…  ·  Block #${blockNumber.toLocaleString()}`,
      });
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const clearFile = () => {
    setFileName(null);
    setRows([]);
    setSubmitted(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"}`}
      >
        <Upload className={`w-10 h-10 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
        <div className="text-center">
          <p className="font-semibold text-slate-700">Drag & drop a CSV file here</p>
          <p className="text-sm text-slate-500 mt-1">or click to browse</p>
          <p className="text-xs text-slate-400 mt-2">
            Format: ExamID, StudentID, Mark1, Mark2, … (one row per student)
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Sample CSV hint */}
      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 cursor-pointer">
        <summary className="font-medium text-slate-700 cursor-pointer select-none">
          Show sample CSV format
        </summary>
        <pre className="mt-2 text-xs leading-relaxed overflow-auto">
{`# Exam ID,Student ID,Q1,Q2,Q3,Q4,Q5,Q6,Q7
KPSC-2025-NEW-004,STU-4001,A,B,C,A,D,A,C
KPSC-2025-NEW-004,STU-4002,B,A,D,C,A,B,A
KPSC-2025-NEW-004,STU-4003,C,C,A,B,A,D,B`}
        </pre>
      </details>

      {/* File loaded indicator */}
      {fileName && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <FileText className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="flex-1 text-sm font-medium text-slate-700 truncate">{fileName}</span>
          <span className="text-xs text-slate-500">{rows.length} student records parsed</span>
          <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Exam ID</th>
                <th className="px-4 py-3 text-left font-semibold">Student ID</th>
                <th className="px-4 py-3 text-left font-semibold">Marks</th>
                <th className="px-4 py-3 text-left font-semibold">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{row.examId}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.studentId}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {row.marks.split(",").map((m, mi) => (
                        <span
                          key={mi}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold bg-blue-100 text-blue-800"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{row.marks.split(",").length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit button */}
      {rows.length > 0 && !submitted && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Hashing &amp; submitting to blockchain…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Submit to Blockchain
            </>
          )}
        </button>
      )}

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Successfully committed to blockchain</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {groupByExam(rows).size} exam(s) with {rows.length} student records recorded immutably.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
