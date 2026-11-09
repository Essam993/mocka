import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api, basicAuth, endpoints, getErrorMessage } from "../api/client";
import { loadJSON } from "../store/storage";

export interface Grant {
  name: string;
}
export interface UserDetails {
  userId: number;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  grants: Grant[];
}
export interface LoginPayload {
  username: string;
  password: string;
}
export interface AuthState {
  accessToken: string | null;
  user: UserDetails | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
  /** true while a getUserDetails request is in flight (prevents duplicate calls) */
  userLoading: boolean;
}

/**
 * 2nd call: runs right after login (and on page refresh when a token exists).
 * It is skipped when a request is already running OR the user is already loaded,
 * so duplicate dispatches (StrictMode, redirects, stale renders) never cause extra network calls.
 * Pass { force: true } to reload the details on purpose (e.g. after the profile changes).
 */
export const fetchUserDetails = createAsyncThunk<UserDetails, { force?: boolean } | undefined, { rejectValue: string }>(
  "auth/fetchUserDetails",
  async (_, { rejectWithValue }) => {
    try {
      return (await api.get<UserDetails>(endpoints.userDetails)).data;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { userLoading, user } = (getState() as { auth: AuthState }).auth;
      return !userLoading && (!user || !!arg?.force);
    },
  },
);

/** 1st call: GET with Basic auth → { accessToken }, then we load the user details. */
export const login = createAsyncThunk<void, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.get<{ accessToken: string }>(endpoints.login, {
        headers: { Authorization: basicAuth(username, password) },
      });
      dispatch(setAccessToken(data.accessToken));
      const result = await dispatch(fetchUserDetails({ force: true }));
      // meta.condition = skipped because the same request is already running → that one will fill in the user
      if (fetchUserDetails.rejected.match(result) && !result.meta.condition) throw result.payload ?? "Could not load your account";
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const slice = createSlice({
  name: "auth",
  initialState: (): AuthState => ({
    accessToken: loadJSON<string | null>("accessToken", null),
    user: null,
    status: "idle",
    error: null,
    userLoading: false,
  }),
  reducers: {
    setAccessToken(state, { payload }: PayloadAction<string>) {
      state.accessToken = payload;
    },
    logout: (state) => {
      state.accessToken = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
      state.userLoading = false;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(login.fulfilled, (s) => {
        s.status = "idle";
      })
      .addCase(login.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Login failed";
        s.accessToken = null;
        s.user = null;
      })
      .addCase(fetchUserDetails.pending, (s) => {
        s.status = "loading";
        s.userLoading = true;
      })
      .addCase(fetchUserDetails.fulfilled, (s, a) => {
        s.status = "idle";
        s.userLoading = false;
        s.user = a.payload;
      })
      .addCase(fetchUserDetails.rejected, (s) => {
        s.status = "failed";
        s.userLoading = false;
        s.accessToken = null; // token is invalid → force re-login
        s.user = null;
      });
  },
});

export const { setAccessToken, logout, clearAuthError } = slice.actions;
export const authReducer = slice.reducer;

export const hasGrant = (user: UserDetails | null, grant: string) =>
  !!user?.grants.some((g) => g.name === grant);