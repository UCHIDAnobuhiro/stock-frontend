import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

export const TOKEN_KEY = "stock_jwt";

const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});

apiClient.use({
  onRequest({ request }) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return request;
  },
});

export default apiClient;
