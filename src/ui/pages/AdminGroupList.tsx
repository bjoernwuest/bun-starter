import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { InputSwitch } from "primereact/inputswitch";
import { PageTemplate, PageSection } from "./PageTemplate.tsx";
import type { PageMeta } from "@/types/Page.ts";
import { apiGet } from "@/ui/api/index.ts";
import type { GroupsResponse } from "@/types/Api.ts";
import { FP_READ_GROUPS } from "@/ui/auth/functional_permissions.ts";

export const meta: PageMeta = {
    id: "admin-groups",
    urn: "urn:bun-starter:ui:page:admin-groups",
    path: "/admin/groups",
    title: "Groups",
    description: "Read-only group list and details.",
    menu: {
        section: "Administration",
        order: 20,
        label: "Groups",
        parent: "admin-home",
    },
    requiredFunctionalPermissions: [FP_READ_GROUPS.functionalPermissionName],
};

function StatusChip({ disabled }: { disabled: boolean }) {
    return <span className={`mui-pill ${disabled ? "pending" : ""}`}>{disabled ? "Disabled" : "Enabled"}</span>;
}

function formatTs(value: Date | string): string {
    return new Date(value as string).toLocaleString();
}

export function Component() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [groups, setGroups] = useState<GroupsResponse["groups"]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const queryPage = Number(searchParams.get("page") ?? "1");
    const queryPageSize = Number(searchParams.get("pageSize") ?? "10");
    const showDisabledGroups = searchParams.get("showDisabled") === "1";
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
            const setLoading = page === 1 && groups.length === 0 ? setIsLoading : setIsPageLoading;
            setLoading(true);
            try {
                const includeInactiveParam = showDisabledGroups ? "&includeInactive=true" : "";
                const payload = await apiGet<GroupsResponse>(`/api/groups?page=${page - 1}&pageSize=${pageSize}${includeInactiveParam}`);
                if (!cancelled) {
                    setGroups(payload.groups);
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
            <PageSection title="Group list">
                <div className="admin-toggle-row">
                    <span>Show disabled groups</span>
                    <InputSwitch checked={showDisabledGroups} onChange={(event) => updateQuery({ showDisabled: Boolean(event.value), page: 1 })} />
                </div>

                {isLoading || isPageLoading ? (
                    <p>Loading groups...</p>
                ) : (
                    <>
                        <table className="mui-simple-table admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Technical identifier</th>
                                    <th>Created</th>
                                    <th>Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => (
                                    <tr
                                        key={group.identifier}
                                        className="admin-clickable-row"
                                        onClick={() => navigate(`/admin/groups/${encodeURIComponent(group.identifier)}${location.search}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                navigate(`/admin/groups/${encodeURIComponent(group.identifier)}${location.search}`);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <td>{group.groupName}</td>
                                        <td><StatusChip disabled={group.disabled} /></td>
                                        <td><code>{group.identifier}</code></td>
                                        <td>{formatTs(group.createdAt)}</td>
                                        <td>{formatTs(group.updatedAt)}</td>
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
                            <span>{total} groups</span>
                        </div>
                    </>
                )}
            </PageSection>
        </PageTemplate>
    );
}

