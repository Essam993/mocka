import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";

import { dataTypesApi } from "../services/dataTypesApi";

import type {
  dataTypes,
  dataTypesInput,
  dataTypesUpdate,
} from "../../types/dataTypes";

export interface DataTypesState {
  items: dataTypes[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  saving: boolean;
  deletingIds: number[];
}

const initialState: DataTypesState = {
  items: [],
  status: "idle",
  error: null,
  saving: false,
  deletingIds: [],
};

type Rejected = {
  rejectValue: string;
};

type State = {
  dataTypes: DataTypesState;
};

/**
 * Sort data types by ID.
 */
const sorted = (list: dataTypes[]) =>
  [...list].sort((first, second) => first.id - second.id);

/**
 * Fetch data types.
 */
export const fetchDataTypes = createAsyncThunk<
  dataTypes[],
  { force?: boolean } | undefined,
  Rejected
>(
  "dataTypes/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await dataTypesApi.list();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as State).dataTypes;

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
 * Create data type.
 */
export const createDataTypes = createAsyncThunk<
  dataTypes,
  dataTypesInput,
  Rejected
>(
  "dataTypes/create",
  async (input, { rejectWithValue }) => {
    try {
      return await dataTypesApi.insert(input);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Update data type.
 */
export const updateDataTypes = createAsyncThunk<
  dataTypes,
  dataTypesUpdate,
  Rejected
>(
  "dataTypes/update",
  async (dataType, { rejectWithValue }) => {
    try {
      return await dataTypesApi.update(dataType);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Delete data type.
 */
export const deleteDataTypes = createAsyncThunk<
  number,
  number,
  Rejected
>(
  "dataTypes/delete",
  async (id, { rejectWithValue }) => {
    try {
      await dataTypesApi.remove(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const slice = createSlice({
  name: "dataTypes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchDataTypes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDataTypes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = sorted(action.payload);
      })
      .addCase(fetchDataTypes.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ?? "Could not load data types";
      })

      // Create
      .addCase(createDataTypes.pending, (state) => {
        state.saving = true;
      })
      .addCase(createDataTypes.fulfilled, (state, action) => {
        state.saving = false;

        if (!state.items.some((item) => item.id === action.payload.id)) {
          state.items = sorted([...state.items, action.payload]);
        }
      })
      .addCase(createDataTypes.rejected, (state) => {
        state.saving = false;
      })

      // Update
      .addCase(updateDataTypes.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateDataTypes.fulfilled, (state, action) => {
        state.saving = false;

        state.items = sorted(
          state.items.map((item) =>
            item.id === action.payload.id ? action.payload : item
          )
        );
      })
      .addCase(updateDataTypes.rejected, (state) => {
        state.saving = false;
      })

      // Delete
      .addCase(deleteDataTypes.pending, (state, action) => {
        if (!state.deletingIds.includes(action.meta.arg)) {
          state.deletingIds.push(action.meta.arg);
        }
      })
      .addCase(deleteDataTypes.fulfilled, (state, action) => {
        state.deletingIds = state.deletingIds.filter(
          (id) => id !== action.payload
        );

        state.items = state.items.filter(
          (item) => item.id !== action.payload
        );
      })
      .addCase(deleteDataTypes.rejected, (state, action) => {
        state.deletingIds = state.deletingIds.filter(
          (id) => id !== action.meta.arg
        );
      });
  },
});

export const DataTypesReducer = slice.reducer;