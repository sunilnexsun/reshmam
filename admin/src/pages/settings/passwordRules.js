// Password policy used by Change Password, new users and password resets.
export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'A number', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'A special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]
export const passwordScore = (p = '') => PASSWORD_RULES.filter((r) => r.test(p)).length
export const validatePassword = (p = '') => {
  const miss = PASSWORD_RULES.find((r) => !r.test(p))
  return miss ? `Password needs ${miss.label.toLowerCase()}` : true
}
export function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#$%&*!?']
  const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n }
  const chars = sets.map((s) => s[rnd(s.length)])
  const all = sets.join('')
  while (chars.length < 12) chars.push(all[rnd(all.length)])
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}
