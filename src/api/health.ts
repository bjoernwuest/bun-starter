import type { ApiInstance } from "@/apps/api.ts";

// noinspection JSUnusedGlobalSymbols
export default function register(app: ApiInstance) {
  app.get("/health", () => ({ status: "ok", ts: new Date().toISOString() }), {
    detail: {
      tags: ["Health"],
      summary: "Liveness/readiness probe",
      description: "Check the health status and current timestamp of the server. This endpoint is used for liveness and readiness probes in containerized environments. No authentication required.",
    },
  });
}

