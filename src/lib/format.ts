/**
 * Date, Time, Currency, and Token formatting utilities.
 * Enforces Africa/Lagos timezone and EHI financial precision standards.
 */

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';

    // Africa/Lagos is UTC+1 (no daylight saving)
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return '—';
  }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short'
    }).format(date);
  } catch {
    return '—';
  }
}

export function formatCost(usd: number | null | undefined): string {
  if (usd === null || usd === undefined || isNaN(usd)) return '$0.00';
  if (usd === 0) return '$0.00';
  if (usd > 0 && usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(usd);
}

export function formatNaira(ngn: number | null | undefined): string {
  if (ngn === null || ngn === undefined || isNaN(ngn)) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(ngn);
}

export function formatTokens(n: number | null | undefined): string {
  if (!n || isNaN(n)) return '0';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}
