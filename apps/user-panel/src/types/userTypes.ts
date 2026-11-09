export interface User {
  id: number;
  userTypeId: number;
  firstName: string;
  lastName: string;
  context: string;
  contextValue: string;
  userType: string;
  userName: string; // the login email
}
/** Sent on create: everything except id */
export type UserInput = Omit<User, "id">;

/** ★ Add the other user types / contexts your backend supports. Values found in the loaded data are added automatically. */
export const KNOWN_USER_TYPES: { value: string; id: number }[] = [{ value: "APPLICATION_USER", id: 1 }];
export const KNOWN_CONTEXTS: string[] = ["PLATFORM"];

export const humanize = (s: string) => {
  const t = s.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};