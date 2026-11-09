import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import type { LookupItem, LookupKey } from "../../types/collectionApi";
import type { RootState } from "..";
import { collectionApisApi } from "../services/collectionApis";

type Status = "idle" | "loading" | "succeeded" | "failed";

interface LookupState {
  items: LookupItem[];
  status: Status;
  error?: string;
}

const empty = (): LookupState => ({ items: [], status: "idle" });

const initialState: Record<LookupKey, LookupState> = {
  methods: empty(),
  conditions: empty(),
  statusCodes: empty(),
  headerNames: empty(),
  dynamicValues: empty(),
};

/** Loads one dropdown. Cached: it only hits the server again when it failed or when force is true. */
export const fetchLookup = createAsyncThunk<LookupItem[], { key: LookupKey; force?: boolean }, { state: RootState; rejectValue: string }>(
  "lookups/fetch",
  async ({ key }, { rejectWithValue }) => {
    try {
      return await collectionApisApi.lookup(key);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ key, force }, { getState }) => {
      const s = getState().Lookups[key];
      if (s.status === "loading") return false;
      return force || s.status === "idle" || s.status === "failed";
    },
  },
);

const lookupsSlice = createSlice({
  name: "lookups",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLookup.pending, (state, { meta }) => {
        state[meta.arg.key].status = "loading";
        state[meta.arg.key].error = undefined;
      })
      .addCase(fetchLookup.fulfilled, (state, { meta, payload }) => {
        state[meta.arg.key] = { items: payload, status: "succeeded" };
      })
      .addCase(fetchLookup.rejected, (state, { meta, payload, error }) => {
        state[meta.arg.key].status = "failed";
        state[meta.arg.key].error = payload ?? error.message;
      });
  },
});

export const LookupsReducer = lookupsSlice.reducer;
