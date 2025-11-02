import { useState } from "react";
import Overview from "./pages/Overview";
import Ops from "./pages/Ops";
import Finance from "./pages/Finance";
import Satisfaction from "./pages/Satisfaction";
import Sidebar from "./components/Sidebar";
import {
  AppContainer,
  MainContent,
  ContentWrapper,
  HamburgerButton,
} from "./styles/styled-components";

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
    <AppContainer>
      <Sidebar activeTab={active} onTabChange={setActive} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MainContent>
        <HamburgerButton
          $visible={!sidebarOpen}
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </HamburgerButton>
        <ContentWrapper>
          <div>{tabs.find((t) => t.id === active)?.node}</div>
        </ContentWrapper>
      </MainContent>
    </AppContainer>
  );
}
