import Sidebar from '@/components/shared/Sidebar';
import TopBar from '@/components/shared/TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Sidebar />
      <div className="ml-[240px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
