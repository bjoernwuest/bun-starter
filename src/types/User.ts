import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { Group, type User } from "@/schema/User.ts";

/**
 * Represents the user type defined by inferring the select model structure of the `User` entity.
 * This type is dynamically generated based on the properties selected from the `User` model.
 *
 * The `UserType` type is inferred utilizing the `InferSelectModel` utility, which allows for
 * type-safe interactions with the selected properties of the `User` model in the application.
 *
 * It is typically used for scenarios where only specific fields of the `User` model are needed,
 * such as in partial data fetching, projections, or custom query results.
 */
export type UserType = InferSelectModel<typeof User>;

/**
 * Represents a new user type that is inferred from the insertable structure
 * of the `User` model.
 *
 * This type is used to define the shape of data that can be inserted into
 * the `User` model, based on the schema of that model. It ensures type safety
 * when working with new user data to match the database structure.
 *
 * The type leverages a utility type `InferInsertModel` to dynamically infer
 * the insertable fields of the `User` model.
 */
export type NewUserType = InferInsertModel<typeof User>;

/**
 * Represents a type derived from the selected model of the `Group` entity.
 *
 * This type is useful when working with data retrieved from the `Group` model,
 * allowing for type inference and ensuring type safety in operations related
 * to the `Group` entity.
 *
 * @typedef {InferSelectModel<typeof Group>} GroupType
 */
export type GroupType = InferSelectModel<typeof Group>;

/**
 * Represents a type that infers the structure of a new group object
 * from the `Group` model. This type is intended to be used for creating
 * new group entries in a system using the inferred schema of the `Group` model.
 *
 * The structure of this type is dynamically generated based on the
 * definition of `Group` provided within the underlying data model.
 *
 * This type is commonly utilized for validation, ensuring that new
 * group data adheres to the expected format.
 *
 * @typedef {InferInsertModel<typeof Group>} NewGroupType
 */
export type NewGroupType = InferInsertModel<typeof Group>;
