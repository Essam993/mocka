export interface SignupInput {
  firstName: string;
  lastName: string;
  userName: string;
  passWord: string;
  confirmPassword: string; // UI only, never sent to the backend
}