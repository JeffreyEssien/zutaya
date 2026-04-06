import { getCronLogs } from "@/lib/queries";
import CronDashboard from "@/components/modules/CronDashboard";

export default async function CronPage() {
    const logs = await getCronLogs(100);
    return <CronDashboard initialLogs={logs} />;
}
