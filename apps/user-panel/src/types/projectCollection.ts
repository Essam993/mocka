export interface ProjectCollection {
    id: number;
    name: string;
    projectId: number;
    required?: boolean;
}
/** Sent on create: everything except id */
export type ProjectCollectionInput = Omit<ProjectCollection, "id">;

export const humanize = (s: string) => {
    const t = s.toLowerCase().replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
};