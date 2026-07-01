// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY
import { Type, type Static } from '@sinclair/typebox';

export const ConfigValueTypes = {
    string: 'string' as const,
    number: 'number' as const,
    boolean: 'boolean' as const,
    object: 'object' as const,
    'string[]': 'string[]' as const,
    'number[]': 'number[]' as const,
}

// --- Extracted Types ---
export type ConfigValueTypes = typeof ConfigValueTypes[keyof typeof ConfigValueTypes];

// --- Derived Drizzle Schemas ---
export const ConfigEntrySchema = Type.Object({
  domain: Type.Any({ type: 'string', maxLength: 255 }),
  key: Type.Any({ type: 'string', maxLength: 255 }),
  description: Type.Any({ type: 'string' }),
  type: Type.Any({ type: 'string' }),
  value: Type.Any({ type: 'object', additionalProperties: true }),
  editInUI: Type.Any({ type: 'boolean' }),
  inputFormat: Type.Any({ type: 'string' }),
  outputFormat: Type.Any({ type: 'string' }),
  mandatoryForStart: Type.Any({ type: 'boolean' }),
});
export type ConfigEntry = Static<typeof ConfigEntrySchema>;

export const ConfigEntryInsertSchema = Type.Object({
  domain: Type.Any({ type: 'string', maxLength: 255 }),
  key: Type.Any({ type: 'string', maxLength: 255 }),
  description: Type.Optional(Type.Any({ type: 'string' })),
  type: Type.Any({ type: 'string' }),
  value: Type.Optional(Type.Any({ type: 'object', additionalProperties: true })),
  editInUI: Type.Optional(Type.Any({ type: 'boolean' })),
  inputFormat: Type.Optional(Type.Any({ type: 'string' })),
  outputFormat: Type.Optional(Type.Any({ type: 'string' })),
  mandatoryForStart: Type.Optional(Type.Any({ type: 'boolean' })),
});
export type ConfigEntryInsert = Static<typeof ConfigEntryInsertSchema>;

