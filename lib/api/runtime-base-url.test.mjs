import assert from "node:assert/strict";
import {
  getBackendBaseUrl,
  getPublicApiBaseUrl,
} from "./runtime-base-url.ts";

const originalInternal = process.env.INTERNAL_API_BASE_URL;
const originalPublic = process.env.NEXT_PUBLIC_API_BASE_URL;

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

try {
  process.env.INTERNAL_API_BASE_URL = "http://bs_be:3001/";
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.borrowedshapes.id.vn/api/";

  assert.equal(getBackendBaseUrl(), "http://bs_be:3001/api");
  assert.equal(
    getPublicApiBaseUrl("https://api.borrowedshapes.id.vn/"),
    "https://api.borrowedshapes.id.vn/api",
  );
  assert.equal(
    getPublicApiBaseUrl("https://api.borrowedshapes.id.vn/api/api/"),
    "https://api.borrowedshapes.id.vn/api",
  );

  delete process.env.INTERNAL_API_BASE_URL;
  assert.equal(
    getBackendBaseUrl(),
    "https://api.borrowedshapes.id.vn/api",
  );

  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  assert.equal(getBackendBaseUrl(), "http://localhost:3001/api");
  assert.equal(getPublicApiBaseUrl(), "http://localhost:3001/api");
} finally {
  restoreEnv("INTERNAL_API_BASE_URL", originalInternal);
  restoreEnv("NEXT_PUBLIC_API_BASE_URL", originalPublic);
}
