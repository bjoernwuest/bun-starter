This directory contains copies of all types from /src/types that are used in the UI.

Purpose is to avoid any non-client compatible dependencies from creeping into the UI codebase, e.g. drizzle-orm.

Only files within /src/ui/ are permitted to use those files.

When asked for sync, treat the files in /src/types as master. Never change files in /src/types .