import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { PageSection, PageTemplate } from "./PageTemplate.tsx";
import type { PageMeta } from "@/types/Page.ts";
import {
    FP_PROLONG_API_KEYS,
    FP_VIEW_API_KEYS,
} from "@/ui/auth/functional_permissions.ts";
import type { FunctionalPermissionsResponse } from "@/types/Api.ts";
import { apiGet } from "@/ui/api/index.ts";
import {
    disableApiKey,
    getApiKeyDetail,
    prolongApiKey,
    replaceApiKeyPermissions,
    updateApiKeyMetadata,
} from "@/ui/api/ApiKeys.ts";
import type {ApiKeyDetailResponse} from "@/types/ApiKey.ts";

type ViewerContext = { permissionNames: string[] };

export const meta: PageMeta = {
    id: "admin-api-key-detail",
    urn: "urn:bun-starter:ui:page:admin-api-key-detail",
    path: "/admin/api-keys/:apikeyid",
    title: "API key details",
    description: "Edit API key metadata, permissions, and lifecycle state.",
    menu: {
        section: "Administration",
        order: 41,
        label: "API key details",
        parent: "admin-api-keys",
        hidden: true,
    },
    requiredFunctionalPermissions: [FP_VIEW_API_KEYS.functionalPermissionName],
};

export function Component() {
    const { apikeyid } = useParams();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [viewerContext, setViewerContext] = useState<ViewerContext>({ permissionNames: [] });
    const [detail, setDetail] = useState<ApiKeyDetailResponse | null>(null);
    const [allPermissions, setAllPermissions] = useState<FunctionalPermissionsResponse["functionalPermissions"]>([]);
    const [permissionsTotal, setPermissionsTotal] = useState(0);
    const [permissionsAvailablePageSizes, setPermissionsAvailablePageSizes] = useState<number[]>([10, 20, 50]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [nameDraft, setNameDraft] = useState("");
    const [descriptionDraft, setDescriptionDraft] = useState("");
    const [prolongDays, setProlongDays] = useState(90);
    const [prolongVisible, setProlongVisible] = useState(false);
    const [prolongError, setProlongError] = useState<string | null>(null);

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

    const canManage = viewerContext.permissionNames.includes(FP_PROLONG_API_KEYS.functionalPermissionName);

    const load = async () => {
        if (!apikeyid) return;
        setIsLoading(true);
        const [context, payload, permissionsPayload] = await Promise.all([
            apiGet<ViewerContext>("/api/me/context"),
            getApiKeyDetail(apikeyid),
            apiGet<FunctionalPermissionsResponse>(`/api/functionalpermissions?page=${permissionsPage - 1}&pageSize=${permissionsPageSize}`),
        ]);
        setViewerContext(context);
        setDetail(payload);
        setAllPermissions(permissionsPayload.functionalPermissions);
        setPermissionsTotal(permissionsPayload.total);
        setPermissionsAvailablePageSizes(permissionsPayload.availablePageSizes);
        if (permissionsPayload.page !== permissionsPage - 1) updateQuery({ permissionsPage: permissionsPayload.page + 1 });
        if (!permissionsPayload.availablePageSizes.includes(permissionsPageSize) && permissionsPayload.availablePageSizes.length > 0) {
            updateQuery({ permissionsPage: 1, permissionsPageSize: permissionsPayload.availablePageSizes[0]! });
        }
        setNameDraft(payload.apiKey.name);
        setDescriptionDraft(payload.apiKey.description ?? "");
        setIsLoading(false);
    };

    const refreshDetailOnly = async () => {
        if (!apikeyid) return;
        const payload = await getApiKeyDetail(apikeyid);
        setDetail(payload);
        setNameDraft(payload.apiKey.name);
        setDescriptionDraft(payload.apiKey.description ?? "");
    };

    useEffect(() => {
        void load();
    }, [apikeyid, permissionsPage, permissionsPageSize, searchParams.toString()]);

    const assignedPermissionSet = useMemo(() => new Set(detail?.permissionIdentifiers ?? []), [detail]);
    const statusLabel = detail?.apiKey.disabled
        ? "Disabled"
        : (detail && new Date(detail.apiKey.expiresAt).getTime() <= Date.now() ? "Expired" : "Active");
    const isNameChanged = !!detail && nameDraft.trim().length > 0 && nameDraft.trim() !== detail.apiKey.name;
    const currentDescription = detail?.apiKey.description ?? "";
    const isDescriptionChanged = !!detail && descriptionDraft.trim() !== currentDescription;

    const saveName = async () => {
        if (!detail) return;
        await updateApiKeyMetadata(detail.apiKey.identifier, {
            knownUpdatedAt: detail.apiKey.updatedAt,
            name: nameDraft.trim(),
            description: detail.apiKey.description,
        });
        await load();
    };

    const saveDescription = async () => {
        if (!detail) return;
        await updateApiKeyMetadata(detail.apiKey.identifier, {
            knownUpdatedAt: detail.apiKey.updatedAt,
            name: detail.apiKey.name,
            description: descriptionDraft.trim().length > 0 ? descriptionDraft.trim() : null,
        });
        await load();
    };

    const submitProlong = async () => {
        if (!detail) return;
        if (!Number.isInteger(prolongDays) || prolongDays < 1 || prolongDays > 730) {
            setProlongError("Please choose a value between 1 and 730 days.");
            return;
        }
        await prolongApiKey(detail.apiKey.identifier, {
            knownUpdatedAt: detail.apiKey.updatedAt,
            days: prolongDays,
        });
        setProlongVisible(false);
        setProlongError(null);
        await load();
    };

    return (
        <PageTemplate urn={meta.urn} title={meta.title} description={meta.description}>
            <PageSection title="API key details">
                {isLoading || !detail ? (
                    <p>Loading API key details...</p>
                ) : (
                    <>
                        <div className="admin-detail-grid">
                            <div>
                                <strong>Name:</strong>
                                {canManage ? (
                                    <div className="admin-config-actions admin-top-gap">
                                        <InputText value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
                                        {isNameChanged ? <button type="button" onClick={saveName}>Save</button> : null}
                                    </div>
                                ) : ` ${detail.apiKey.name}`}
                            </div>
                            <div><strong>Status:</strong> {statusLabel}</div>
                            <div>
                                <strong>Description:</strong>
                                {canManage ? (
                                    <div className="admin-config-inline-editor admin-top-gap">
                                        <InputTextarea value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} rows={4} autoResize />
                                        {isDescriptionChanged ? <button type="button" onClick={saveDescription}>Save</button> : null}
                                    </div>
                                ) : ` ${detail.apiKey.description ?? "-"}`}
                            </div>
                            <div><strong>Identifier:</strong> <code>{detail.apiKey.identifier}</code></div>
                            <div><strong>Created by:</strong> <code>{detail.apiKey.createdBy}</code></div>
                            <div><strong>Created:</strong> {new Date(detail.apiKey.createdAt).toLocaleString()}</div>
                            <div><strong>Expires:</strong> {new Date(detail.apiKey.expiresAt).toLocaleString()}</div>
                            <div><strong>Last prolonged:</strong> {detail.apiKey.lastProlongedAt ? new Date(detail.apiKey.lastProlongedAt).toLocaleString() : "-"}</div>
                            <div><strong>Last prolonged by:</strong> {detail.apiKey.lastProlongedBy ? <code>{detail.apiKey.lastProlongedBy}</code> : "-"}</div>
                            <div><strong>Disabled at:</strong> {detail.apiKey.disabledAt ? new Date(detail.apiKey.disabledAt).toLocaleString() : "-"}</div>
                            <div><strong>Disabled by:</strong> {detail.apiKey.disabledBy ? <code>{detail.apiKey.disabledBy}</code> : "-"}</div>
                        </div>

                        {canManage ? (
                            <div className="admin-top-gap admin-config-inline-editor">
                                <h3>Actions</h3>
                                <div className="admin-config-inline-editor">
                                    {!detail.apiKey.disabled ? (
                                        <button type="button" onClick={() => { setProlongVisible(true); setProlongError(null); }}>Prolong</button>
                                    ) : null}
                                    {!detail.apiKey.disabled ? (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                await disableApiKey(detail.apiKey.identifier, { knownUpdatedAt: detail.apiKey.updatedAt });
                                                await load();
                                            }}
                                        >
                                            Disable
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="admin-top-gap">
                            <h3>Functional permissions</h3>
                            <table className="mui-simple-table admin-table">
                                <thead>
                                    <tr>
                                        <th>Assigned</th>
                                        <th>Name</th>
                                        <th>Group</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPermissions.map((permission) => {
                                        const checked = assignedPermissionSet.has(permission.identifier);
                                        return (
                                            <tr key={permission.identifier}>
                                                <td>
                                                    {canManage ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={isSavingPermissions}
                                                            onChange={async () => {
                                                                if (!detail) return;
                                                                setIsSavingPermissions(true);
                                                                const next = new Set(assignedPermissionSet);
                                                                if (checked) next.delete(permission.identifier);
                                                                else next.add(permission.identifier);
                                                                try {
                                                                    await replaceApiKeyPermissions(detail.apiKey.identifier, {
                                                                        knownUpdatedAt: detail.apiKey.updatedAt,
                                                                        permissionIdentifiers: [...next],
                                                                    });
                                                                    // Refresh only detail payload (updatedAt + assignments) to avoid full-page flicker.
                                                                    await refreshDetailOnly();
                                                                } finally {
                                                                    setIsSavingPermissions(false);
                                                                }
                                                            }}
                                                        />
                                                    ) : (checked ? "Yes" : "No")}
                                                </td>
                                                <td>{permission.functionalPermissionName}</td>
                                                <td>{permission.group}</td>
                                                <td>{permission.description}</td>
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

                        <div className="admin-top-gap">
                            <Link to={`/admin/api-keys${location.search}`}>Back to API key list</Link>
                        </div>
                    </>
                )}
            </PageSection>

            <Dialog
                header="Prolong API key"
                visible={prolongVisible}
                modal
                className="admin-config-dialog admin-api-key-dialog"
                style={{ width: "min(520px, 95vw)" }}
                onHide={() => {
                    setProlongVisible(false);
                    setProlongError(null);
                }}
            >
                <div className="admin-config-modal-body">
                    <p>Choose how many days to extend this API key.</p>
                    {prolongError ? <p className="admin-config-validation-error">{prolongError}</p> : null}
                    <label>
                        Days (1-730)
                        <InputText
                            value={String(prolongDays)}
                            inputMode="numeric"
                            onChange={(event) => {
                                const next = Number(event.target.value);
                                setProlongDays(Number.isFinite(next) ? Math.trunc(next) : prolongDays);
                            }}
                        />
                    </label>
                    <div className="admin-config-actions">
                        <button type="button" onClick={submitProlong}>Confirm</button>
                    </div>
                </div>
            </Dialog>
        </PageTemplate>
    );
}

