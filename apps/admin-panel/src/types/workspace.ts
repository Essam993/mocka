
export interface Workspace {
    id: number;
    userId: number;
    name: string;
    alias: string;
}

export type WorkspaceInput = Pick<
    Workspace,
    "userId" | "name" | "alias"
>;
