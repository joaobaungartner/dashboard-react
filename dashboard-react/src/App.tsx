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

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeTab={active} onTabChange={setActive} />
      <main className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div>{tabs.find((t) => t.id === active)?.node}</div>
        </div>
      </main>
    </div>
  );
}
