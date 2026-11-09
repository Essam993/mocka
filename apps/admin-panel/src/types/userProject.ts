export interface UserProjectInput {
  userId: number;
  name: string;
  description: string;
}

/** Sent on create: everything except id */
export interface UserProject extends UserProjectInput {
  id: number;
}


export const humanize = (s: string) => {
    const t = s.toLowerCase().replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
};