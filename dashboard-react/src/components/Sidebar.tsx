import { Home, BarChart3, Package, Heart, Bug } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { id: "overview", label: "Visão Geral", icon: <Home size={20} /> },
  { id: "finance", label: "Financeiro", icon: <BarChart3 size={20} /> },
  { id: "ops", label: "Operacional", icon: <Package size={20} /> },
  { id: "satisfaction", label: "Satisfação", icon: <Heart size={20} /> },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <span className="text-xl font-semibold text-gray-800">Dashboard Kaiserhaus</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <span className={isActive ? "text-white" : "text-gray-600"}>
                {tab.icon}
              </span>
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

