# AI Agent Guidelines: Schema & Types Folder

This folder is strictly reserved for **Drizzle ORM schema definitions and their associated type constants**. All agents and automated tools must adhere to the following isolation rules.

## 🛑 Critical Restrictions

1. **Allowed Imports:**
    * You may import functions, types, and utilities exclusively from the `drizzle-orm` package and sub-packages (e.g. `drizzle-orm/pg-core`).
    * Internal imports (files within this exact subfolder importing each other) are permitted.
2. **Forbidden Imports:**
    * **Absolute Prohibition:** No imports from outside this specific folder are allowed under any circumstances.
    * No external npm packages, utils, config files, or environment variables from the broader project.

---

## 📂 Permitted File Content

* **Schema Definitions:** Drizzle table configurations, indexes, and relations.
* **Typings & Constants:** Enums, strict string constants, and TypeScript types directly required for the schema definitions.

*Ensure all generated code passes strict linting and does not break the dependency isolation of this directory.*