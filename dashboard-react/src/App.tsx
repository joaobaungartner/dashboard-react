import { useState } from "react";
import Overview from "./pages/Overview";
import Ops from "./pages/Ops";
import Finance from "./pages/Finance";
import Satisfaction from "./pages/Satisfaction";
import Sidebar from "./components/Sidebar";

export default function App() {
  const tabs = [
    { id: "overview", label: "Visão Geral", node: <Overview /> },
    { id: "ops", label: "Operacional", node: <Ops /> },
    { id: "finance", label: "Financeiro", node: <Finance /> },
    { id: "satisfaction", label: "Satisfação", node: <Satisfaction /> },
  ];

  const [active, setActive] = useState<string>(tabs[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeTab={active} onTabChange={setActive} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 lg:ml-64">
        {/* Botão hambúrguer para mobile */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="max-w-7xl mx-auto py-4 px-3 sm:py-6 sm:px-4 lg:py-8">
          <div>{tabs.find((t) => t.id === active)?.node}</div>
        </div>
      </main>
    </div>
  );
}
