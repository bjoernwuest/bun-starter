import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { InputSwitch } from "primereact/inputswitch";
import { PageTemplate, PageSection } from "./PageTemplate.tsx";
import type { PageMeta } from "@/ui/types/Page.ts";
import { apiGet } from "@/ui/api/index.ts";
import type { UsersResponse } from "@/ui/types/AdminApi.ts";
import { FP_READ_USERS } from "@/ui/auth/functional_permissions.ts";

export const meta: PageMeta = {
    id: "admin-users",
    urn: "urn:bun-starter:ui:page:admin-users",
    path: "/admin/users",
    title: "Users",
    description: "Read-only user list and details.",
    menu: {
        section: "Administration",
        order: 10,
        label: "Users",
        parent: "admin-home",
    },
    requiredFunctionalPermissions: [FP_READ_USERS.functionalPermissionName],
};

function StatusChip({ disabled }: { disabled: boolean }) {
    return <span className={`mui-pill ${disabled ? "pending" : ""}`}>{disabled ? "Disabled" : "Enabled"}</span>;
}

export function Component() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState<UsersResponse["users"]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const queryPage = Number(searchParams.get("page") ?? "1");
    const queryPageSize = Number(searchParams.get("pageSize") ?? "10");
    const showDisabledUsers = searchParams.get("showDisabled") === "1";
    const page = Number.isInteger(queryPage) && queryPage > 0 ? queryPage : 1;
    const pageSize = Number.isInteger(queryPageSize) && queryPageSize > 0 ? queryPageSize : 10;
    const [availablePageSizes, setAvailablePageSizes] = useState<number[]>([10, 20, 50]);
    const [total, setTotal] = useState(0);

    const updateQuery = (patch: { page?: number; pageSize?: number; showDisabled?: boolean }) => {
        const next = new URLSearchParams(searchParams);
        if (patch.page !== undefined) next.set("page", String(patch.page));
        if (patch.pageSize !== undefined) next.set("pageSize", String(patch.pageSize));
        if (patch.showDisabled !== undefined) {
            if (patch.showDisabled) next.set("showDisabled", "1");
            else next.delete("showDisabled");
        }
        setSearchParams(next);
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const setLoading = page === 1 && users.length === 0 ? setIsLoading : setIsPageLoading;
            setLoading(true);
            try {
                const includeInactiveParam = showDisabledUsers ? "&includeInactive=true" : "";
                const payload = await apiGet<UsersResponse>(`/api/users?page=${page - 1}&pageSize=${pageSize}${includeInactiveParam}`);
                if (!cancelled) {
                    setUsers(payload.users);
                    if (payload.page !== page - 1) updateQuery({ page: payload.page + 1 });
                    setTotal(payload.total);
                    setAvailablePageSizes(payload.availablePageSizes);
                    if (!payload.availablePageSizes.includes(pageSize) && payload.availablePageSizes.length > 0) {
                        updateQuery({ page: 1, pageSize: payload.availablePageSizes[0]! });
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                    setIsPageLoading(false);
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [page, pageSize, searchParams.toString()]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <PageTemplate urn={meta.urn} title={meta.title} description={meta.description}>
            <PageSection title="User list">
                <div className="admin-toggle-row">
                    <span>Show disabled users</span>
                    <InputSwitch checked={showDisabledUsers} onChange={(event) => updateQuery({ showDisabled: Boolean(event.value), page: 1 })} />
                </div>

                {isLoading || isPageLoading ? (
                    <p>Loading users...</p>
                ) : (
                    <>
                        <table className="mui-simple-table admin-table">
                            <thead>
                                <tr>
                                    <th>First name</th>
                                    <th>Last name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Technical identifier</th>
                                    <th>Created</th>
                                    <th>Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.identifier}
                                        className="admin-clickable-row"
                                        onClick={() => navigate(`/admin/users/${encodeURIComponent(user.identifier)}${location.search}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                navigate(`/admin/users/${encodeURIComponent(user.identifier)}${location.search}`);
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <td>{user.firstName}</td>
                                        <td>{user.lastName}</td>
                                        <td>{user.email}</td>
                                        <td><StatusChip disabled={user.disabled} /></td>
                                        <td><code>{user.identifier}</code></td>
                                        <td>{new Date(user.createdAt).toLocaleString()}</td>
                                        <td>{new Date(user.updatedAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="admin-pager-row">
                            <button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: Math.max(1, page - 1) })}>
                                Previous
                            </button>
                            <span>Page {page} of {totalPages}</span>
                            <button type="button" disabled={page >= totalPages} onClick={() => updateQuery({ page: Math.min(totalPages, page + 1) })}>
                                Next
                            </button>
                            <label>
                                Page size
                                <select
                                    className="admin-page-size"
                                    value={pageSize}
                                    onChange={(event) => {
                                        updateQuery({ page: 1, pageSize: Number(event.target.value) });
                                    }}
                                >
                                    {availablePageSizes.map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </label>
                            <span>{total} users</span>
                        </div>
                    </>
                )}
            </PageSection>
        </PageTemplate>
    );
}
