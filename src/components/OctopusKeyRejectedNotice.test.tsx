import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OctopusKeyRejectedNotice } from './OctopusKeyRejectedNotice';
import { OCTOPUS_KEY_REJECTED_COPY as COPY } from '@/lib/voice/octopusLinkCopy';

describe('OctopusKeyRejectedNotice (BH-127)', () => {
  it('says the key was rejected and the relink button calls onRelink', () => {
    const onRelink = vi.fn();
    render(
      <OctopusKeyRejectedNotice
        at={new Date('2026-10-30T06:00:00Z')}
        now={new Date('2026-10-30T08:00:00Z')}
        onRelink={onRelink}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.title);
    expect(screen.getByText('Last tried about 2 hours ago')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.relink }));
    expect(onRelink).toHaveBeenCalledTimes(1);
  });
  it('omits the time line when unknown', () => {
    render(<OctopusKeyRejectedNotice at={null} onRelink={() => {}} />);
    expect(screen.queryByText(/Last tried/)).toBeNull();
  });
  it('uses the agreed title', () => {
    expect(COPY.title).toBe('Octopus rejected your key, please relink');
  });
});
