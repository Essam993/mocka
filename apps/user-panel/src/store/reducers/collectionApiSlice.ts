import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { endpointApi } from "../services/endpointApi";
import { CollectionApi } from "../../types/collectionApi";

export interface CollectionApisState {
  items: CollectionApi[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** which collection the current `items` belong to */
  loadedCollectionId: number | null;
}

const initialState: CollectionApisState = { items: [], status: "idle", error: null, loadedCollectionId: null };

/** Another collection always fetches. The same one is skipped unless { force: true }. */
export const fetchCollectionApis = createAsyncThunk<CollectionApi[], { collectionId: number; force?: boolean }, { rejectValue: string }>(
  "collectionApis/fetch",
  async ({ collectionId }, { rejectWithValue }) => {
    try {
      return await endpointApi.list(collectionId);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ collectionId, force }, { getState }) => {
      const { status, loadedCollectionId } = (getState() as { collectionApis: CollectionApisState }).collectionApis;
      if (loadedCollectionId !== collectionId) return true;
      if (status === "loading") return false;
      return !!force || status === "idle" || status === "failed";
    },
  },
);

const slice = createSlice({
  name: "collectionApis",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCollectionApis.pending, (s, a) => {
      s.status = "loading";
      s.error = null;
      if (s.loadedCollectionId !== a.meta.arg.collectionId) s.items = []; // don't flash another collection's APIs
      s.loadedCollectionId = a.meta.arg.collectionId;
    })
      .addCase(fetchCollectionApis.fulfilled, (s, a) => {
        if (a.meta.arg.collectionId !== s.loadedCollectionId) return; // stale response
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchCollectionApis.rejected, (s, a) => {
        if (a.meta.arg.collectionId !== s.loadedCollectionId) return;
        s.status = "failed";
        s.error = a.payload ?? "Could not load the APIs";
      });
  },
});

export const collectionApisReducer = slice.reducer;