import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { authReducer, type AuthState } from "../auth/authSlice";
import { themeReducer, type ThemeState } from "../theme/themeSlice";
import { saveJSON } from "./storage";
import { signupReducer, SignupState } from "./slice/signupSlice";

/** Spread these into each app's configureStore, next to your own slices. */
export const sharedReducers = { auth: authReducer, theme: themeReducer, signup: signupReducer };

export interface SharedState {
  auth: AuthState;
  theme: ThemeState;
  signup: SignupState;
}
export type SharedDispatch = ThunkDispatch<SharedState, undefined, UnknownAction>;

export const useAppDispatch = () => useDispatch<SharedDispatch>();
export const useAppSelector = <T,>(selector: (s: SharedState) => T) => useSelector(selector);

/** Persists theme + access token to localStorage whenever they change. */
export function attachPersistence(store: { getState: () => unknown; subscribe: (l: () => void) => unknown }) {
  let prevTheme: unknown, prevToken: unknown;
  store.subscribe(() => {
    const s = store.getState() as SharedState;
    if (s.theme !== prevTheme) saveJSON("theme", (prevTheme = s.theme));
    if (s.auth.accessToken !== prevToken) saveJSON("accessToken", (prevToken = s.auth.accessToken));
  });
}
