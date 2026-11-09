import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type {
  ApiInput,
  CollectionInput,
  EndpointInput,
  ExplorerApi,
  ExplorerCollection,
  ExplorerEndpoint,
  ExplorerProject,
  ExplorerWorkspace,
  ProjectInput,
  WorkspaceInput,
} from "../../types/explorer";
import { LevelApi } from "../reducers/levelSlice";

const BASE = "/api/backend/admin-panel"; // ★ if the admin panel reuses the user-panel paths, change this one line

/** ★ confirm every path marked ★. The ones without a star come from what you already shared. */
export const EXPLORER_ENDPOINTS = {
  workspaces: {
    list: `${BASE}/getUserWorkspaces`, // ★ GET ?mockaUserId=
    insert: `${BASE}/insertWorkspace`, // ★ POST { name, alias, mockaUserId }
    update: `${BASE}/updateWorkspace`, // ★ PUT
    remove: `${BASE}/deleteWorkspace`, // ★ DELETE body { id }
  },
  projects: {
    list: `${BASE}/getWorkspaceProjects`, // ★ GET ?workspaceId=
    insert: `${BASE}/insertWorkspaceProject`, // POST { name, description, workspaceId }
    update: `${BASE}/updateWorkspaceProject`, // PUT
    remove: `${BASE}/deleteWorkspaceProject`, // DELETE body { id }
  },
  collections: {
    list: `${BASE}/getProjectCollections`, // ★ GET ?projectId=
    insert: `${BASE}/insertProjectCollection`, // ★ POST { name, auth_required, project_id }
    update: `${BASE}/updateProjectCollection`, // ★ PUT
    remove: `${BASE}/deleteProjectCollection`, // ★ DELETE body { id }
  },
  apis: {
    list: `${BASE}/getApis`, // ★ GET ?collectionId= → [{ id, name, endpoints: [...] }]
    insert: `${BASE}/insertApi`, // ★ POST { collectionId, name, description }
    update: `${BASE}/updateApi`, // ★ PUT
    remove: `${BASE}/deleteApi`, // ★ DELETE body { id }
  },
  endpoints: {
    insert: `${BASE}/insertEndpoint`, // ★ POST { apiId, path, method, description }
    update: `${BASE}/updateEndpoint`, // ★ PUT
    remove: `${BASE}/deleteEndpoint`, // ★ DELETE body { id }
  },
} as const;

/** true = the delete answers with the id and a missing id is an error; false = a SUCCESS status is enough */
const DELETE_NEEDS_ID = { workspace: true, project: true, collection: true, api: true, endpoint: true };

/* ------------------------------- reading responses ------------------------------- */

/** Every call reads its payload from `response.data.data`, after checking `response.data.status`. */
function read<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

type Idish = number | { id?: number | null } | ({ id?: number | null } | null)[] | null | undefined;

/** Throws unless the response carries an id ({ id }, [{ id }] or a bare number), so the store is never patched on a doubtful response */
function confirmedId(data: Idish, what: string): number {
  const one = Array.isArray(data) ? data[0] : data;
  const id = typeof one === "number" ? one : one?.id;
  if (id == null) throw new Error(`The server did not confirm the ${what} (no id returned)`);
  return id;
}

const afterDelete = (kind: keyof typeof DELETE_NEEDS_ID, data: Idish) => {
  if (DELETE_NEEDS_ID[kind]) confirmedId(data, `${kind} delete`);
};

/** the first object of an insert response, whatever shape it has */
const recordOf = (data: unknown): Record<string, unknown> => {
  const one = Array.isArray(data) ? data[0] : data;
  return one && typeof one === "object" ? (one as Record<string, unknown>) : {};
};

/** keeps only rows that have an id; tolerates null rows, a null list or a non-array */
const rows = <T extends { id?: number | null }>(list: readonly (T | null)[] | null | undefined): (T & { id: number })[] =>
  (Array.isArray(list) ? (list as (T | null)[]) : []).filter((r): r is T & { id: number } => r != null && r.id != null);

/* ----------------------------------- mappers ----------------------------------- */

interface WorkspaceDto { id?: number | null; name?: string | null; alias?: string | null; mockaUserId?: number | null; [extra: string]: unknown }
interface ProjectDto { id?: number | null; name?: string | null; description?: string | null; workspaceId?: number | null; [extra: string]: unknown }
interface CollectionDto { id?: number | null; name?: string | null; projectId?: number | null; required?: boolean | null }
interface EndpointDto { id?: number | null; path?: string | null; method?: string | null; description?: string | null }
interface ApiDto { id?: number | null; name?: string | null; description?: string | null; endpoints?: (EndpointDto | null)[] | null }

const toWorkspace = (d: WorkspaceDto & { id: number }, userId: number): ExplorerWorkspace => ({
  ...d,
  id: d.id,
  name: d.name ?? "",
  alias: d.alias ?? "",
  mockaUserId: d.mockaUserId ?? userId,
});

const toProject = (d: ProjectDto & { id: number }, workspaceId: number): ExplorerProject => ({
  ...d,
  id: d.id,
  name: d.name ?? "",
  description: d.description ?? "",
  workspaceId: d.workspaceId ?? workspaceId,
});

const toCollection = (d: CollectionDto & { id: number }, projectId: number): ExplorerCollection => ({
  id: d.id,
  name: d.name ?? "",
  required: !!d.required,
  projectId: d.projectId ?? projectId,
});

const toEndpoint = (d: EndpointDto & { id: number }, apiId: number): ExplorerEndpoint => ({
  id: d.id,
  path: d.path ?? "",
  method: (d.method ?? "GET").toUpperCase(),
  description: d.description ?? "",
  apiId,
});

const toApi = (d: ApiDto & { id: number }, collectionId: number): ExplorerApi => ({
  id: d.id,
  name: d.name ?? `API ${d.id}`,
  description: d.description ?? "",
  collectionId,
  endpoints: rows(d.endpoints).map((e) => toEndpoint(e, d.id)),
});

/* ------------------------------------ levels ------------------------------------ */

const EP = EXPLORER_ENDPOINTS;

export const workspaceLevel: LevelApi<ExplorerWorkspace, WorkspaceInput> = {
  async list(userId) {
    const response = await api.get<ApiResponse<(WorkspaceDto | null)[] | null>>(EP.workspaces.list, { params: { mockaUserId: userId } });
    return rows(read(response)).map((d) => toWorkspace(d, userId));
  },
  async insert(userId, input) {
    const response = await api.post<ApiResponse<Idish>>(EP.workspaces.insert, { ...input, mockaUserId: userId });
    return { ...input, id: confirmedId(read(response), "new workspace"), mockaUserId: userId };
  },
  async update(workspace) {
    const response = await api.put<ApiResponse<Idish>>(EP.workspaces.update, workspace);
    confirmedId(read(response), "workspace update");
    return workspace;
  },
  async remove(workspace) {
    const response = await api.delete<ApiResponse<Idish>>(EP.workspaces.remove, { data: { id: workspace.id } });
    afterDelete("workspace", read(response));
  },
};

export const projectLevel: LevelApi<ExplorerProject, ProjectInput> = {
  async list(workspaceId) {
    const response = await api.get<ApiResponse<(ProjectDto | null)[] | null>>(EP.projects.list, { params: { workspaceId } });
    return rows(read(response)).map((d) => toProject(d, workspaceId));
  },
  async insert(workspaceId, input) {
    const response = await api.post<ApiResponse<Idish>>(EP.projects.insert, { ...input, workspaceId });
    return { ...input, id: confirmedId(read(response), "new project"), workspaceId };
  },
  async update(project) {
    const response = await api.put<ApiResponse<Idish>>(EP.projects.update, project); // everything the server sent, with the edits
    confirmedId(read(response), "project update");
    return project;
  },
  async remove(project) {
    const response = await api.delete<ApiResponse<Idish>>(EP.projects.remove, { data: { id: project.id } });
    afterDelete("project", read(response));
  },
};

/** the write side of a collection uses snake_case keys */
export const collectionLevel: LevelApi<ExplorerCollection, CollectionInput> = {
  async list(projectId) {
    const response = await api.get<ApiResponse<(CollectionDto | null)[] | null>>(EP.collections.list, { params: { projectId } });
    return rows(read(response)).map((d) => toCollection(d, projectId));
  },
  async insert(projectId, input) {
    const response = await api.post<ApiResponse<Idish>>(EP.collections.insert, { name: input.name, auth_required: input.required, project_id: projectId });
    return { ...input, id: confirmedId(read(response), "new collection"), projectId };
  },
  async update(c) {
    const response = await api.put<ApiResponse<Idish>>(EP.collections.update, { id: c.id, name: c.name, auth_required: c.required, project_id: c.projectId });
    confirmedId(read(response), "collection update");
    return c;
  },
  async remove(c) {
    const response = await api.delete<ApiResponse<Idish>>(EP.collections.remove, { data: { id: c.id } });
    afterDelete("collection", read(response));
  },
};

/** An API and its endpoints come back from one call */
export const apiLevel: LevelApi<ExplorerApi, ApiInput> = {
  async list(collectionId) {
    const response = await api.get<ApiResponse<(ApiDto | null)[] | null>>(EP.apis.list, { params: { collectionId } });
    return rows(read(response)).map((d) => toApi(d, collectionId));
  },
  async insert(collectionId, input) {
    const response = await api.post<ApiResponse<Idish>>(EP.apis.insert, { ...input, collectionId });
    const data = read(response);
    const id = confirmedId(data, "new API");
    const raw = recordOf(data); // an insert that returns the endpoints it created fills them in
    return { ...input, id, collectionId, endpoints: rows(raw.endpoints as (EndpointDto | null)[] | null | undefined).map((e) => toEndpoint(e, id)) };
  },
  async update(a) {
    const response = await api.put<ApiResponse<Idish>>(EP.apis.update, { id: a.id, collectionId: a.collectionId, name: a.name, description: a.description });
    confirmedId(read(response), "API update");
    return a;
  },
  async remove(a) {
    const response = await api.delete<ApiResponse<Idish>>(EP.apis.remove, { data: { id: a.id } });
    afterDelete("api", read(response));
  },
};

/** Endpoints are rows inside an API, so they have calls but no list of their own */
export const endpointCalls = {
  async insert(apiId: number, input: EndpointInput): Promise<ExplorerEndpoint> {
    const response = await api.post<ApiResponse<Idish>>(EP.endpoints.insert, { ...input, apiId });
    return { ...input, method: input.method.toUpperCase(), id: confirmedId(read(response), "new endpoint"), apiId };
  },
  async update(e: ExplorerEndpoint): Promise<ExplorerEndpoint> {
    const response = await api.put<ApiResponse<Idish>>(EP.endpoints.update, { id: e.id, apiId: e.apiId, path: e.path, method: e.method, description: e.description });
    confirmedId(read(response), "endpoint update");
    return e;
  },
  async remove(e: ExplorerEndpoint): Promise<void> {
    const response = await api.delete<ApiResponse<Idish>>(EP.endpoints.remove, { data: { id: e.id } });
    afterDelete("endpoint", read(response));
  },
};