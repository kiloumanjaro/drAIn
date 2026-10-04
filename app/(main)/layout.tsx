import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
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
          {children}
        </SidebarInset>
      </SidebarProvider>
    </ReportProvider>
  );
}
