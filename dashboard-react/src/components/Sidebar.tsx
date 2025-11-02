import { Home, BarChart3, Package, Heart, Bug } from "lucide-react";
import {
  SidebarContainer,
  SidebarOverlay,
  LogoSection,
  LogoContainer,
  LogoBox,
  LogoText,
  NavContainer,
  NavButton,
  CloseButton,
} from "../styles/styled-components";

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
      {isOpen && onClose && <SidebarOverlay $isOpen={isOpen} onClick={onClose} />}
      <SidebarContainer $isOpen={isOpen || false}>
        <LogoSection>
          <LogoContainer>
            <LogoBox>
              <span>K</span>
            </LogoBox>
            <LogoText $variant="mobile">K Dashboard</LogoText>
            <LogoText $variant="desktop">Dashboard Kaiserhaus</LogoText>
          </LogoContainer>
          <CloseButton onClick={onClose || undefined} aria-label="Fechar menu">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </CloseButton>
        </LogoSection>

        <NavContainer>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <NavButton
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                $active={isActive}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </NavButton>
            );
          })}
        </NavContainer>
      </SidebarContainer>
    </>
  );
}

