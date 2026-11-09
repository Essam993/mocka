import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { EndpointContext, EndpointVariable, VariableSection, VariableWrite } from "../../types/endpointVariable";

const BASE = "/api/backend/user-panel"; // ★ confirm the prefix

export const endpointVariableEndpoints = {
    list: {
        params: `${BASE}/getEndpointParams`,
        headers: `${BASE}/getEndpointHeaderVariables`,
        body: `${BASE}/getEndpointBodyVariables`,
    } as Record<VariableSection, string>,
    /** insert, update and delete all go through this one endpoint */
    save: `${BASE}/insertEndpointVariables`, // ★ POST, confirm
};

const TYPE: Record<VariableSection, "PARAM" | "HEADER" | "BODY"> = { params: "PARAM", headers: "HEADER", body: "BODY" };

interface VariableDto {
    id?: number | null;
    variableId?: number | null;
    name?: string | null;
    defaultValue?: string | null;
    description?: string | null;
    required?: boolean | null;
    type?: string | null;
}
type Saved = VariableDto & { id: number };

function unwrap<T>(body: ApiResponse<T>): T {
    if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
    return body.data;
}

const hasId = (r: VariableDto | null | undefined): r is Saved => r != null && r.id != null;

const fromDto = (d: Saved, dataTypeId: number | null): EndpointVariable => ({
    id: d.id,
    variableId: d.variableId ?? null,
    name: d.name ?? "",
    defaultValue: d.defaultValue ?? "",
    description: d.description ?? "",
    required: !!d.required,
    dataTypeId,
});

/** insert: no id / variableId. update: both. delete: same as update with statusId 0. */
const toPayload = (ctx: EndpointContext, section: VariableSection, rows: VariableWrite[], statusId: 0 | 1) => ({
    endpointId: ctx.endpointId,
    collectionId: ctx.collectionId,
    projectId: ctx.projectId,
    variables: rows.map((r) => ({
        ...(r.id != null ? { id: r.id } : {}),
        name: r.name,
        variableId: r.variableId ?? null,
        ...(r.id != null && r.variableId != null ? { variableId: r.variableId } : {}),
        type: TYPE[section],
        ...(r.dataTypeId != null ? { dataTypeId: r.dataTypeId } : {}),
        statusId,
        defaultValue: r.defaultValue === "" ? null : r.defaultValue,
        isRequired: r.required,
        description: r.description,
    })),
});

export const endpointVariableApi = {
    async list(endpointId: number, section: VariableSection): Promise<EndpointVariable[]> {
        const { data } = await api.get<ApiResponse<(VariableDto | null)[] | null>>(endpointVariableEndpoints.list[section], { params: { endpointId } });
        const rows = unwrap(data);
        return (Array.isArray(rows) ? rows : []).filter(hasId).map((d) => fromDto(d, null));
    },

    /** Returns the saved rows in the same order as `rows`. Throws if one comes back without an id. */
    async insert(ctx: EndpointContext, section: VariableSection, rows: VariableWrite[]): Promise<EndpointVariable[]> {
        const { data } = await api.post<ApiResponse<(VariableDto | null)[]>>(endpointVariableEndpoints.save, toPayload(ctx, section, rows, 1));
        const returned = (unwrap(data) ?? []).filter(hasId);
        const used = new Set<number>();
        return rows.map((sent) => {
            const hit = returned.find((r) => !used.has(r.id) && r.name === sent.name);
            if (!hit) throw new Error(`The server did not confirm "${sent.name}" (no id returned)`);
            used.add(hit.id);
            return fromDto(hit, sent.dataTypeId);
        });
    },

    /** Returns the saved rows in the same order as `rows`. Throws if one is missing from the response. */
    async update(ctx: EndpointContext, section: VariableSection, rows: VariableWrite[]): Promise<EndpointVariable[]> {
        const { data } = await api.post<ApiResponse<(VariableDto | null)[]>>(endpointVariableEndpoints.save, toPayload(ctx, section, rows, 1));
        const returned = (unwrap(data) ?? []).filter(hasId);
        return rows.map((sent) => {
            const hit = returned.find((r) => r.id === sent.id);
            if (!hit) throw new Error(`The server did not confirm "${sent.name}" (no id returned)`);
            return fromDto(hit, sent.dataTypeId);
        });
    },

    /** Delete returns no data, so a SUCCESS status is the only confirmation */
    async remove(ctx: EndpointContext, section: VariableSection, row: VariableWrite & { id: number }): Promise<void> {
        const { data } = await api.post<ApiResponse<unknown>>(endpointVariableEndpoints.save, toPayload(ctx, section, [row], 0));
        unwrap(data);
    },
};