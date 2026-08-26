export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0h00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}
