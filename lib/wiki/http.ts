// Shared HTTP/error types for the wiki frontend. Keeps `any`/`unknown` out of
// call sites: a bare `catch (err)` is tokenless, then `err as ApiError` narrows
// it; query strings use `QueryParams`, JSON bodies use `JsonValue`.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type QueryParams = Record<
  string,
  string | number | boolean | string[] | number[] | undefined | null
>;

export interface ConflictLatest {
  id?: string;
  createdAt?: string;
}

// Body of a failed ApiResponse. The 409 conflict payload may sit at the top
// level or nested under `data`, so both are optional here.
export interface ApiErrorData {
  message?: string;
  currentLatest?: ConflictLatest | null;
  data?: { currentLatest?: ConflictLatest | null } | null;
}

// Structural shape every wiki HTTP error (BffFetchError / axios error) matches.
// A caught error is tokenless (`catch (err)`); pass it as `err as ApiError`.
export interface ApiError {
  response?: {
    status?: number;
    data?: ApiErrorData;
  };
  message?: string;
}

export function getApiErrorStatus(err: ApiError): number | undefined {
  return err?.response?.status;
}

export function getApiErrorMessage(err: ApiError, fallback: string): string {
  return (
    err?.response?.data?.message ??
    (err instanceof Error ? err.message : undefined) ??
    fallback
  );
}
