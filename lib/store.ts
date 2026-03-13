"use client";
import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StudentRecord {
  studentId: string;
  marks: string; // e.g. "A,B,C,A,D"
}

export interface ExamRecord {
  examId: string;
  examName: string;
  submittedAt: string;
  txHash: string;
  blockNumber: number;
  blockchainHash: string; // SHA-256 of original data (set at submission)
  blockchainStudents: StudentRecord[]; // immutable — represents chain state
  dbStudents: StudentRecord[]; // mutable — represents DB state (can be tampered)
}

export interface MarkVersion {
  version: number;
  examId: string;
  studentId: string;
  marks: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  updatedBy: string;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

interface AppState {
  exams: ExamRecord[];
  versions: MarkVersion[];
  toasts: ToastMessage[];

  addExam: (exam: ExamRecord) => void;
  simulateTampering: (examId: string) => void;
  resetTampering: (examId: string) => void;
  updateMark: (
    examId: string,
    studentId: string,
    markIndex: number,
    newGrade: string
  ) => MarkVersion | null;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockTxHash(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

function mockBlockNumber(): number {
  return Math.floor(18_000_000 + Math.random() * 9_000_000);
}

function mockTimestamp(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const GRADES = ["A", "B", "C", "D", "E"];

function randomMarks(count = 7): string {
  return Array.from(
    { length: count },
    () => GRADES[Math.floor(Math.random() * GRADES.length)]
  ).join(",");
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_EXAMS: ExamRecord[] = [
  {
    examId: "KPSC-2025-CE-001",
    examName: "Civil Engineering Post – Paper I",
    submittedAt: mockTimestamp(14),
    txHash: "0x" + "a3f9".repeat(16),
    blockNumber: 19_482_371,
    blockchainHash: "seed-hash-will-be-replaced-by-ui",
    blockchainStudents: [
      { studentId: "STU-1001", marks: "A,B,A,C,D,A,B" },
      { studentId: "STU-1002", marks: "B,C,B,A,A,C,D" },
      { studentId: "STU-1003", marks: "A,A,C,B,D,B,A" },
      { studentId: "STU-1004", marks: "C,D,A,A,B,A,C" },
      { studentId: "STU-1005", marks: "B,B,D,C,A,D,B" },
    ],
    dbStudents: [
      { studentId: "STU-1001", marks: "A,B,A,C,D,A,B" },
      { studentId: "STU-1002", marks: "B,C,B,A,A,C,D" },
      { studentId: "STU-1003", marks: "A,A,C,B,D,B,A" },
      { studentId: "STU-1004", marks: "C,D,A,A,B,A,C" },
      { studentId: "STU-1005", marks: "B,B,D,C,A,D,B" },
    ],
  },
  {
    examId: "KPSC-2025-ME-002",
    examName: "Mechanical Engineering Post – Paper II",
    submittedAt: mockTimestamp(7),
    txHash: "0x" + "b7e2".repeat(16),
    blockNumber: 19_531_044,
    blockchainHash: "seed-hash-will-be-replaced-by-ui",
    blockchainStudents: [
      { studentId: "STU-2001", marks: "C,A,B,D,A,B,C" },
      { studentId: "STU-2002", marks: "A,D,C,B,A,A,D" },
      { studentId: "STU-2003", marks: "B,B,A,A,C,D,A" },
      { studentId: "STU-2004", marks: "D,A,B,C,B,A,B" },
      { studentId: "STU-2005", marks: "A,C,D,A,B,C,A" },
    ],
    dbStudents: [
      { studentId: "STU-2001", marks: "C,A,B,D,A,B,C" },
      { studentId: "STU-2002", marks: "A,D,C,B,A,A,D" },
      { studentId: "STU-2003", marks: "B,B,A,A,C,D,A" },
      { studentId: "STU-2004", marks: "D,A,B,C,B,A,B" },
      { studentId: "STU-2005", marks: "A,C,D,A,B,C,A" },
    ],
  },
  {
    examId: "KPSC-2025-AC-003",
    examName: "Assistant Controller – Finance",
    submittedAt: mockTimestamp(3),
    txHash: "0x" + "c5d1".repeat(16),
    blockNumber: 19_562_219,
    blockchainHash: "seed-hash-will-be-replaced-by-ui",
    blockchainStudents: [
      { studentId: "STU-3001", marks: randomMarks() },
      { studentId: "STU-3002", marks: randomMarks() },
      { studentId: "STU-3003", marks: randomMarks() },
      { studentId: "STU-3004", marks: randomMarks() },
      { studentId: "STU-3005", marks: randomMarks() },
    ],
    dbStudents: [
      { studentId: "STU-3001", marks: "B,A,C,D,A,B,C" },
      { studentId: "STU-3002", marks: "A,C,B,A,D,C,B" },
      { studentId: "STU-3003", marks: "C,D,A,B,A,C,A" },
      { studentId: "STU-3004", marks: "A,B,D,C,B,A,D" },
      { studentId: "STU-3005", marks: "D,A,B,A,C,B,A" },
    ],
  },
];

// Normalise seed so blockchain == db on initial load
SEED_EXAMS.forEach((e) => {
  e.blockchainStudents = e.dbStudents.map((s) => ({ ...s }));
});

// Seed versions – one initial version per student per exam
const SEED_VERSIONS: MarkVersion[] = [];
const MOCK_UPDATERS = ["admin@kpsc.gov.in", "officer@kpsc.gov.in", "examcell@kpsc.gov.in"];

SEED_EXAMS.forEach((exam) => {
  exam.dbStudents.forEach((stu) => {
    SEED_VERSIONS.push({
      version: 1,
      examId: exam.examId,
      studentId: stu.studentId,
      marks: stu.marks,
      txHash: exam.txHash,
      blockNumber: exam.blockNumber,
      timestamp: exam.submittedAt,
      updatedBy: MOCK_UPDATERS[0],
    });
  });
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  exams: SEED_EXAMS,
  versions: SEED_VERSIONS,
  toasts: [],

  addExam: (exam) =>
    set((state) => {
      // Create v1 MarkVersion entry for every student, mirroring what the seed does.
      // This ensures latestVer(), version counters and per-entry TX lookups all work
      // correctly for uploaded exams from the moment they're committed.
      const initialVersions: MarkVersion[] = exam.dbStudents.map((stu) => ({
        version: 1,
        examId: exam.examId,
        studentId: stu.studentId,
        marks: stu.marks,
        txHash: exam.txHash,
        blockNumber: exam.blockNumber,
        timestamp: exam.submittedAt,
        updatedBy: "admin@kpsc.gov.in",
      }));
      return {
        exams: [...state.exams, exam],
        versions: [...state.versions, ...initialVersions],
      };
    }),

  simulateTampering: (examId) =>
    set((state) => ({
      exams: state.exams.map((e) => {
        if (e.examId !== examId) return e;
        // Alter the first student's first mark in the DB copy
        const dbStudents = e.dbStudents.map((s, si) => {
          if (si === 0) {
            const parts = s.marks.split(",");
            // flip first mark to something different
            parts[0] = parts[0] === "A" ? "E" : "A";
            return { ...s, marks: parts.join(",") };
          }
          return s;
        });
        return { ...e, dbStudents };
      }),
    })),

  resetTampering: (examId) =>
    set((state) => ({
      exams: state.exams.map((e) => {
        if (e.examId !== examId) return e;
        return {
          ...e,
          dbStudents: e.blockchainStudents.map((s) => ({ ...s })),
        };
      }),
    })),

  updateMark: (examId, studentId, markIndex, newGrade) => {
    const state = get();
    const exam = state.exams.find((e) => e.examId === examId);
    if (!exam) return null;
    const stu = exam.dbStudents.find((s) => s.studentId === studentId);
    if (!stu) return null;

    const parts = stu.marks.split(",");
    if (markIndex < 0 || markIndex >= parts.length) return null;
    parts[markIndex] = newGrade;
    const newMarks = parts.join(",");

    const existingVersions = state.versions.filter(
      (v) => v.examId === examId && v.studentId === studentId
    );
    const newVersion = existingVersions.length + 1;

    const txHash = mockTxHash();
    const blockNumber = mockBlockNumber();
    const timestamp = new Date().toISOString();
    const updatedBy = MOCK_UPDATERS[Math.floor(Math.random() * MOCK_UPDATERS.length)];

    const version: MarkVersion = {
      version: newVersion,
      examId,
      studentId,
      marks: newMarks,
      txHash,
      blockNumber,
      timestamp,
      updatedBy,
    };

    set((s) => ({
      exams: s.exams.map((e) => {
        if (e.examId !== examId) return e;
        return {
          ...e,
          dbStudents: e.dbStudents.map((st) =>
            st.studentId === studentId ? { ...st, marks: newMarks } : st
          ),
          blockchainStudents: e.blockchainStudents.map((st) =>
            st.studentId === studentId ? { ...st, marks: newMarks } : st
          ),
        };
      }),
      versions: [...s.versions, version],
    }));

    return version;
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
