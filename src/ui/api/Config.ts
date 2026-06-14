import { apiGet, apiPut } from "./index.ts";
import type {
    ConfigListResponse,
    ConfigUpdateRequest,
    ConfigUpdateResponse,
} from "@/ui/types/AdminApi.ts";

export async function getConfigEntries(): Promise<ConfigListResponse> {
    return apiGet<ConfigListResponse>("/api/config");
}

export async function updateConfigEntry(
    domain: string,
    key: string,
    data: ConfigUpdateRequest,
): Promise<ConfigUpdateResponse> {
    return apiPut<ConfigUpdateResponse>(
        `/api/config/${encodeURIComponent(domain)}/${encodeURIComponent(key)}`,
        data,
    );
}
