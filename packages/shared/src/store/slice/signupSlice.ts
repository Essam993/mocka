import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { signupApi } from "../services/signupApi";
import { getErrorMessage } from "../../api/client";
import { SignupInput } from "../../types/signup";

export interface SignupState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: SignupState = { status: "idle", error: null };

export const signupUser = createAsyncThunk<void, SignupInput, { rejectValue: string }>(
  "signup/submit",
  async (input, { rejectWithValue }) => {
    try {
      await signupApi.signup(input);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const slice = createSlice({
  name: "signup",
  initialState,
  reducers: {
    resetSignup: () => initialState,
  },
  extraReducers: (b) => {
    b.addCase(signupUser.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(signupUser.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(signupUser.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Signup failed";
      });
  },
});

export const { resetSignup } = slice.actions;
export const signupReducer = slice.reducer;