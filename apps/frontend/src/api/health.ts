export interface HealthStatus {
  readonly status: 'ok';
  readonly uptimeSeconds: number;
  readonly timestamp: string;
}

function isHealthStatus(value: unknown): value is HealthStatus {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'ok' &&
    'uptimeSeconds' in value &&
    typeof value.uptimeSeconds === 'number'
  );
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const response = await fetch('/api/health', signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${String(response.status)}`);
  }
  const body: unknown = await response.json();
  if (!isHealthStatus(body)) {
    throw new Error('Unexpected health response shape');
  }
  return body;
}
