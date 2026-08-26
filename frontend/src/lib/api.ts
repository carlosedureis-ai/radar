import { appConfig } from "./config";

type ApiErrorBody = {
  error?: { code?: string; message?: string; requestId?: string };
};

export class RadarApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message || "Não foi possível concluir esta ação.");
    this.name = "RadarApiError";
    this.status = status;
    this.code = body.error?.code || "UNKNOWN_ERROR";
    this.requestId = body.error?.requestId;
  }
}

export async function apiRequest<T>(
  path: string,
  accessToken: string | null,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${appConfig.apiUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new RadarApiError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
