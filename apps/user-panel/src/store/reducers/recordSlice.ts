import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { RecordOption } from "../../types/projectVariable";
import { schemaApi } from "../services/schemaApi";

export interface RecordsState {
  items: RecordOption[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: RecordsState = { items: [], status: "idle", error: null };

/** Loaded once and reused. Retries after a failure, or on { force: true }. */
export const fetchRecords = createAsyncThunk<RecordOption[], { projectId: number; force?: boolean } | undefined, { rejectValue: string }>(
  "records/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await schemaApi.list();
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as { records: RecordsState }).records;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

const slice = createSlice({
  name: "records",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchRecords.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchRecords.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchRecords.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load records";
      });
  },
});

export const recordsReducer = slice.reducer;