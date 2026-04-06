import { getAuditLogs } from "@/lib/adminAuth";
import AuditLogView from "@/components/modules/AuditLogView";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
    const logs = await getAuditLogs(500);
    return <AuditLogView initialLogs={logs} />;
}
