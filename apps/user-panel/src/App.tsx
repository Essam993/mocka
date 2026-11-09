import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import {
  IconLogo,
  LoginPage,
  Placeholder,
  RequireAuth,
  SignupPage,
  fetchUserDetails,
  useAppDispatch,
  useAppSelector,
} from "@repo/shared";

import UserLayout from "./layouts/UserLayout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import UsersProjects from "./features/user-projects";
import ProjectCollections from "./features/collections/ProjectCollections";
import AuthSwitch from "./components/AuthSwitch";
import CollectionApis from "./features/collection-apis/CollectionApis";
import WorkspaceSettings from "./features/workspace-settings";
import GlobalVariables from "./features/global-variables";
import Schemas from "./features/schemas/Schema";
import ProjectSettings from "./features/project-settings";
import SetupScreen from "./features/setup/SetupScreen";
import ApiData from "./features/api-data";

function Login() {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.accessToken);

  if (token) {
    return <Navigate to="/" replace />;
  }

  return (
    <LoginPage
      logo={<IconLogo className="h-10 w-10" />}
      title="Mocka"
      subText="by Tangerine Digital"
      subtitle="An account adds"
      highlights={[
        "Your work on any device, safe if this browser's data is cleared",
        "Read-only share links and live docs",
        "Custom domains",
        "Analytics history beyond this session",
        "Everything else already works without an account.",
      ]}
      onSuccess={() => navigate("/", { replace: true })}
      footer={
        <AuthSwitch
          text="Don't have an account?"
          linkText="Sign up"
          to="/signup"
        />
      }
    />
  );
}

function Signup() {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.accessToken);

  if (token) {
    return <Navigate to="/" replace />;
  }

  return (
    <SignupPage
      logo={<IconLogo className="h-10 w-10" />}
      title="Create your account"
      subtitle="It only takes a minute."
      subText="by Tangerine Digital"
      highlights={[
        "Your work on any device, safe if this browser's data is cleared",
        "Read-only share links and live docs",
        "Custom domains",
        "Analytics history beyond this session",
        "Everything else already works without an account.",
      ]}
      onSuccess={() => navigate("/login", { replace: true })}
      footer={
        <AuthSwitch
          text="Already have an account?"
          linkText="Log in"
          to="/login"
        />
      }
    />
  );
}

export default function App() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);

  // Restore user details after refreshing when the token already exists.
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchUserDetails());
    }
  }, [dispatch, token, user]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<UserLayout />}>
        {/* Public routes */}
        <Route index element={<Home />} />

        {/* Authentication-required routes */}
        <Route element={<RequireAuth />}>
          {/* Workspace-level routes */}
          <Route path="projects" element={<UsersProjects />} />
          <Route
            path="analytics"
            element={<Placeholder title="Analytics" />}
          />
          <Route path="global-variables" element={<GlobalVariables />} />
          <Route path="schemas" element={<Schemas />} />
          <Route path="settings" element={<WorkspaceSettings />} />
          <Route path="project-settings" element={<ProjectSettings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="setup" element={<SetupScreen />} />

          {/* Project-level routes */}
          <Route
            path="projects/:projectId"
            element={<Placeholder title="Project overview" />}
          />
          <Route
            path="projects/:projectId/collaborators"
            element={<Placeholder title="Collaborators" />}
          />
          <Route
            path="projects/:projectId/collections"
            element={<ProjectCollections />}
          />
          <Route
            path="projects/:projectId/collections/:collectionId/apis"
            element={<CollectionApis />}
          />
          <Route path="projects/:projectId/collections/:collectionId/apis/:apiId/schema" element={<Placeholder title="Schema" />} />
          <Route path="projects/:projectId/collections/:collectionId/apis/:apiId/behavior" element={<Placeholder title="Behavior" />} />
          <Route path="projects/:projectId/collections/:collectionId/apis/:apiId/data" element={<ApiData />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}