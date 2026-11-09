import { createAsyncThunk, createSlice, type ActionReducerMapBuilder, type PayloadAction } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { endpointResponseApi } from "../services/endpointResponseApi";
import type { EndpointContext } from "../../types/endpointVariable";
import type { EndpointResponse, LookupOption, ResponseWrite } from "../../types/endpointResponse";

type Rejected = { rejectValue: string };
type Status = "idle" | "loading" | "succeeded" | "failed";

interface Lookup {
  items: LookupOption[];
  status: Status;
  error: string | null;
}

export interface EndpointResponsesState {
  byEndpoint: Record<number, EndpointResponse[]>;
  /** endpoint ids with a list request in flight */
  loading: number[];
  errors: Record<number, string>;
  /** "r:<responseId>" or "v:<variableRowId>" of the deletes in flight */
  deleting: string[];
  httpCodes: Lookup;
  contentTypes: Lookup;
}

type State = { endpointResponses: EndpointResponsesState };

const lookup = (): Lookup => ({ items: [], status: "idle", error: null });
const initialState: EndpointResponsesState = { byEndpoint: {}, loading: [], errors: {}, deleting: [], httpCodes: lookup(), contentTypes: lookup() };

/* --------------------------------- thunks --------------------------------- */

/** Loads one endpoint's responses. Skipped when cached or loading, unless { force: true }. */
export const fetchEndpointResponses = createAsyncThunk<{ endpointId: number; rows: EndpointResponse[] }, { endpointId: number; force?: boolean }, Rejected>(
  "endpointResponses/fetch",
  async ({ endpointId }, { rejectWithValue }) => {
    try {
      return { endpointId, rows: await endpointResponseApi.list(endpointId) };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ endpointId, force }, { getState }) => {
      const s = (getState() as State).endpointResponses;
      if (s.loading.includes(endpointId)) return false;
      return !!force || s.byEndpoint[endpointId] === undefined;
    },
  },
);

/** One factory for both lookups: loaded once and reused; retries after a failure or on { force: true } */
const lookupThunk = (type: string, load: () => Promise<LookupOption[]>, pick: (s: State) => Lookup) =>
  createAsyncThunk<LookupOption[], { force?: boolean } | undefined, Rejected>(
    type,
    async (_, { rejectWithValue }) => {
      try {
        return await load();
      } catch (e) {
        return rejectWithValue(getErrorMessage(e));
      }
    },
    {
      condition: (arg, { getState }) => {
        const { status } = pick(getState() as State);
        if (status === "loading") return false;
        return !!arg?.force || status === "idle" || status === "failed";
      },
    },
  );

export const fetchHttpCodes = lookupThunk("endpointResponses/httpCodes", endpointResponseApi.httpCodes, (s) => s.endpointResponses.httpCodes);
export const fetchContentTypes = lookupThunk("endpointResponses/contentTypes", endpointResponseApi.contentTypes, (s) => s.endpointResponses.contentTypes);

interface Saved {
  endpointId: number;
  rows: EndpointResponse[];
}

/** insert and update: throw without ids, so the store is never patched on a doubtful response */
const saveThunk = (type: string, call: (ctx: EndpointContext, rows: ResponseWrite[]) => Promise<EndpointResponse[]>) =>
  createAsyncThunk<Saved, { ctx: EndpointContext; rows: ResponseWrite[] }, Rejected>(type, async ({ ctx, rows }, { rejectWithValue }) => {
    try {
      return { endpointId: ctx.endpointId, rows: await call(ctx, rows) };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  });

export const insertEndpointResponses = saveThunk("endpointResponses/insert", endpointResponseApi.insert);
export const updateEndpointResponses = saveThunk("endpointResponses/update", endpointResponseApi.update);

/** Deletes one variable of a response: the response is sent with that variable at statusId 0 */
export const deleteResponseVariable = createAsyncThunk<
  { endpointId: number; responseId: number; rowId: number },
  { ctx: EndpointContext; responseId: number; rowId: number; response: ResponseWrite },
  Rejected
>("endpointResponses/deleteVariable", async ({ ctx, responseId, rowId, response }, { rejectWithValue }) => {
  try {
    await endpointResponseApi.remove(ctx, response);
    return { endpointId: ctx.endpointId, responseId, rowId };
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

/** Deletes a whole response: it and all its variables are sent with statusId 0 */
export const deleteEndpointResponse = createAsyncThunk<
  { endpointId: number; responseId: number },
  { ctx: EndpointContext; responseId: number; response: ResponseWrite },
  Rejected
>("endpointResponses/deleteResponse", async ({ ctx, responseId, response }, { rejectWithValue }) => {
  try {
    await endpointResponseApi.remove(ctx, response);
    return { endpointId: ctx.endpointId, responseId };
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

/* --------------------------------- reducers --------------------------------- */

const lookupCases = (b: ActionReducerMapBuilder<EndpointResponsesState>, thunk: typeof fetchHttpCodes, key: "httpCodes" | "contentTypes", fallback: string) => {
  b.addCase(thunk.pending, (s) => {
    s[key].status = "loading";
    s[key].error = null;
  })
    .addCase(thunk.fulfilled, (s, a) => {
      s[key] = { items: a.payload, status: "succeeded", error: null };
    })
    .addCase(thunk.rejected, (s, a) => {
      s[key].status = "failed";
      s[key].error = a.payload ?? fallback;
    });
};

/** merges saved responses into the list; variables the server didn't send back (unchanged ones) stay as they were */
const upsert = (s: EndpointResponsesState, a: PayloadAction<Saved>) => {
  const list = s.byEndpoint[a.payload.endpointId];
  if (!list) return; // never loaded
  for (const row of a.payload.rows) {
    const i = list.findIndex((x) => x.id === row.id);
    if (i < 0) {
      list.push(row);
      continue;
    }
    const kept = list[i].variables.filter((v) => !row.variables.some((n) => n.id === v.id));
    list[i] = { ...row, variables: [...kept, ...row.variables] };
  }
};

const slice = createSlice({
  name: "endpointResponses",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    lookupCases(b, fetchHttpCodes, "httpCodes", "Could not load the status codes");
    lookupCases(b, fetchContentTypes, "contentTypes", "Could not load the body types");

    b.addCase(fetchEndpointResponses.pending, (s, a) => {
      s.loading.push(a.meta.arg.endpointId);
      delete s.errors[a.meta.arg.endpointId];
    })
      .addCase(fetchEndpointResponses.fulfilled, (s, a) => {
        s.loading = s.loading.filter((id) => id !== a.payload.endpointId);
        s.byEndpoint[a.payload.endpointId] = a.payload.rows;
      })
      .addCase(fetchEndpointResponses.rejected, (s, a) => {
        s.loading = s.loading.filter((id) => id !== a.meta.arg.endpointId);
        s.errors[a.meta.arg.endpointId] = a.payload ?? "Could not load the responses";
      })
      .addCase(insertEndpointResponses.fulfilled, upsert)
      .addCase(updateEndpointResponses.fulfilled, upsert)
      .addCase(deleteResponseVariable.pending, (s, a) => void s.deleting.push(`v:${a.meta.arg.rowId}`))
      .addCase(deleteResponseVariable.fulfilled, (s, a) => {
        const { endpointId, responseId, rowId } = a.payload;
        s.deleting = s.deleting.filter((t) => t !== `v:${rowId}`);
        const r = s.byEndpoint[endpointId]?.find((x) => x.id === responseId);
        if (r) r.variables = r.variables.filter((v) => v.id !== rowId);
      })
      .addCase(deleteResponseVariable.rejected, (s, a) => {
        s.deleting = s.deleting.filter((t) => t !== `v:${a.meta.arg.rowId}`);
      })
      .addCase(deleteEndpointResponse.pending, (s, a) => void s.deleting.push(`r:${a.meta.arg.responseId}`))
      .addCase(deleteEndpointResponse.fulfilled, (s, a) => {
        s.deleting = s.deleting.filter((t) => t !== `r:${a.payload.responseId}`);
        const list = s.byEndpoint[a.payload.endpointId];
        if (list) s.byEndpoint[a.payload.endpointId] = list.filter((x) => x.id !== a.payload.responseId);
      })
      .addCase(deleteEndpointResponse.rejected, (s, a) => {
        s.deleting = s.deleting.filter((t) => t !== `r:${a.meta.arg.responseId}`);
      });
  },
});

export const endpointResponsesReducer = slice.reducer;