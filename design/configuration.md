# Configuration Parameter Concept

This document describes how application configuration is defined, validated, stored, and consumed.

## Goals

- Keep all runtime configuration in one central table (`config`).
- Let each service declare its own configuration contract close to the code that uses it.
- Support an interactive setup flow for mandatory values.
- Enforce data-type consistency at declaration time, setup-time parsing, and database schema level.

## Data Model

Configuration entries are persisted in `src/schema/Config.ts` as table `config` with a composite key:

- `domain` + `key` uniquely identify one parameter.

Main columns:

- `description`: human-readable meaning of the parameter.
- `type`: typed by database enum `config_value_types`.
- `value`: stored as JSONB.
- `editInUI`: whether the setup/admin UI should expose the parameter.
- `inputFormat`: regex-like input hint/constraint string for UI input.
- `outputFormat`: optional rendering hint.
- `mandatoryForStart`: whether startup requires this value.

## Supported Value Types

The supported types are defined by enum `ConfigValueTypes` (originating from schema enum `config_value_types`) and used by `ConfigEntryType` in `src/types/ConfigEntry.ts`.

Supported values:

- `string`
- `number`
- `boolean`
- `object`
- `string[]`
- `number[]`
- `boolean[]`
- `object[]`

`ConfigEntryType` and `NewConfigEntryType` explicitly type their `type` field as this enum (`ConfigEntryDataType | null`) to make declarations and consumers consistent.

## Where Parameters Are Declared

Services declare their parameter definitions in exported `config` objects, typically:

- `src/services/auth.ts`
- `src/services/EntraIDSync.ts`
- `src/services/request_bundling.ts`
- `src/services/ui_config.ts`

Each entry uses the same shape (`ConfigEntryType`) and `type: ConfigValueTypes.<kind>`.

Example pattern:

```ts
export const config = {
  cfgExample: {
    domain: "My Service",
    key: "ExampleKey",
    description: "What this parameter controls.",
    type: ConfigValueTypes.number,
    value: undefined,
    inputFormat: "^[1-9][0-9]*$",
    outputFormat: "",
    editInUI: true,
    mandatoryForStart: false,
  },
} satisfies Record<string, ConfigEntryType>;
```

## Lifecycle and Management Flow

### 1) Declaration

A service declares config metadata in its `config` export.

### 2) Discovery of Missing Mandatory Parameters

`src/services/setup.ts` scans `src/services/*.ts`, imports each module, and inspects `export const config`.

For each entry with `mandatoryForStart: true`, it checks existence in DB via `getConfigEntriesByKey(...)`.

Missing items are collected into a map grouped by `domain` and returned by `getSetupDemand()`.

### 3) Setup UI Flow

`setupApp` in `src/apps/setup.ts` serves a setup wizard if `getSetupDemand()` is not empty.

- `POST /setup/demand` returns remaining sections/entries.
- `POST /setup` accepts values for one section.

### 4) Type Parsing + Validation During Setup

In `setupApp`:

- `schemaForType(...)` maps `ConfigValueTypes` to TypeBox schemas.
- `parseValue(...)` parses raw input according to the declared type.
- `Value.Check(...)` enforces runtime type validation.

Only valid values are persisted.

### 5) Persistence

`upsertConfigEntry(...)` in `src/repo/ConfigRepo.ts` inserts or updates by `(domain, key)`.

Before write, it validates payload shape with `ConfigEntrySchema` (TypeBox schema from Drizzle model).

### 6) Runtime Consumption

Services read values using `getConfigEntriesByKey(...)` and apply local fallback logic where appropriate.

## Design Rules

When adding a new configuration parameter:

1. Add it to the owning service `config` export.
2. Use `type: ConfigValueTypes.<kind>` (never raw string literals).
3. Set `mandatoryForStart` to `true` only if startup must block without it.
4. Provide clear `description`; add `inputFormat` if user input should be constrained.
5. Read via repo functions and cast/validate at the use site as needed.

## Operational Notes

- Type authority is shared between DB enum (`config_value_types`) and TypeScript enum (`ConfigValueTypes`).
- Setup mode exits automatically when no mandatory entries are missing.
- Non-mandatory parameters can still be defined and managed through DB/UI without blocking startup.

