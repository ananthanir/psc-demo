"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ChevronDown, BookOpen } from "lucide-react";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-100 text-red-800",
};

export default function MarkListTab() {
  const { exams, versions } = useStore();
  const [examId, setExamId] = useState("");

  const exam = exams.find((e) => e.examId === examId);
  const students = exam?.dbStudents ?? [];

  // Latest version number per student for this exam
  function latestVer(studentId: string): number {
    const vs = versions.filter(
      (v) => v.examId === examId && v.studentId === studentId
    );
    return vs.length ? Math.max(...vs.map((v) => v.version)) : 1;
  }

  // Derive column count from first student
  const colCount = students[0]?.marks.split(",").length ?? 0;

  // Grade frequency per column
  const columnStats: { grade: string; count: number }[][] = Array.from(
    { length: colCount },
    (_, qi) => {
      const freq: Record<string, number> = {};
      students.forEach((s) => {
        const g = s.marks.split(",")[qi] ?? "?";
        freq[g] = (freq[g] ?? 0) + 1;
      });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([grade, count]) => ({ grade, count }));
    }
  );

  return (
    <div className="space-y-6">
      {/* Exam selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label className="text-sm font-semibold text-slate-700 shrink-0">Select Exam</label>
        <div className="relative flex-1 max-w-md">
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">— Choose an exam —</option>
            {exams.map((e) => (
              <option key={e.examId} value={e.examId}>
                {e.examId} — {e.examName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {exam && (
        <>
          {/* Exam metadata strip */}
          <div className="flex flex-wrap gap-4 rounded-xl bg-blue-50 border border-blue-200 px-5 py-3 text-xs">
            <MetaBadge label="Exam ID" value={exam.examId} />
            <MetaBadge label="Exam Name" value={exam.examName} />
            <MetaBadge label="Students" value={String(students.length)} />
            <MetaBadge label="Questions" value={String(colCount)} />
            <MetaBadge
              label="Submitted"
              value={new Date(exam.submittedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <MetaBadge label="Block #" value={exam.blockNumber.toLocaleString()} />
          </div>

          {/* Mark list table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                    Student ID
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                    Ver.
                  </th>
                  {Array.from({ length: colCount }, (_, i) => (
                    <th
                      key={i}
                      className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap"
                    >
                      Q{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s, si) => {
                  const grades = s.marks.split(",");
                  const ver = latestVer(s.studentId);
                  return (
                    <tr key={s.studentId} className={si % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-mono text-xs font-semibold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {s.studentId}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${
                          ver > 1 ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          v{ver}
                        </span>
                      </td>
                      {grades.map((g, gi) => (
                        <td key={gi} className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                              GRADE_COLORS[g] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {g}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary / frequency row */}
              {students.length > 1 && (
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">
                      Top Grade
                    </td>
                    {/* empty cell under Ver. column */}
                    <td className="px-3 py-2.5" />
                    {columnStats.map((stats, qi) => {
                      const top = stats[0];
                      return (
                        <td key={qi} className="px-3 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                                GRADE_COLORS[top?.grade] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {top?.grade ?? "—"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {top?.count}×
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Grade distribution per question */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Grade Distribution by Question</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {columnStats.map((stats, qi) => (
                <div key={qi} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Q{qi + 1}
                  </p>
                  <div className="space-y-1">
                    {stats.map(({ grade, count }) => (
                      <div key={grade} className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0 ${
                            GRADE_COLORS[grade] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {grade}
                        </span>
                        {/* Bar */}
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{ width: `${(count / students.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!examId && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <BookOpen className="mx-auto w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Select an exam to view its complete mark list</p>
        </div>
      )}
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-blue-500 font-semibold">{label}:</span>
      <span className="text-blue-900 font-medium">{value}</span>
    </div>
  );
}
