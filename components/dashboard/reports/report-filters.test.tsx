import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportFilters from './report-filters';

vi.mock('./download-reports-modal', () => ({
  default: () => <div data-testid="download-modal" />,
}));

function render(canDownload: boolean) {
  return renderToStaticMarkup(
    <ReportFilters
      priority="all"
      status="all"
      componentType="all"
      onPriorityChange={vi.fn()}
      onStatusChange={vi.fn()}
      onComponentTypeChange={vi.fn()}
      onClear={vi.fn()}
      canDownload={canDownload}
    />
  );
}

describe('ReportFilters', () => {
  it('shows the Download button only when the viewer may download', () => {
    expect(render(true)).toContain('title="Download reports"');
    expect(render(false)).not.toContain('title="Download reports"');
    expect(render(false)).not.toContain('download-modal');
  });
});
