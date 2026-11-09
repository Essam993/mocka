import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { httpMethodApi } from "../services/httpMethodApi";
import { HttpMethod, HttpMethodInput } from "../../types/httpMethods";

export interface HttpMethodState {
  items: HttpMethod[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** an insert or update is in flight */
  saving: boolean;
  /** ids with a delete in flight */
  deletingIds: number[];
}

const initialState: HttpMethodState = { items: [], status: "idle", error: null, saving: false, deletingIds: [] };

type Rejected = { rejectValue: string };
type State = { httpCodes: HttpMethodState };

/** keeps the list in status-code order: 200, 201, … 504 */
const sorted = (list: HttpMethod[]) => [...list].sort((a, b) => (a.id - b.id));

/** Loaded once and reused. Retries after a failure, or on { force: true }. */
export const fetchHttpMethods = createAsyncThunk<HttpMethod[], { force?: boolean } | undefined, Rejected>(
  "httpMethods/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await httpMethodApi.list();
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
export const createHttpMethod = createAsyncThunk<HttpMethod, HttpMethodInput, Rejected>("httpMethod/create", async (input, { rejectWithValue }) => {
  try {
    return await httpMethodApi.insert(input);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateHttpMethod = createAsyncThunk<HttpMethod, HttpMethod, Rejected>("httpMethod/update", async (code, { rejectWithValue }) => {
  try {
    return await httpMethodApi.update(code);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteHttpMethod = createAsyncThunk<number, number, Rejected>("httpMethod/delete", async (id, { rejectWithValue }) => {
  try {
    await httpMethodApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const slice = createSlice({
  name: "httpMethod",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchHttpMethods.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchHttpMethods.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = sorted(a.payload);
      })
      .addCase(fetchHttpMethods.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load the http methods";
      })
      .addCase(createHttpMethod.pending, (s) => void (s.saving = true))
      .addCase(createHttpMethod.fulfilled, (s, a) => {
        s.saving = false;
        if (!s.items.some((c) => c.id === a.payload.id)) s.items = sorted([...s.items, a.payload]);
      })
      .addCase(createHttpMethod.rejected, (s) => void (s.saving = false))
      .addCase(updateHttpMethod.pending, (s) => void (s.saving = true))
      .addCase(updateHttpMethod.fulfilled, (s, a) => {
        s.saving = false;
        s.items = sorted(s.items.map((c) => (c.id === a.payload.id ? a.payload : c)));
      })
      .addCase(updateHttpMethod.rejected, (s) => void (s.saving = false))
      .addCase(deleteHttpMethod.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteHttpMethod.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((c) => c.id !== a.payload);
      })
      .addCase(deleteHttpMethod.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const httpMethodReducer = slice.reducer;