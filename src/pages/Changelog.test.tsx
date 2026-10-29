import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Changelog from './Changelog';

vi.mock('@/hooks/useVersionCheck', () => ({
  useVersionCheck: () => ({ markVersionSeen: vi.fn() }),
}));

describe('/changelog', () => {
  it('no longer lists the retired Tesla integration (PR-C1b, T1)', () => {
    const { container } = render(
      <MemoryRouter>
        <Changelog />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain('v1.0.0');
    expect(container.textContent).not.toContain('v1.1.0');
    expect(container.textContent).not.toContain('Tesla');
  });
});
