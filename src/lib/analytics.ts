export type AnalyticsDay = {
  day: string;
  views: number;
  checkouts: number;
  purchases: number;
  gross_cents: number;
};
export type DropAnalytics = Omit<AnalyticsDay, 'day'> & {
  daily: AnalyticsDay[];
};
export function analyticsPeriod(input?: string) {
  return input === '7' ? 7 : input === '90' ? 90 : 30;
}
export function checkoutConversion(purchases: number, checkouts: number) {
  return checkouts > 0 ? `${((purchases / checkouts) * 100).toFixed(1)}%` : '—';
}
