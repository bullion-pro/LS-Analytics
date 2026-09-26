import { Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { OverviewPage } from "@/pages/OverviewPage";
import { SalesPage } from "@/pages/SalesPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { SupplierPage } from "@/pages/SupplierPage";
import { FinancePage } from "@/pages/FinancePage";
import { CustomersPage } from "@/pages/CustomersPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { EngagementPage } from "@/pages/EngagementPage";

export function App() {
  return (
    <div className="flex h-screen bg-[var(--color-canvas)]">
      <CommandPalette />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/supplier" element={<SupplierPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/engagement" element={<EngagementPage />} />
        </Routes>
      </div>
    </div>
  );
}
