import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { ApiKey, ApiKeyFunctionalPermission } from "@/schema/ApiKey.ts";

export type ApiKeyType = InferSelectModel<typeof ApiKey>;
export type NewApiKeyType = InferInsertModel<typeof ApiKey>;

export type ApiKeyFunctionalPermissionType = InferSelectModel<typeof ApiKeyFunctionalPermission>;
export type NewApiKeyFunctionalPermissionType = InferInsertModel<typeof ApiKeyFunctionalPermission>;

