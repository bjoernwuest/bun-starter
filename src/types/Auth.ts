import type {FunctionalPermission as FunctionalPermissionType} from "./FunctionalPermission.ts";
import { t } from 'elysia';
import { type Static } from '@sinclair/typebox';
import { FunctionalPermissionSchema } from './FunctionalPermission.ts';

export type Claims = Record<string, any>;

export type AuthorizedContext = {
    claims: Claims;
    permissions: FunctionalPermissionType[];
};

/**
 * Represents an authenticated session containing various tokens and expiration details.
 *
 * @interface Session
 * @property {string} [idTokenRaw] - The raw ID token in string format, if available.
 * @property {Record<string, any>} idTokenClaims - A collection of claims extracted from the ID token.
 * @property {string} [refreshToken] - The refresh token associated with the session, if available.
 * @property {string} [accessToken] - The access token used for API authentication, if available.
 * @property {number} expiresAt - The expiration time of the session in milliseconds since the epoch.
 */
export interface Session {
    idTokenRaw?: string;
    idTokenClaims: Claims;
    refreshToken?: string;
    accessToken?: string;
    expiresAt: number;
}

// --- TypeBox schemas for route validation and OpenAPI docs ---

export const MeUserSchema = t.Object({
    oid: t.Union([t.String(), t.Null()]),
    displayName: t.Union([t.String(), t.Null()]),
    preferredUsername: t.Union([t.String(), t.Null()]),
});
export type MeUser = Static<typeof MeUserSchema>;

export const MeContextResponseSchema = t.Object({
    user: MeUserSchema,
    permissionNames: t.Array(t.String()),
    functionalPermissions: t.Array(FunctionalPermissionSchema),
});
export type MeContextResponse = Static<typeof MeContextResponseSchema>;
