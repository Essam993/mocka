import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { Schema, SchemaField, SchemaInput } from "../../types/schema";

export const schemaEndpoints = {
  list: "/api/backend/user-panel/getRecordsByProject", // GET ?projectId=
  fields: "/api/backend/user-panel/getRecordFieldsByRecordDefId", // GET ?endpointRecordDefId=
  create: "/api/backend/user-panel/insertVariableRecord", // POST
  update: "/api/backend/user-panel/updateVariableRecord", // ★ PUT, confirm the path
  removeField: "/api/backend/user-panel/deleteVariableRecord", // DELETE body: { id: fieldId }
  removeSchema: "/api/backend/user-panel/deleteVariableRecordDef", // DELETE body: { id: schemaId }
};

interface SchemaDto {
  id: number;
  name: string;
  projectId: number;
}

interface FieldDto {
  id?: number;
  name: string;
  dataTypeId: number;
  description?: string | null;
  required?: boolean | null;
  /** the backend currently spells it like this */
  rquired?: boolean | null;
  /** the nested schema (the app calls it recordDefId) */
  linkedRecordDefId?: number | null;
}

/** What insert / update return: the saved record with its fields */
interface SavedDto {
  /** insert answers with this */
  endpointRecordDefId?: number | null;
  /** update answers with this */
  id?: number | null;
  projectId?: number;
  fields?: (FieldDto | null)[];
}

type IdData = { id?: number | null } | { id?: number | null }[] | null | undefined;

function unwrap<T>(body: ApiResponse<T>): T {
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

/** Throws unless the response carries an id ({ id } or [{ id }]), so the store is never patched on a doubtful response */
function requireId(body: ApiResponse<IdData>, what: string): number {
  const data = unwrap(body);
  const id = Array.isArray(data) ? data[0]?.id : data?.id;
  if (id == null) throw new Error(`The server did not confirm the ${what} (no id returned)`);
  return id;
}

const fromField = (f: FieldDto): SchemaField => ({
  id: f.id,
  name: f.name,
  dataTypeId: f.dataTypeId,
  description: f.description ?? "",
  required: !!(f.required ?? f.rquired),
  recordDefId: f.linkedRecordDefId ?? null,
});

/** app → backend: the field shape of insertVariableRecord / updateVariableRecord */
const toWriteFields = (fields: SchemaField[]) =>
  fields.map((f) => ({
    ...(f.id != null ? { id: f.id } : {}),
    name: f.name,
    dataTypeId: f.dataTypeId,
    defaultValue: null,
    description: f.description,
    required: f.required,
    parentProjVarRecordId: null,
    linkedRecordDefId: f.recordDefId,
    childRecordVariableId: null,
  }));

/**
 * Reads the save response. The schema id is `endpointRecordDefId` (insert) or `id` (update);
 * no id → throws, so the store is never patched. The fields come back with their real ids.
 */
function readSaved(body: ApiResponse<SavedDto | { id: number }[]>, sent: SchemaField[], what: string): { id: number; fields: SchemaField[] } {
  const data = unwrap(body);
  const id = Array.isArray(data) ? data[0]?.id : (data?.endpointRecordDefId ?? data?.id);
  if (id == null) throw new Error(`The server did not confirm the ${what} (no id returned)`);

  const returned = Array.isArray(data) ? [] : (data?.fields ?? []).filter((f): f is FieldDto => f != null);
  const fields =
    returned.length > 0
      ? returned.map((f) => {
          const mapped = fromField(f);
          // where the server leaves the description empty, keep what was typed
          const typed = sent.find((s) => s.name === mapped.name);
          return { ...mapped, description: mapped.description || typed?.description || "" };
        })
      : sent;
  return { id, fields };
}

export const schemaApi = {
  async list(projectId: number): Promise<Schema[]> {
    const { data } = await api.get<ApiResponse<(SchemaDto | null)[]>>(schemaEndpoints.list, { params: { projectId } });
    return (unwrap(data) ?? []).filter((s): s is SchemaDto => s != null && s.id != null);
  },

  async fields(recordDefId: number): Promise<SchemaField[]> {
    const { data } = await api.get<ApiResponse<(FieldDto | null)[]>>(schemaEndpoints.fields, { params: { endpointRecordDefId: recordDefId } });
    return (unwrap(data) ?? []).filter((f): f is FieldDto => f != null).map(fromField);
  },

  async create(input: SchemaInput): Promise<{ id: number; fields: SchemaField[] }> {
    const { data } = await api.post<ApiResponse<SavedDto>>(schemaEndpoints.create, {
      projectId: input.projectId,
      projectVariableRecordDefName: input.name,
      fields: toWriteFields(input.fields),
    });
    return readSaved(data, input.fields, "new schema");
  },

  /** Update takes the schema id as projectVariableRecordDefId and no projectId */
  async update(input: SchemaInput & { id: number }): Promise<{ id: number; fields: SchemaField[] }> {
    const { data } = await api.put<ApiResponse<SavedDto>>(schemaEndpoints.update, {
      projectVariableRecordDefId: input.id,
      projectVariableRecordDefName: input.name,
      fields: toWriteFields(input.fields),
    });
    return readSaved(data, input.fields, "update");
  },

  /** Deletes one nested field of a schema */
  async removeField(fieldId: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<IdData>>(schemaEndpoints.removeField, { data: { id: fieldId } });
    requireId(data, "field delete");
  },

  /** Deletes the whole schema */
  async removeSchema(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<IdData>>(schemaEndpoints.removeSchema, { data: { id } });
    requireId(data, "schema delete");
  },
};