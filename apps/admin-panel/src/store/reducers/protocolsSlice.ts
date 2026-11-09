import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";

import { ProtocolsApi } from "../services/protocolsApi";
import type {
  Protocols,
  ProtocolsInput,
} from "../../types/protocols";

export interface ProtocolsState {
  items: Protocols[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  saving: boolean;
  deletingIds: number[];
}

const initialState: ProtocolsState = {
  items: [],
  status: "idle",
  error: null,
  saving: false,
  deletingIds: [],
};

type Rejected = {
  rejectValue: string;
};

/**
 * IMPORTANT:
 * The key must match the reducer registration in store.ts.
 */
type State = {
  protocols: ProtocolsState;
};

/**
 * Sort protocols by ID.
 */
const sorted = (list: Protocols[]) =>
  [...list].sort((first, second) => first.id - second.id);

/**
 * Fetch protocols.
 * Loaded once and reused.
 * Retries after failure or when force is true.
 */
export const fetchProtocols = createAsyncThunk<
  Protocols[],
  { force?: boolean } | undefined,
  Rejected
>(
  "protocols/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await ProtocolsApi.list();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as State).protocols;

      if (status === "loading") return false;

      return (
        !!arg?.force ||
        status === "idle" ||
        status === "failed"
      );
    },
  }
);

/**
 * Create protocol.
 */
export const createProtocol = createAsyncThunk<
  Protocols,
  ProtocolsInput,
  Rejected
>("protocols/create", async (input, { rejectWithValue }) => {
  try {
    return await ProtocolsApi.insert(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Update protocol.
 */
export const updateProtocol = createAsyncThunk<
  Protocols,
  Protocols,
  Rejected
>("protocols/update", async (protocol, { rejectWithValue }) => {
  try {
    return await ProtocolsApi.update(protocol);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Delete protocol.
 */
export const deleteProtocol = createAsyncThunk<
  number,
  number,
  Rejected
>("protocols/delete", async (id, { rejectWithValue }) => {
  try {
    await ProtocolsApi.remove(id);
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const slice = createSlice({
  name: "protocols",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchProtocols.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProtocols.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = sorted(action.payload);
      })
      .addCase(fetchProtocols.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ?? "Could not load the protocols";
      })

      // Create
      .addCase(createProtocol.pending, (state) => {
        state.saving = true;
      })
      .addCase(createProtocol.fulfilled, (state, action) => {
        state.saving = false;

        if (!state.items.some((item) => item.id === action.payload.id)) {
          state.items = sorted([...state.items, action.payload]);
        }
      })
      .addCase(createProtocol.rejected, (state) => {
        state.saving = false;
      })

      // Update
      .addCase(updateProtocol.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateProtocol.fulfilled, (state, action) => {
        state.saving = false;

        state.items = sorted(
          state.items.map((item) =>
            item.id === action.payload.id ? action.payload : item
          )
        );
      })
      .addCase(updateProtocol.rejected, (state) => {
        state.saving = false;
      })

      // Delete
      .addCase(deleteProtocol.pending, (state, action) => {
        if (!state.deletingIds.includes(action.meta.arg)) {
          state.deletingIds.push(action.meta.arg);
        }
      })
      .addCase(deleteProtocol.fulfilled, (state, action) => {
        state.deletingIds = state.deletingIds.filter(
          (id) => id !== action.payload
        );

        state.items = state.items.filter(
          (item) => item.id !== action.payload
        );
      })
      .addCase(deleteProtocol.rejected, (state, action) => {
        state.deletingIds = state.deletingIds.filter(
          (id) => id !== action.meta.arg
        );
      });
  },
});

export const protocolsReducer = slice.reducer;