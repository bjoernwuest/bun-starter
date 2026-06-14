import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { PageTemplate, PageSection } from "./PageTemplate.tsx";
import type { PageMeta } from "@/ui/types/Page.ts";
import { apiDelete, apiGet, apiPost } from "@/ui/api/index.ts";
import type { FunctionalPermissionsResponse, GroupFunctionalPermissionResponseType } from "@/ui/types/AdminApi.ts";
import {
    FP_EDIT_FUNCTIONAL_PERMISSION_ASSIGNMENTS,
    FP_READ_FUNCTIONAL_PERMISSIONS,
    FP_READ_GROUPS
} from "@/ui/auth/functional_permissions.ts";
import type { FunctionalPermissionType } from "@/ui/types/FunctionalPermission.ts";


export const meta: PageMeta = {
    id: "admin-group-detail",
    urn: "urn:bun-starter:ui:page:admin-group-detail",
    path: "/admin/groups/:groupid",
    title: "Group details",
    description: "Read-only group details.",
    menu: {
        section: "Administration",
        order: 31,
        label: "Group details",
        parent: "admin-groups",
        hidden: true,
    },
    requiredFunctionalPermissions: [FP_READ_GROUPS.functionalPermissionName],
};

type ViewerContext = { permissionNames: string[] };

function StatusChip({ disabled }: { disabled: boolean }) {
    return <span className={`mui-pill ${disabled ? "pending" : ""}`}>{disabled ? "Disabled" : "Enabled"}</span>;
}

export function Component() {
    const { groupid } = useParams();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [viewerContext, setViewerContext] = useState<ViewerContext>({ permissionNames: [] });
    const [groupPayload, setGroupPayload] = useState<GroupFunctionalPermissionResponseType | null>(null);
    const [assignedPermissions, setAssignedPermissions] = useState<FunctionalPermissionType[]>([]);
    const [allPermissions, setAllPermissions] = useState<FunctionalPermissionType[]>([]);
    const [permissionsTotal, setPermissionsTotal] = useState(0);
    const [permissionsAvailablePageSizes, setPermissionsAvailablePageSizes] = useState<number[]>([10, 20, 50]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const queryPermissionsPage = Number(searchParams.get("permissionsPage") ?? "1");
    const queryPermissionsPageSize = Number(searchParams.get("permissionsPageSize") ?? "10");
    const permissionsPage = Number.isInteger(queryPermissionsPage) && queryPermissionsPage > 0 ? queryPermissionsPage : 1;
    const permissionsPageSize = Number.isInteger(queryPermissionsPageSize) && queryPermissionsPageSize > 0 ? queryPermissionsPageSize : 10;

    const updateQuery = (patch: { permissionsPage?: number; permissionsPageSize?: number }) => {
        const next = new URLSearchParams(searchParams);
        if (patch.permissionsPage !== undefined) next.set("permissionsPage", String(patch.permissionsPage));
        if (patch.permissionsPageSize !== undefined) next.set("permissionsPageSize", String(patch.permissionsPageSize));
        setSearchParams(next);
    };

    useEffect(() => {
        let cancelled = false;
        if (!groupid) return;

        setIsLoading(true);
        void Promise.all([
            apiGet<ViewerContext>("/api/me/context"),
            apiGet<GroupFunctionalPermissionResponseType>(`/api/groups/${encodeURIComponent(groupid)}`),
            apiGet<FunctionalPermissionType[]>(`/api/groups/${encodeURIComponent(groupid)}/functionalpermissions`),
            apiGet<FunctionalPermissionsResponse>(`/api/functionalpermissions?page=${permissionsPage - 1}&pageSize=${permissionsPageSize}`),
        ]).then(([context, group, assigned, all]) => {
            if (cancelled) return;
            setViewerContext(context);
            setGroupPayload(group);
            setAssignedPermissions(assigned);
            setAllPermissions(all.functionalPermissions);
            setPermissionsTotal(all.total);
            setPermissionsAvailablePageSizes(all.availablePageSizes);
            if (all.page !== permissionsPage - 1) updateQuery({ permissionsPage: all.page + 1 });
            if (!all.availablePageSizes.includes(permissionsPageSize) && all.availablePageSizes.length > 0) {
                updateQuery({ permissionsPage: 1, permissionsPageSize: all.availablePageSizes[0]! });
            }
        }).finally(() => {
            if (!cancelled) setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [groupid, permissionsPage, permissionsPageSize, searchParams.toString()]);

    const canReadFunctionalPermissions = viewerContext.permissionNames.includes(FP_READ_FUNCTIONAL_PERMISSIONS.functionalPermissionName);
    const canEditAssignments = canReadFunctionalPermissions
        && viewerContext.permissionNames.includes(FP_EDIT_FUNCTIONAL_PERMISSION_ASSIGNMENTS.functionalPermissionName);

    const assignedIds = useMemo(
        () => assignedPermissions.map((p) => p.identifier),
        [assignedPermissions],
    );

    const refreshAssigned = async () => {
        if (!groupid) return;
        const refreshed = await apiGet<FunctionalPermissionType[]>(
            `/api/groups/${encodeURIComponent(groupid)}/functionalpermissions`,
        );
        setAssignedPermissions(refreshed);
    };

    return (
        <PageTemplate urn={meta.urn} title={meta.title} description={meta.description}>
            <PageSection title="Group details">
                {isLoading || !groupPayload ? (
                    <p>Loading group details...</p>
                ) : (
                    <>
                        <div className="admin-detail-grid">
                            <div><strong>Name:</strong> {groupPayload.group.groupName}</div>
                            <div><strong>Status:</strong> <StatusChip disabled={groupPayload.group.disabled} /></div>
                            <div><strong>Technical identifier:</strong> <code>{groupPayload.group.identifier}</code></div>
                            <div><strong>Created:</strong> {new Date(groupPayload.group.createdAt).toLocaleString()}</div>
                            <div><strong>Updated:</strong> {new Date(groupPayload.group.updatedAt).toLocaleString()}</div>
                        </div>


                        {canEditAssignments ? (
                            <div className="admin-top-gap">
                                <h3>Edit functional permission assignments</h3>
                                <p className="small-muted">Changes are saved immediately.</p>
                                <table className="mui-simple-table admin-table">
                                    <thead>
                                        <tr>
                                            <th>Assigned</th>
                                            <th>Functional permission</th>
                                            <th>Group</th>
                                            <th>Description</th>
                                            <th>Technical identifier</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allPermissions.map((permission) => {
                                            const isChecked = assignedIds.includes(permission.identifier);
                                            return (
                                                <tr key={permission.identifier}>
                                                    <td>
                                                        <label className="admin-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                disabled={isSaving}
                                                                aria-label={`Assign ${permission.functionalPermissionName}`}
                                                                onChange={async (event) => {
                                                                    if (!groupid) return;
                                                                    setIsSaving(true);
                                                                    try {
                                                                        if (event.target.checked) {
                                                                            await apiPost(
                                                                                `/api/groups/${encodeURIComponent(groupid)}/functionalpermissions`,
                                                                                { permissionIdentifiers: [permission.identifier] },
                                                                            );
                                                                        } else {
                                                                            await apiDelete(
                                                                                `/api/groups/${encodeURIComponent(groupid)}/functionalpermissions`,
                                                                                { permissionIdentifiers: [permission.identifier] },
                                                                            );
                                                                        }
                                                                        await refreshAssigned();
                                                                    } finally {
                                                                        setIsSaving(false);
                                                                    }
                                                                }}
                                                            />
                                                            <span>{isChecked ? "Yes" : "No"}</span>
                                                        </label>
                                                    </td>
                                                    <td>{permission.functionalPermissionName}</td>
                                                    <td>{permission.group}</td>
                                                    <td>{permission.description}</td>
                                                    <td><code>{permission.identifier}</code></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div className="admin-pager-row">
                                    <button type="button" disabled={permissionsPage <= 1} onClick={() => updateQuery({ permissionsPage: Math.max(1, permissionsPage - 1) })}>
                                        Previous
                                    </button>
                                    <span>Page {permissionsPage} of {Math.max(1, Math.ceil(permissionsTotal / permissionsPageSize))}</span>
                                    <button type="button" disabled={permissionsPage >= Math.max(1, Math.ceil(permissionsTotal / permissionsPageSize))} onClick={() => updateQuery({ permissionsPage: Math.min(Math.max(1, Math.ceil(permissionsTotal / permissionsPageSize)), permissionsPage + 1) })}>
                                        Next
                                    </button>
                                    <label>
                                        Page size
                                        <select
                                            className="admin-page-size"
                                            value={permissionsPageSize}
                                            onChange={(event) => updateQuery({ permissionsPage: 1, permissionsPageSize: Number(event.target.value) })}
                                        >
                                            {permissionsAvailablePageSizes.map((size) => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <span>{permissionsTotal} functional permissions</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="admin-top-gap">
                            <Link to={`/admin/groups${location.search}`}>Back to group list</Link>
                        </div>
                    </>
                )}
            </PageSection>
        </PageTemplate>
    );
}
