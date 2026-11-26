/** Tamil script (U+0B80–U+0BFF). */
const TAMIL = /[஀-௿]/;
const BRACKETED_END = /^(.*\S)\s*\(\s*([^()]*?)\s*\)\s*$/;

/**
 * Splits a name written as "English ( Tamil )" so the two can sit on separate lines. Names with no Tamil in a
 * closing bracket, or with no English before it, come back whole as `english` with `tamil: null`.
 */
export function splitBilingualName(name: string): { english: string; tamil: string | null } {
  const m = BRACKETED_END.exec(name);
  if (!m || !TAMIL.test(m[2]) || TAMIL.test(m[1])) return { english: name, tamil: null };
  return { english: m[1].trim(), tamil: m[2] };
}
