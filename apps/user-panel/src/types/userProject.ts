export interface UserProject {
    id: number;
    name: string;
    workspaceId: number;
    description: string;
}
/** Sent on create: everything except id */
export type UserProjectInput = Omit<UserProject, "id">;

export const humanize = (s: string) => {
    const t = s.toLowerCase().replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
};