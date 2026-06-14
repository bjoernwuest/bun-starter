# UI page architecture

Each page in this folder exports:

- `meta`: page metadata (`urn`, route path, menu placement, required functional permissions)
- `Component`: the page component itself

The page registry in `src/ui/PageRegistry.ts` is the single source of truth for routing and navigation visibility.
New pages must be added to the registry, pageModules, to be accessible in the app.