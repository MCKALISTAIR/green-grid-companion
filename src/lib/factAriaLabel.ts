/** Screen-reader label: adds a full stop only when the fact doesn't already end in . ! or ? */
export function factAriaLabel(text: string): string {
  const t = text.trim();
  return `${/[.!?]$/.test(t) ? t : `${t}.`} Tap for another fact.`;
}
