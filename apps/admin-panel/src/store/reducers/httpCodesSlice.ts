import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { httpCodeApi } from "../services/httpCodeApi";
import { codeNumber, type HttpCode, type HttpCodeInput } from "../../types/httpCodes";

export interface HttpCodesState {
  items: HttpCode[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** an insert or update is in flight */
  saving: boolean;
  /** ids with a delete in flight */
  deletingIds: number[];
}

const initialState: HttpCodesState = { items: [], status: "idle", error: null, saving: false, deletingIds: [] };

type Rejected = { rejectValue: string };
type State = { httpCodes: HttpCodesState };

/** keeps the list in status-code order: 200, 201, … 504 */
const sorted = (list: HttpCode[]) => [...list].sort((a, b) => (codeNumber(a.name) ?? Infinity) - (codeNumber(b.name) ?? Infinity) || a.id - b.id);

/** Loaded once and reused. Retries after a failure, or on { force: true }. */
export const fetchHttpCodes = createAsyncThunk<HttpCode[], { force?: boolean } | undefined, Rejected>(
  "httpCodes/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await httpCodeApi.list();
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as State).httpCodes;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

/** The store only changes after the server confirms the new id */
export const createHttpCode = createAsyncThunk<HttpCode, HttpCodeInput, Rejected>("httpCodes/create", async (input, { rejectWithValue }) => {
  try {
    return await httpCodeApi.insert(input);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateHttpCode = createAsyncThunk<HttpCode, HttpCode, Rejected>("httpCodes/update", async (code, { rejectWithValue }) => {
  try {
    return await httpCodeApi.update(code);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteHttpCode = createAsyncThunk<number, number, Rejected>("httpCodes/delete", async (id, { rejectWithValue }) => {
  try {
    await httpCodeApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const slice = createSlice({
  name: "httpCodes",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchHttpCodes.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchHttpCodes.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = sorted(a.payload);
      })
      .addCase(fetchHttpCodes.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load the status codes";
      })
      .addCase(createHttpCode.pending, (s) => void (s.saving = true))
      .addCase(createHttpCode.fulfilled, (s, a) => {
        s.saving = false;
        if (!s.items.some((c) => c.id === a.payload.id)) s.items = sorted([...s.items, a.payload]);
      })
      .addCase(createHttpCode.rejected, (s) => void (s.saving = false))
      .addCase(updateHttpCode.pending, (s) => void (s.saving = true))
      .addCase(updateHttpCode.fulfilled, (s, a) => {
        s.saving = false;
        s.items = sorted(s.items.map((c) => (c.id === a.payload.id ? a.payload : c)));
      })
      .addCase(updateHttpCode.rejected, (s) => void (s.saving = false))
      .addCase(deleteHttpCode.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteHttpCode.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((c) => c.id !== a.payload);
      })
      .addCase(deleteHttpCode.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const httpCodesReducer = slice.reducer;