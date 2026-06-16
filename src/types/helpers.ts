import { t, type Static } from "elysia";

/**
 * Represents an object with an identifier property.
 *
 * This type is used to standardize objects that include a
 * unique identifier field, typically as a string.
 *
 * @typedef {Object} IdentifierType
 * @property {string} identifier - A unique identifier string.
 */
export type IdentifierType = { identifier: string };

const uuidSchema = t.String({ format: 'uuid' });
/**
 * Simple UUID-formatted string.
 */
export type UUIDType = Static<typeof uuidSchema>;

/**
 * IdentifierSchema defines a schema for an object with a single property `identifier`.
 * The `identifier` field is a string formatted as a UUID.
 *
 * This schema is typically used to validate objects where a unique identifier
 * in the UUID format is required.
 */
export const IdentifierSchema = t.Object({ identifier: t.String({format: "uuid"}) });

/**
 * Helper type to create "at least one must be present" types.
 */
type AtLeastOne<T> = { [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>> }[keyof T];
