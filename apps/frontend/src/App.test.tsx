import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows API status once health check resolves', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ status: 'ok', uptimeSeconds: 42, timestamp: '' })),
    );

    render(<App />);

    expect(await screen.findByText('API is ok (uptime 42s)')).toBeInTheDocument();
  });

  it('shows an error when the API is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
    );

    render(<App />);

    expect(await screen.findByText(/API unavailable/v)).toBeInTheDocument();
  });
});
