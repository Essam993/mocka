import { api } from "../../api/client";
import { SignupInput } from "../../types/signup";
import { ApiResponse } from "../../types/types";

export const signupEndpoint = "/api/backend/user-panel/signup"; // POST

export const signupApi = {
  async signup(input: SignupInput): Promise<void> {
    const { data } = await api.post<ApiResponse<unknown>>(signupEndpoint, input);
    if (data.status && data.status.toUpperCase() !== "SUCCESS") {
      throw new Error(data.message || "Signup failed");
    }
  },
};