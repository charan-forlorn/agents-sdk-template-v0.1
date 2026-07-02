export type TraceRecord = {
  at: string;
  requestId: string;
  event: string;
  metadata?: Record<string, unknown>;
};

export function traceLaunchEvent(record: Omit<TraceRecord, 'at'>): void {
  const safeRecord: TraceRecord = {
    at: new Date().toISOString(),
    ...record,
  };
  console.info(JSON.stringify({ launchDeskTrace: safeRecord }));
}
