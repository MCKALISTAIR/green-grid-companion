import type { ForecastData } from '@/lib/carbonApi';

/** Suggest a short energy tip from current intensity vs the near-term forecast. */
export function getSmartTip(current: number, forecast: ForecastData[]): string {
  if (!forecast || forecast.length < 12) {
    return 'Check back later for a more tailored energy tip.';
  }

  const now = new Date();
  const future = forecast.filter((f) => new Date(f.from) > now).slice(0, 24);

  if (future.length === 0) return 'Keep an eye on your energy usage today.';

  const avg = future.reduce((acc, f) => acc + f.intensity.forecast, 0) / future.length;
  const min = future.reduce(
    (best, f) => (f.intensity.forecast < best.intensity.forecast ? f : best),
    future[0],
  );

  if (current <= 50) {
    return 'Carbon intensity is excellent right now! Perfect time to charge or run appliances.';
  }

  if (current < avg - 30) {
    return `It's much greener than usual right now. Good time to use energy before levels rise.`;
  }

  if (current > min.intensity.forecast + 50 && current > 100) {
    const bestTime = new Date(min.from).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Intensity is relatively high. If you can, wait until around ${bestTime} for much cleaner energy.`;
  }

  if (avg < 100) {
    return 'Great news! The grid is running very green today. Feel free to use energy as needed.';
  }

  if (avg > 250) {
    return 'Carbon intensity is high throughout the day. Every bit of energy saved counts today!';
  }

  return "Carbon levels are stable. Check the 'Best Time' chart for specific charging slots.";
}
