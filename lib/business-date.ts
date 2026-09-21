/** BlueBay's business calendar is Asia/Shanghai (UTC+08); instants remain UTC. */
export function businessDate(value: Date | string | number = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const instant = new Date(value).getTime();
  return Number.isFinite(instant) ? new Date(instant + 8 * 3600000).toISOString().slice(0, 10) : '';
}
