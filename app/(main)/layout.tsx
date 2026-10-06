import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { ReportProvider } from '@/components/context/report-provider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Here rather than in the root providers: its readers are the sidebar's
    // notification bell and the map page, so the sign-in pages no longer
    // fetch the latest reports or hold a realtime channel open.
    <ReportProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        {/* The skip link in the root layout lands here. */}
        <SidebarInset id="main-content" tabIndex={-1} className="outline-none">
          {/* Below tablet width the rail is gone; this opens it as a drawer. */}
          <SidebarTrigger
            aria-label="Open navigation"
            className="fixed top-3 left-3 z-40 size-10 rounded-md border border-[#dfdfdf] bg-white shadow-md hover:bg-gray-100 md:hidden"
          />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </ReportProvider>
  );
}
