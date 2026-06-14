import { ConfigValueTypes, type ConfigEntryType } from "@/types/ConfigEntry.ts";
import { getConfigEntriesByKey, upsertConfigEntry } from "@/repo/ConfigRepo.ts";
import { getDatabaseConnection } from "@/services/database.ts";

export const config = {
    cfgUserListPageSizes: {
        domain: "User Interface",
        key: "UserListPageSizes",
        description: "Page sizes for user list pagination as number array, e.g. [10, 20, 50].",
        type: ConfigValueTypes["number[]"],
        value: [10, 20, 50],
        inputFormat: "^[1-9][0-9]{0,3}$",
        outputFormat: "",
        editInUI: true,
        mandatoryForStart: false,
    } satisfies ConfigEntryType,
};

const db = await getDatabaseConnection();
const existing = await getConfigEntriesByKey(db, config.cfgUserListPageSizes.domain, config.cfgUserListPageSizes.key, { limit: 1 });
if (existing.length < 1) {
    await upsertConfigEntry(db, config.cfgUserListPageSizes);
}
