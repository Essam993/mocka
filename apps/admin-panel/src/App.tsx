import { Navigate, Route, Routes, useNavigate } from "react-router";
import { IconLogo, LoginPage, Placeholder, RequireAuth, useAppSelector } from "@repo/shared";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import UsersPage from "./features/users";
import UsersProjects from "./features/user-projects";
import Workspaces from "./features/workspaces";
import ExplorerPage from "./features/explorer";
import HttpCodes from "./features/configs/http-codes";
import HttpMethods from "./features/configs/http-methods";
import ContentTypesPage from "./features/configs/content-types";
import ProtocolsPage from "./features/configs/protocols";
import DataTypesPage from "./features/configs/data-types";

function Login() {
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);
  if (token) return <Navigate to="/" replace />;
  return <LoginPage
    logo={<IconLogo className="h-10 w-10" />}
    title="Admin console"
    subtitle="Everything you need to run your workspace."
    highlights={["Manage users, roles and grants", "Audit every change", "Light, dark and your own accent color"]}
    onSuccess={() => navigate("/", { replace: true })}
  />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Add grant="YourGrantName" to restrict the whole admin panel to users who have that grant */}
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="reports" element={<Placeholder title="Reports" />} />
          <Route path="users" element={<UsersPage />} />
          {/* <Route path="users/:id/workspaces" element={<Workspaces />} /> */}
          <Route path="users/roles" element={<Placeholder title="Roles & grants" />} />
          <Route path="audit-log" element={<Placeholder title="Audit log" />} />
          <Route path="http-codes" element={<HttpCodes />} />
          <Route path="http-methods" element={<HttpMethods />} />
          <Route path="content-types" element={<ContentTypesPage />} />
          <Route path="protocols" element={<ProtocolsPage />} />
          <Route path="data-types" element={<DataTypesPage />} />
          <Route path="users/:id/workspaces" element={<ExplorerPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
