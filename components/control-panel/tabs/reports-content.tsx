'use client';

import SubmitTab from '@/components/reports/submit-tab';
import AllReportsList from '@/components/reports/all-reports-list';
import type { DateFilterValue } from '@/components/common/date-sort';
import type { Inlet, Outlet, Pipe, Drain } from '../types';

interface ReportsTabProps {
  activeReportTab?: 'submission' | 'reports';
  dateFilter?: DateFilterValue;
  onRefreshReports?: () => Promise<void>;
  isRefreshingReports?: boolean;
  isSimulationMode?: boolean;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
}

export function ReportsTab({
  activeReportTab = 'submission',
  dateFilter = 'all',
  onRefreshReports,
  isRefreshingReports = false,
  isSimulationMode = false,
  selectedInlet = null,
  selectedOutlet = null,
  selectedPipe = null,
  selectedDrain = null,
}: ReportsTabProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {activeReportTab === 'submission' ? (
        <SubmitTab />
      ) : (
        <AllReportsList
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
