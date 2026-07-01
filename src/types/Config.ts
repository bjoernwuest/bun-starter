// Hier können manuelle Typ-Erweiterungen für Config hinzugefügt werden.

import {type ConfigEntry, type ConfigEntryInsert, type ConfigValueTypes as ConfigValueTypesType, ConfigValueTypes} from "./_Config";
import {type TSchema, Type} from "@sinclair/typebox";
import { t } from 'elysia';
import { type Static } from '@sinclair/typebox';

export * from './_Config';

export type ConfigEntryDataType = ConfigValueTypesType;

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
export type ConfigEntryType = Omit<ConfigEntry, "type"> & {
    type: ConfigEntryDataType;
};

/**
 * Represents a new configuration entry type inferred from the structure of the `ConfigEntry` table.
 * This type leverages the `InferInsertModel` utility to derive the insert model from the table schema,
 * ensuring type consistency when performing insert operations.
 *
 * Use this type to define data structures or parameters that reflect the required fields for inserting
 * new entries into the `ConfigEntry` table, maintaining alignment with the underlying database schema.
 */
export type NewConfigEntryType = Omit<ConfigEntryInsert, "type"> & {
    type: ConfigEntryDataType;
};

export type ConfigEntryUI = Pick<ConfigEntry, "domain" | "key" | "description" | "type" | "value" | "inputFormat" | "outputFormat">;


const pubsub_Config = "config";
export const pubsub_ConfigUpdated = `${pubsub_Config}.updated`;

export function schemaForConfigType(type: ConfigEntryType["type"]): TSchema {
    switch (type) {
        case ConfigValueTypes.string:
            return Type.String();
        case ConfigValueTypes.number:
            return Type.Number();
        case ConfigValueTypes.boolean:
            return Type.Boolean();
        case ConfigValueTypes.object:
            return Type.Record(Type.String(), Type.Any());
        case ConfigValueTypes["string[]"]:
            return Type.Array(Type.String());
        case ConfigValueTypes["number[]"]:
            return Type.Array(Type.Number());
        default:
            return Type.String();
    }
}

export type ConfigDomainGroup = {
    domain: string;
    entries: ConfigEntryUI[];
};

export type ConfigListResponse = {
    domains: ConfigDomainGroup[];
};

export type ConfigUpdateRequest = {
    value: unknown;
    knownValue: unknown;
};

// --- TypeBox schemas for route validation and OpenAPI docs ---

export const ConfigEntryUiSchema = t.Object({
    domain: t.String(),
    key: t.String(),
    description: t.Nullable(t.String()),
    type: t.Nullable(t.String()),
    value: t.Any(),
    inputFormat: t.String(),
    outputFormat: t.String(),
});
export type ConfigEntryUiSchemaType = Static<typeof ConfigEntryUiSchema>;

export const ConfigDomainGroupSchema = t.Object({
    domain: t.String(),
    entries: t.Array(ConfigEntryUiSchema),
});
export type ConfigDomainGroupSchemaType = Static<typeof ConfigDomainGroupSchema>;

export const ConfigDomainsResponseSchema = t.Object({
    domains: t.Array(ConfigDomainGroupSchema),
});
export type ConfigDomainsResponse = Static<typeof ConfigDomainsResponseSchema>;

export const ConfigUpdateBodySchema = t.Object({
    value: t.Any(),
    knownValue: t.Any(),
});
export type ConfigUpdateBody = Static<typeof ConfigUpdateBodySchema>;

export const ConfigParamsSchema = t.Object({
    domain: t.String(),
    key: t.String(),
});
export type ConfigParams = Static<typeof ConfigParamsSchema>;

export const ConfigUpdateConflictSchema = t.Object({
    error: t.String(),
    currentValue: t.Any(),
});
export type ConfigUpdateConflict = Static<typeof ConfigUpdateConflictSchema>;
