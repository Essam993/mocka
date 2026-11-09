import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { dataTypeApi } from "../services/dataTypeApi";
import { DataType } from "../../types/projectVariable";

export interface DataTypesState {
  items: DataType[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: DataTypesState = { items: [], status: "idle", error: null };

/** Loaded once and reused. Retries after a failure, or on { force: true }. */
export const fetchDataTypes = createAsyncThunk<DataType[], { force?: boolean } | undefined, { rejectValue: string }>(
  "dataTypes/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await dataTypeApi.list();
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as { dataTypes: DataTypesState }).dataTypes;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

const slice = createSlice({
  name: "dataTypes",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDataTypes.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchDataTypes.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchDataTypes.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load data types";
      });
  },
});

export const dataTypesReducer = slice.reducer;