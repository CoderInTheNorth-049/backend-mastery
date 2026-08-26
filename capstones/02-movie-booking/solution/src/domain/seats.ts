/** Row-major seat refs for a rows x cols auditorium: A1..E5. */
export function buildSeatRefs(rows: number, cols: number): string[] {
  const refs: string[] = [];
  for (let row = 0; row < rows; row++) {
    // Single-letter rows: layouts beyond 26 rows would need AA-style refs.
    const letter = String.fromCharCode(65 + row);
    for (let col = 1; col <= cols; col++) {
      refs.push(`${letter}${col}`);
    }
  }
  return refs;
}
