'use client';

import type { Inlet, Outlet, Pipe, Drain } from '../types';
import ReportHistoryList from '../../report-history-list';
import type { DateFilterValue } from '../../date-sort';
import Maintenance from './maintenance';
import type { Report } from '@/lib/supabase/report';

export type HistoryContentProps = {
  activeAdminTab?: 'maintenance' | 'reports';
  dateFilter?: DateFilterValue;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
  reports?: Report[];
  onRefreshReports?: () => Promise<void>;
  isRefreshingReports?: boolean;
  isSimulationMode?: boolean;
  profile?: Record<string, unknown> | null;
};

export default function HistoryContent({
  activeAdminTab = 'maintenance',
  dateFilter = 'all',
  selectedInlet,
  selectedOutlet,
  selectedPipe,
  selectedDrain,
  reports = [],
  onRefreshReports,
  isRefreshingReports = false,
  isSimulationMode = false,
  profile,
}: HistoryContentProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {activeAdminTab === 'maintenance' ? (
        <Maintenance
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
          profile={profile}
        />
      ) : (
        <ReportHistoryList
          dateFilter={dateFilter}
          reports={reports}
          onRefresh={onRefreshReports}
          isRefreshing={isRefreshingReports}
          isSimulationMode={isSimulationMode}
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
        />
      )}
    </div>
  );
}
