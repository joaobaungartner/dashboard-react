import { useState } from "react";
import Overview from "./pages/Overview";
import Ops from "./pages/Ops";
import Finance from "./pages/Finance";
import Satisfaction from "./pages/Satisfaction";
import Apitest from "./components/Apitest";

export default function App() {
  const tabs = [
    { id: "overview", label: "Visão Geral", node: <Overview /> },
    { id: "ops", label: "Operacional", node: <Ops /> },
    { id: "finance", label: "Financeiro", node: <Finance /> },
    { id: "satisfaction", label: "Satisfação", node: <Satisfaction /> },
    { id: "api", label: "Teste API", node: <Apitest /> },
  ];

  const [active, setActive] = useState<string>(tabs[0].id);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-6">Quatro análises com dados da API.</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-3 py-2 rounded border ${
                active === t.id ? "bg-gray-900 text-white" : "bg-white text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>{tabs.find((t) => t.id === active)?.node}</div>
      </div>
    </div>
  );
}
