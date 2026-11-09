import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Result, Spin } from "antd";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchUserDetails, hasGrant } from "./authSlice";

interface Props {
  loginPath?: string;
  /** Optional: require a grant name from `user.grants` (e.g. "Test222") */
  grant?: string;
}

/** Wrap protected routes: <Route element={<RequireAuth grant="Test222" />}> ... </Route> */
export function RequireAuth({ loginPath = "/login", grant }: Props) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { accessToken, user } = useAppSelector((s) => s.auth);

  // Page refresh: we still have the token but not the user → reload details.
  useEffect(() => {
    if (accessToken && !user) dispatch(fetchUserDetails());
  }, [accessToken, user, dispatch]);

  if (!accessToken) return <Navigate to={loginPath} replace state={{ from: location }} />;
  if (!user)
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <Spin size="large" />
      </div>
    );
  if (grant && !hasGrant(user, grant))
    return <Result status="403" title="No access" subTitle="Your account doesn't have permission to open this panel." />;

  return <Outlet />;
}
