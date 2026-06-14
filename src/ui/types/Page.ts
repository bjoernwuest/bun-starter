import type { ComponentType } from "react";

/** Describes how a page should appear in the application's navigation menu. */
export type MenuEntry = {
    /** The menu group or section the page belongs to. */
    section: string;
    /** Sort order within the menu section. Lower values appear first. */
    order: number;
    /** The human-readable label shown in the menu. */
    label: string;
    /**
     * Optional parent page ID. When set, this page is nested beneath the
     * referenced page in the menu hierarchy.
     */
    parent?: string;
    /** When `true`, the page is excluded from navigation menus. */
    hidden?: boolean;
};

/**
 * Shared metadata for an application page.
 */
export type PageMeta = {
    id: string;
    urn: string;
    path: string;
    title: string;
    description: string;
    menu: MenuEntry;
    requiredFunctionalPermissions?: readonly string[];
};

/** A page module combines metadata with the React component that renders the page. */
export type PageModule = {
    meta: PageMeta;
    Component: ComponentType;
};

/** A leaf nav item that links directly to a single page. */
export type NavLeafItem = {
    kind: "leaf";
    page: PageModule;
};

/** A group nav item whose children are nested beneath it in the sidebar. */
export type NavGroupItem = {
    kind: "group";
    page: PageModule;
    children: NavLeafItem[];
};

/** A single item in a nav section - either a leaf or a collapsible group. */
export type NavItem = NavLeafItem | NavGroupItem;

/** A top-level section in the sidebar containing one or more nav items. */
export type NavSection = {
    section: string;
    items: NavItem[];
};

