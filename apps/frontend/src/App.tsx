import { useEffect, useState } from 'react';

import type { HealthStatus } from '@/api/health';

import { fetchHealth } from '@/api/health';

type ApiState =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly health: HealthStatus };

export function App(): React.JSX.Element {
  const [state, setState] = useState<ApiState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    const load = async (): Promise<void> => {
      try {
        const health = await fetchHealth(controller.signal);
        setState({ kind: 'ready', health });
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app">
      <h1>Agent Chat</h1>
      <p aria-live="polite">
        {state.kind === 'loading' && 'Checking API…'}
        {state.kind === 'ready' &&
          `API is ${state.health.status} (uptime ${String(state.health.uptimeSeconds)}s)`}
        {state.kind === 'error' && `API unavailable: ${state.message}`}
      </p>
    </main>
  );
}
