'use client';

import SubmitTab from '../../submit-tab';
import AllReportsList from '../../all-reports-list';
import type { DateFilterValue } from '../../date-sort';
import type { Inlet, Outlet, Pipe, Drain } from '../types';
import type { Report } from '@/lib/supabase/report';

interface ReportsTabProps {
  activeReportTab?: 'submission' | 'reports';
  dateFilter?: DateFilterValue;
  reports?: Report[];
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
  reports = [],
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
