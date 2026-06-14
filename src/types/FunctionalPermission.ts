import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { FunctionalPermission } from "@/schema/FunctionalPermission.ts";
import type { FunctionalPermissionName } from "@/ui/auth/functional_permissions.ts";

/**
 * Defines the type representation for functional permissions by inferring the
 * select model from the `FunctionalPermission` definition.
 *
 * This type is used to represent the structure and properties expected
 * when working with functional permissions within the system.
 *
 * It leverages the `InferSelectModel` utility to dynamically generate
 * the type based on the `FunctionalPermission` model, ensuring consistency
 * and alignment with the actual database schema or ORM model.
 */
type DrizzleFunctionalPermissionSelect = InferSelectModel<typeof FunctionalPermission>;

export type FunctionalPermissionType = Omit<DrizzleFunctionalPermissionSelect, "functionalPermissionName"> & {
	functionalPermissionName: FunctionalPermissionName;
};

/**
 * Represents a TypeScript type for a new functional permission. This type is inferred
 * from the structure of the `FunctionalPermission` model, specifically its insert model.
 * The type is primarily used to define the shape of objects that are being inserted
 * into the `FunctionalPermission` data source.
 *
 * The `InferInsertModel` utility helps to infer the expected format for insert operations,
 * ensuring consistency between the*/
/**
 * Represents a TypeScript type for a new functional permission. This type is inferred
 * from the structure of the `FunctionalPermission` model, specifically its insert model.
 * The type is primarily used to define the shape of objects that are being inserted
 * into the `FunctionalPermission` data source.
 *
 * The `InferInsertModel` utility helps to infer the expected format for insert operations,
 * ensuring consistency between the type definition and the underlying model.
 *
 * This type is typically used in contexts where validation, transformation, or
 * assignment of new functional permission data is required before persisting it
 * to the database or performing related operations.
 */
type DrizzleFunctionalPermissionInsert = InferInsertModel<typeof FunctionalPermission>;

export type NewFunctionalPermissionType = Omit<DrizzleFunctionalPermissionInsert, "functionalPermissionName"> & {
	functionalPermissionName: FunctionalPermissionName;
};
