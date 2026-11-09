import "@ant-design/v5-patch-for-react-19"; // antd v5 + React 19 compatibility
import { SignupPage } from "./components/SignupPage";

// theme
export { brand } from "./theme/brand";
export { backgroundPresets, accentOptions } from "./theme/presets";
export { toggleMode, setBackground, setAccent, resetTheme } from "./theme/themeSlice";
// store & api
export { sharedReducers, useAppDispatch, useAppSelector, attachPersistence } from "./store";
export type { SharedState, SharedDispatch } from "./store";
export { setStoragePrefix } from "./store/storage";
export { configureApi, api, endpoints, getErrorMessage } from "./api/client";// auth
export { login, logout, fetchUserDetails, hasGrant } from "./auth/authSlice";
export type { UserDetails, Grant } from "./auth/authSlice";
export { RequireAuth } from "./auth/RequireAuth";
// providers & components
export { ThemeProvider } from "./providers/ThemeProvider";
export { Input, PasswordInput } from "./components/Input";
export { TextArea } from "./components/TextArea";
export { Tabs } from "./components/Tabs";
export { Navbar } from "./components/Navbar";
export { Sidebar } from "./components/Sidebar";
export type { SidebarItem } from "./components/Sidebar";
export { ThemeToggle } from "./components/ThemeToggle";
export { AppearanceButton } from "./components/AppearanceModal";
export { UserMenu } from "./components/UserMenu";
export { LoginPage } from "./components/LoginPage";
export { NotificationsButton } from "./components/NotificationsButton";
export { usePersistentState } from "./hooks/usePersistentState";
export type { SidebarGroup } from "./components/Sidebar";
export { Select } from "./components/Select";
export { Field } from "./components/Field";
export { DataTable, type DataColumn, type DataTableProps, type CellValue } from "./components/DataTable";
export { toCSV } from "./components/DataTable/export";
export { IconLogo } from "./components/Icons/IconLogo";
export { default as Modal } from "./components/Modal";
export { default as Placeholder } from "./components/Placeholder";
export { SignupPage } from "./components/SignupPage";
export { Toggle } from "./components/Toggle";
export { AuthBadge } from "./components/AuthBadge";
export { TreeNav, type TreeNode } from "./components/TreeNav";
export { default as LogoText } from "./assets/imgs/logo-text.png";
export { ToastProvider, toast } from "./components/Toast";
export { ConfirmModal } from "./components/Modal/ConfirmModal";
export type { ConfirmModalProps } from "./components/Modal/ConfirmModal";
export { SplitPanel } from "./components/SplitPanel";
export { ExplorerTree, type ExplorerNode, type ExplorerTreeProps } from "./components/ExplorerTree";