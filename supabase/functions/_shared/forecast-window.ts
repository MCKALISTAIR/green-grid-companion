interface Slot {
  from: string;
  to: string;
  intensity: { forecast: number };
}

export function usableForecast<T extends Slot>(rows: T[]): T[] {
  return rows
    .filter(
      (row) =>
        Number.isFinite(row.intensity.forecast) &&
        row.intensity.forecast >= 0 &&
        Date.parse(row.to) - Date.parse(row.from) === 1800_000 &&
        !rows.some(
          (other) =>
            other !== row &&
            Date.parse(other.from) < Date.parse(row.to) &&
            Date.parse(other.to) > Date.parse(row.from),
        ),
    )
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
}

/** Expand only through contiguous, explicitly usable slots within 20g. */
export function greenWindow<T extends Slot>(rows: T[], best: T, tolerance = 20) {
  const ordered = usableForecast(rows);
  const at = ordered.indexOf(best);
  if (at < 0) return null;
  let start = at,
    end = at;
  const threshold = best.intensity.forecast + tolerance;
  while (
    start > 0 &&
    Date.parse(ordered[start - 1].to) === Date.parse(ordered[start].from) &&
    ordered[start - 1].intensity.forecast <= threshold
  )
    start--;
  while (
    end + 1 < ordered.length &&
    Date.parse(ordered[end].to) === Date.parse(ordered[end + 1].from) &&
    ordered[end + 1].intensity.forecast <= threshold
  )
    end++;
  return { from: ordered[start].from, to: ordered[end].to };
}
