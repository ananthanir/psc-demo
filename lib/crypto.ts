/**
 * Compute SHA-256 hash using the Web Crypto API.
 * Returns a lowercase hex string.
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Produce a canonical string representation of an exam's student records
 * suitable for hashing.
 */
export function examDataToString(
  examId: string,
  students: { studentId: string; marks: string }[]
): string {
  const rows = students
    .slice()
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .map((s) => `${s.studentId}:${s.marks}`)
    .join("|");
  return `${examId}::${rows}`;
}
