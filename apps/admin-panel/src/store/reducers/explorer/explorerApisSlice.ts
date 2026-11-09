import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { apiLevel, endpointCalls } from "../../services/explorerApi";
import type { EndpointInput, ExplorerApi, ExplorerEndpoint } from "../../../types/explorer";
import { explorerCollections } from "./explorerCollectionsSlice";
import { createLevelSlice, type LevelState } from "../levelSlice";

type Rejected = { rejectValue: string };

/* endpoints: they are saved on their own, but live inside the APIs of byParent[collectionId] */

export const insertEndpoint = createAsyncThunk<
  { collectionId: number; row: ExplorerEndpoint },
  { collectionId: number; apiId: number; input: EndpointInput },
  Rejected
>("explorerApis/insertEndpoint", async ({ collectionId, apiId, input }, { rejectWithValue }) => {
  try {
    return { collectionId, row: await endpointCalls.insert(apiId, input) }; // throws without an id
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateEndpoint = createAsyncThunk<
  { collectionId: number; row: ExplorerEndpoint },
  { collectionId: number; endpoint: ExplorerEndpoint },
  Rejected
>("explorerApis/updateEndpoint", async ({ collectionId, endpoint }, { rejectWithValue }) => {
  try {
    return { collectionId, row: await endpointCalls.update(endpoint) };
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteEndpoint = createAsyncThunk<
  { collectionId: number; apiId: number; id: number },
  { collectionId: number; endpoint: ExplorerEndpoint },
  Rejected
>("explorerApis/deleteEndpoint", async ({ collectionId, endpoint }, { rejectWithValue }) => {
  try {
    await endpointCalls.remove(endpoint);
    return { collectionId, apiId: endpoint.apiId, id: endpoint.id };
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const apiOf = (s: LevelState<ExplorerApi>, collectionId: number, apiId: number) => s.byParent[collectionId]?.items.find((a) => a.id === apiId);

/** APIs (with their endpoints) of a collection: byParent[collectionId] */
export const explorerApis = createLevelSlice("explorerApis", apiLevel, (b) => {
  // deleting a collection drops the APIs cached under it
  b.addCase(explorerCollections.remove.fulfilled, (s, a) => {
    delete s.byParent[a.payload.id];
  })
    .addCase(insertEndpoint.pending, (s) => void (s.saving = true))
    .addCase(insertEndpoint.fulfilled, (s, a) => {
      s.saving = false;
      const owner = apiOf(s, a.payload.collectionId, a.payload.row.apiId);
      if (owner && !owner.endpoints.some((e) => e.id === a.payload.row.id)) owner.endpoints.push(a.payload.row);
    })
    .addCase(insertEndpoint.rejected, (s) => void (s.saving = false))
    .addCase(updateEndpoint.pending, (s) => void (s.saving = true))
    .addCase(updateEndpoint.fulfilled, (s, a) => {
      s.saving = false;
      const owner = apiOf(s, a.payload.collectionId, a.payload.row.apiId);
      if (owner) owner.endpoints = owner.endpoints.map((e) => (e.id === a.payload.row.id ? a.payload.row : e));
    })
    .addCase(updateEndpoint.rejected, (s) => void (s.saving = false))
    .addCase(deleteEndpoint.pending, (s, a) => void s.deleting.push(`e${a.meta.arg.endpoint.id}`))
    .addCase(deleteEndpoint.fulfilled, (s, a) => {
      s.deleting = s.deleting.filter((t) => t !== `e${a.payload.id}`);
      const owner = apiOf(s, a.payload.collectionId, a.payload.apiId);
      if (owner) owner.endpoints = owner.endpoints.filter((e) => e.id !== a.payload.id);
    })
    .addCase(deleteEndpoint.rejected, (s, a) => {
      s.deleting = s.deleting.filter((t) => t !== `e${a.meta.arg.endpoint.id}`);
    });
});