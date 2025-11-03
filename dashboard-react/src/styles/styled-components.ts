import styled from "styled-components";

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    gap: 1.5rem;
  }
`;

export const GridContainer = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: ${props => {
      if (props.$cols === 2) return "repeat(2, 1fr)";
      if (props.$cols === 3) return "repeat(3, 1fr)";
      if (props.$cols === 4) return "repeat(4, 1fr)";
      if (props.$cols === 5) return "repeat(5, 1fr)";
      return "repeat(2, 1fr)";
    }};
  }

  @media (min-width: 1024px) {
    grid-template-columns: ${props => {
      if (props.$cols === 2) return "repeat(2, 1fr)";
      if (props.$cols === 3) return "repeat(3, 1fr)";
      if (props.$cols === 4) return "repeat(4, 1fr)";
      if (props.$cols === 5) return "repeat(5, 1fr)";
      return "1fr";
    }};
  }
`;

export const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    gap: 1.5rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
`;

export const Card = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 0.75rem;

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

export const KpiCard = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1rem;

  p:first-child {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  p:last-child {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;

    @media (min-width: 640px) {
      font-size: 1.875rem;
    }
  }
`;

export const Button = styled.button<{ variant?: "primary" | "secondary" | "danger"; disabled?: boolean }>`
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: ${props => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;
  width: 100%;

  @media (min-width: 640px) {
    width: auto;
    font-size: 1rem;
  }

  ${props => {
    if (props.disabled) {
      return `
        background-color: #d1d5db;
        color: #6b7280;
        border-color: #d1d5db;
      `;
    }
    if (props.variant === "primary") {
      return `
        background-color: #111827;
        color: white;
        border-color: #111827;
        &:hover {
          background-color: #1f2937;
        }
      `;
    }
    if (props.variant === "secondary") {
      return `
        background-color: white;
        color: #1f2937;
        border-color: #e5e7eb;
        &:hover {
          background-color: #f9fafb;
        }
      `;
    }
    return `
      background-color: white;
      color: #1f2937;
      border-color: #e5e7eb;
    `;
  }}
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

export const Input = styled.input`
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.5rem;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const Select = styled.select`
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.5rem;
  font-size: 1rem;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const FilterContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 0.75rem;

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

export const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

export const SidebarContainer = styled.div<{ $isOpen: boolean }>`
  width: 16rem;
  background: white;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  z-index: 50;
  transform: ${props => props.$isOpen ? "translateX(0)" : "translateX(-100%)"};
  transition: transform 0.3s ease-in-out;

  @media (min-width: 1024px) {
    transform: translateX(0) !important;
  }
`;

export const SidebarOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 40;
  display: ${props => props.$isOpen ? "block" : "none"};

  @media (min-width: 1024px) {
    display: none !important;
  }
`;

export const LogoSection = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (min-width: 640px) {
    padding: 1.5rem;
  }
`;

export const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const LogoBox = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  background-color: #2563eb;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  span {
    color: white;
    font-weight: bold;
    font-size: 1.25rem;
  }
`;

export const LogoText = styled.span<{ $variant?: "mobile" | "desktop" }>`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;

  @media (min-width: 640px) {
    font-size: 1.25rem;
  }

  ${props => props.$variant === "mobile" && `
    @media (min-width: 640px) {
      display: none;
    }
  `}

  ${props => props.$variant === "desktop" && `
    display: none;
    @media (min-width: 640px) {
      display: inline;
    }
  `}
`;

export const NavContainer = styled.nav`
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;

  @media (min-width: 640px) {
    padding: 1rem;
    gap: 0.5rem;
  }
`;

export const NavButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  border: none;
  background: ${props => (props.$active ? "#2563eb" : "transparent")};
  color: ${props => (props.$active ? "white" : "#374151")};
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  text-align: left;

  @media (min-width: 640px) {
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  &:hover {
    background: ${props => (props.$active ? "#2563eb" : "#f3f4f6")};
  }

  span:first-child {
    color: ${props => (props.$active ? "white" : "#4b5563")};
    flex-shrink: 0;
  }

  span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const CloseButton = styled.button`
  display: block;
  padding: 0.5rem;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }

  @media (min-width: 1024px) {
    display: none;
  }
`;

export const Alert = styled.div<{ type?: "error" | "warning" | "info" }>`
  padding: 0.75rem;
  border-radius: 0.25rem;
  ${props => {
    if (props.type === "error") {
      return `
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      `;
    }
    if (props.type === "warning") {
      return `
        background-color: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
      `;
    }
    return `
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    `;
  }}
`;

export const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;

  @media (min-width: 640px) {
    font-size: 1.5rem;
  }
`;

export const Subtitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;

  @media (min-width: 640px) {
    font-size: 1rem;
    margin: 0 0 0.75rem 0;
  }
`;

export const Text = styled.p<{ size?: "sm" | "md" | "lg"; color?: string }>`
  margin: 0;
  font-size: ${props => {
    if (props.size === "sm") return "0.875rem";
    if (props.size === "lg") return "1.125rem";
    return "1rem";
  }};
  color: ${props => props.color || "#6b7280"};
`;

export const LoadingText = styled.span`
  font-size: 0.75rem;
  color: #6b7280;

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
`;

export const DateRangeText = styled.div`
  font-size: 0.875rem;
  color: #4b5563;
`;

export const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
  }
`;

export const MainContent = styled.main`
  flex: 1;
  margin-left: 0;

  @media (min-width: 1024px) {
    margin-left: 16rem;
  }
`;

export const ContentWrapper = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem 0.75rem;

  @media (min-width: 640px) {
    padding: 1.5rem 1rem;
  }

  @media (min-width: 1024px) {
    padding: 2rem 1rem;
  }
`;

export const HamburgerButton = styled.button<{ $visible: boolean }>`
  display: ${props => (props.$visible ? "block" : "none")};
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 50;
  padding: 0.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f9fafb;
  }

  @media (min-width: 1024px) {
    display: none;
  }

  svg {
    width: 1.5rem;
    height: 1.5rem;
  }
`;

export const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f3f4f6;
  display: flex;
`;

