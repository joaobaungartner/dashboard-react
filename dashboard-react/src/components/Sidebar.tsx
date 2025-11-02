import { Home, BarChart3, Package, Heart, Bug } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
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

export default function Sidebar({ activeTab, onTabChange, isOpen = false, onClose }: SidebarProps) {
  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    // Fechar sidebar em mobile após selecionar
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}
      
      <div className={`
        w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold text-gray-800 hidden sm:inline">Dashboard Kaiserhaus</span>
            <span className="text-lg sm:text-xl font-semibold text-gray-800 sm:hidden">K Dashboard</span>
          </div>
          {/* Botão fechar para mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all text-sm sm:text-base
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                <span className={isActive ? "text-white" : "text-gray-600 flex-shrink-0"}>
                  {tab.icon}
                </span>
                <span className="font-medium truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

