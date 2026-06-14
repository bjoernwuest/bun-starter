import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { createInsertSchema } from "drizzle-typebox";
import { ConfigEntry, configValueTypes } from "@/schema/Config.ts";

export { configValueTypes as ConfigValueTypes } from "@/schema/Config.ts";

export type ConfigEntryDataType = configValueTypes;

/**
 * Represents a configuration entry type that is inferred from the select model
 * associated with the `ConfigEntry`.
 *
 * This type is dynamically derived using the `InferSelectModel` utility type,
 * based on the structure and rules defined within the `ConfigEntry` model.
 *
 * It is commonly used to ensure type safety and consistency when handling
 * configuration data associated with `ConfigEntry`.
 */
type ConfigEntrySelectModel = InferSelectModel<typeof ConfigEntry>;
export type ConfigEntryType = Omit<ConfigEntrySelectModel, "type"> & {
	type: ConfigEntryDataType | null;
};

/**
 * Represents a new configuration entry type inferred from the structure of the `ConfigEntry` table.
 * This type leverages the `InferInsertModel` utility to derive the insert model from the table schema,
 * ensuring type consistency when performing insert operations.
 *
 * Use this type to define data structures or parameters that reflect the required fields for inserting
 * new entries into the `ConfigEntry` table, maintaining alignment with the underlying database schema.
 */
type ConfigEntryInsertModel = InferInsertModel<typeof ConfigEntry>;
export type NewConfigEntryType = Omit<ConfigEntryInsertModel, "type"> & {
	type: ConfigEntryDataType | null;
};

/**
 * Represents the schema definition for a configuration entry.
 * This schema is used to validate and enforce the structure of configuration entries.
 *
 * The schema is dynamically created using the `createInsertSchema` function
 * based on the structure of the `ConfigEntry` model.
 *
 * `ConfigEntrySchema` can be utilized to validate input data,
 * ensuring that it adheres to the expected format for configuration entries.
 */
export const ConfigEntrySchema = createInsertSchema(ConfigEntry);
