import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { apiDataApi } from "../services/apiDataApi";
import type { DataValues } from "../../types/apiData";

export interface ApiDataState {
  /** the records stored on the server, per API id */
  saved: Record<number, DataValues[]>;
  /** API ids with a read request in flight */
  loading: number[];
  errors: Record<number, string>;
  saving: boolean;
}

const initialState: ApiDataState = { saved: {}, loading: [], errors: {}, saving: false };

type Rejected = { rejectValue: string };
type State = { apiData: ApiDataState };

/** Loads the saved records of one API. Skipped when cached or loading, unless { force: true }. */
export const fetchApiData = createAsyncThunk<{ apiId: number; rows: DataValues[] }, { apiId: number; force?: boolean }, Rejected>(
  "apiData/fetch",
  async ({ apiId }, { rejectWithValue }) => {
    try {
      return { apiId, rows: await apiDataApi.list(apiId) };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ apiId, force }, { getState }) => {
      const s = (getState() as State).apiData;
      if (s.loading.includes(apiId)) return false;
      return !!force || s.saved[apiId] === undefined;
    },
  },
);

/** Posts the records to generateData. The store only changes when the server confirms. */
export const saveApiData = createAsyncThunk<{ apiId: number; rows: DataValues[] }, { apiId: number; rows: DataValues[] }, Rejected>(
  "apiData/save",
  async ({ apiId, rows }, { rejectWithValue }) => {
    try {
      await apiDataApi.save(apiId, rows);
      return { apiId, rows };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const slice = createSlice({
  name: "apiData",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchApiData.pending, (s, a) => {
      s.loading.push(a.meta.arg.apiId);
      delete s.errors[a.meta.arg.apiId];
    })
      .addCase(fetchApiData.fulfilled, (s, a) => {
        s.loading = s.loading.filter((id) => id !== a.payload.apiId);
        s.saved[a.payload.apiId] = a.payload.rows;
      })
      .addCase(fetchApiData.rejected, (s, a) => {
        s.loading = s.loading.filter((id) => id !== a.meta.arg.apiId);
        s.errors[a.meta.arg.apiId] = a.payload ?? "Could not load the saved data";
      })
      .addCase(saveApiData.pending, (s) => void (s.saving = true))
      .addCase(saveApiData.fulfilled, (s, a) => {
        s.saving = false;
        s.saved[a.payload.apiId] = a.payload.rows;
      })
      .addCase(saveApiData.rejected, (s) => void (s.saving = false));
  },
});

export const apiDataReducer = slice.reducer;