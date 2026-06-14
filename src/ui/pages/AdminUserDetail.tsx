import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { InputSwitch } from "primereact/inputswitch";
import { Chip } from "primereact/chip";
import { PageTemplate, PageSection } from "./PageTemplate.tsx";
import type { PageMeta } from "@/ui/types/Page.ts";
import { apiGet } from "@/ui/api/index.ts";
import type { UserDetailsResponse } from "@/ui/types/AdminApi.ts";
import { FP_READ_USERS } from "@/ui/auth/functional_permissions.ts";

export const meta: PageMeta = {
    id: "admin-user-detail",
    urn: "urn:bun-starter:ui:page:admin-user-detail",
    path: "/admin/users/:userid",
    title: "User details",
    description: "Read-only user details.",
    menu: {
        section: "Administration",
        order: 21,
        label: "User details",
        parent: "admin-users",
        hidden: true,
    },
    requiredFunctionalPermissions: [FP_READ_USERS.functionalPermissionName],
};

function StatusChip({ disabled }: { disabled: boolean }) {
    return <span className={`mui-pill ${disabled ? "pending" : ""}`}>{disabled ? "Disabled" : "Enabled"}</span>;
}

export function Component() {
    const { userid } = useParams();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [payload, setPayload] = useState<UserDetailsResponse | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!userid) return;

        setIsLoading(true);
        void apiGet<UserDetailsResponse>(`/api/users/${encodeURIComponent(userid)}?includeInactive=true`)
            .then((response) => {
                if (!cancelled) setPayload(response);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userid]);

    const user = payload?.user;

    return (
        <PageTemplate urn={meta.urn} title={meta.title} description={meta.description}>
            <PageSection title="User details">
                {isLoading || !user ? (
                    <p>Loading user details...</p>
                ) : (
                    <>
                        <div className="admin-detail-grid">
                            <div><strong>First name:</strong> {user.firstName}</div>
                            <div><strong>Last name:</strong> {user.lastName}</div>
                            <div><strong>Email:</strong> {user.email}</div>
                            <div><strong>Status:</strong> <StatusChip disabled={user.disabled} /></div>
                            <div><strong>Technical identifier:</strong> <code>{user.identifier}</code></div>
                            <div><strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}</div>
                            <div><strong>Updated:</strong> {new Date(user.updatedAt).toLocaleString()}</div>
                        </div>

                        <div className="admin-toggle-row admin-top-gap">
                            <span>Show inactive groups and permissions</span>
                            <InputSwitch checked={showInactive} onChange={(event) => setShowInactive(Boolean(event.value))} />
                        </div>

                        <h3>Assigned groups</h3>
                        <div className="admin-chip-wrap">
                            {((payload.groups ?? []).filter(g => showInactive || !g.disabled)).map((group) => (
                                <Chip
                                    key={group.identifier}
                                    label={`${group.groupName} (${group.disabled ? "disabled" : "enabled"})`}
                                />
                            ))}
                        </div>

                        <h3>Functional permissions</h3>
                        <table className="mui-simple-table admin-table">
                            <thead>
                                <tr>
                                    <th>Permission</th>
                                    <th>Granted by groups</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {((payload.functionalPermissions ?? [])).map((permission) => (
                                    <tr key={permission.identifier}>
                                        <td>{permission.functionalPermissionName}</td>
                                        <td>{(permission.grantedByGroups ?? []).map(g => g.groupName).join(", ") || "(none)"}</td>
                                        <td>{permission.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="admin-top-gap">
                            <Link to={`/admin/users${location.search}`}>Back to user list</Link>
                        </div>
                    </>
                )}
            </PageSection>
        </PageTemplate>
    );
}
