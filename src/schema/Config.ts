import {boolean, jsonb, pgEnum, pgTable, primaryKey, text, varchar } from "drizzle-orm/pg-core";

/**
 * Enum representing the various types of configuration values.
 * This is used to define the expected data type for configuration settings.
 *
 * The following value types are available:
 * - `string`: Represents a single string value.
 * - `number`: Represents a single numeric value.
 * - `boolean`: Represents a single boolean value.
 * - `object`: Represents a single object.
 * - `string[]`: Represents an array of string values.
 * - `number[]`: Represents an array of numeric values.
 */
export enum configValueTypes {
    string = 'string',
    number = 'number',
    boolean = 'boolean',
    object = 'object',
    'string[]' = 'string[]',
    'number[]' = 'number[]',
}

/**
 * A PostgreSQL enum type representing configuration value types.
 *
 * This variable is initialized using the pgEnum utility to define and register
 * a PostgreSQL enum named 'config_value_types' based on the values provided in
 * the `configValueTypes` object. It ensures that the database schema recognizes
 * this specific set of configuration value types as a legitimate enum type.
 */
export const pgConfigValueTypes = pgEnum('config_value_types', Object.values(configValueTypes) as [string, ...string[]]);

/**
 * Represents a configuration entry within a database table.
 *
 * This variable defines the structure of the "config" table, which is used
 * to store various configuration settings for an application. Each
 * configuration entry is uniquely identified by a combination of the
 * `domain` and `key` columns.
 *
 * Properties:
 * - `domain`: The domain associated with the configuration entry. This is a
 *   non-nullable string with a maximum length of 255 characters.
 * - `key`: The configuration key. This is a non-nullable string with a
 *   maximum length of 255 characters.
 * - `description`: A detailed explanation of the configuration entry. This
 *   is an optional text field.
 * - `type`: The data type of the configuration value. This uses a predefined
 *   set of configuration value types.
 * - `value`: The actual value of the configuration entry. This is stored as
 *   JSONB.
 * - `editInUI`: A boolean indicating whether the configuration entry can be
 *   edited through the user interface. Defaults to `true`. This field is
 *   non-nullable.
 * - `mandatoryForStart`: A boolean indicating whether the configuration
 *   entry is mandatory for the system startup process. Defaults to `false`.
 *   This field is non-nullable.
 *
 * Constraints:
 * - A primary key constraint is applied to ensure that each combination of
 *   `domain` and `key` is unique within the table.
 */
export const ConfigEntry = pgTable("config", {
    domain: varchar("domain", { length: 255 }).notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    description: text("description"),
    type: pgConfigValueTypes("type"),
    value: jsonb("value"),
    editInUI: boolean("edit_in_ui").notNull().default(true),
    inputFormat: text("input_format").notNull().default(""),
    outputFormat: text("output_format").notNull().default(""),
    mandatoryForStart: boolean("mandatory_for_start").notNull().default(false),
}, (table) => [
    primaryKey({ name: "config_domain_key_pk", columns: [table.domain, table.key] }),
]);
