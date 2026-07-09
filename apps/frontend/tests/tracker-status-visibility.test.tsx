import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KanbanBoard } from '@/components/tracker/kanban-board';
import { StatusVisibilityDialog } from '@/components/tracker/status-visibility-dialog';
import {
  APPLICATION_STATUS_ORDER,
  listApplications,
  type Application,
  type ApplicationColumns,
  type ApplicationStatus,
} from '@/lib/api/tracker';

const STORAGE_KEY = 'resume_matcher_tracker_hidden_statuses';

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'tracker.manage.button': 'Manage',
        'tracker.manage.title': 'Manage Stages',
        'tracker.manage.visible': 'Visible',
        'tracker.manage.hidden': 'Hidden',
        'tracker.manage.lastVisible': 'Required',
        'tracker.columns.saved': 'Saved',
        'tracker.columns.applied': 'Applied',
        'tracker.columns.no_response': 'No Response',
        'tracker.columns.response': 'Response',
        'tracker.columns.interview': 'Interview',
        'tracker.columns.accepted': 'Accepted',
        'tracker.columns.rejected': 'Rejected',
        'common.close': 'Close',
      };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/api/tracker', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tracker')>('@/lib/api/tracker');
  return {
    ...actual,
    listApplications: vi.fn(),
    updateApplication: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkDeleteApplications: vi.fn(),
  };
});

function card(id: string, status: ApplicationStatus, position: number): Application {
  return {
    application_id: id,
    job_id: `job-${id}`,
    resume_id: `resume-${id}`,
    master_resume_id: null,
    status,
    company: null,
    role: null,
    applied_at: null,
    notes: null,
    position,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function emptyColumns(): ApplicationColumns {
  return APPLICATION_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as ApplicationColumns);
}

function columnsWithSavedCard(): ApplicationColumns {
  return {
    ...emptyColumns(),
    saved: [card('saved-1', 'saved', 0)],
  };
}

describe('tracker status visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(listApplications).mockReset();
    vi.mocked(listApplications).mockResolvedValue({ columns: columnsWithSavedCard() });
  });

  it('restores hidden status columns from localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['applied']));

    const { container } = render(<KanbanBoard />);

    await waitFor(() => expect(container.querySelector('[data-column="saved"]')).toBeTruthy());

    expect(container.querySelector('[data-column="applied"]')).toBeNull();
    expect(container.querySelector('[data-column="saved"]')).toBeTruthy();
  });

  it('persists status visibility changes from the manage dialog', async () => {
    const { container } = render(<KanbanBoard />);

    await waitFor(() => expect(container.querySelector('[data-column="applied"]')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Applied' }));

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['applied'])
    );
    expect(container.querySelector('[data-column="applied"]')).toBeNull();
    expect(container.querySelector('[data-column="saved"]')).toBeTruthy();
  });

  it('keeps the last visible status enabled', () => {
    const onStatusVisibilityChange = vi.fn();
    const hiddenStatuses = new Set<ApplicationStatus>(
      APPLICATION_STATUS_ORDER.filter((status) => status !== 'saved')
    );

    render(
      <StatusVisibilityDialog
        open
        onOpenChange={vi.fn()}
        hiddenStatuses={hiddenStatuses}
        onStatusVisibilityChange={onStatusVisibilityChange}
      />
    );

    const savedSwitch = screen.getByRole('switch', { name: 'Saved' });
    expect(savedSwitch).toBeDisabled();

    fireEvent.click(savedSwitch);
    expect(onStatusVisibilityChange).not.toHaveBeenCalled();
  });
});
