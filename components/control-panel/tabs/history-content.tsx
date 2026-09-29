'use client';

import type { Inlet, Outlet, Pipe, Drain } from '../types';
import ReportHistoryList from '@/components/reports/report-history-list';
import type { DateFilterValue } from '@/components/common/date-sort';
import Maintenance from './maintenance';

export type HistoryContentProps = {
  activeAdminTab?: 'maintenance' | 'reports';
  dateFilter?: DateFilterValue;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
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
