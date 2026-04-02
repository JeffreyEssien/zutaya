import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
    getNewsletterCampaigns,
    createNewsletterCampaign,
    updateNewsletterCampaign,
    deleteNewsletterCampaign,
    getActiveNewsletterSubscribers,
    getNewsletterSubscribers,
    deleteNewsletterSubscriber,
} from "@/lib/queries";
import { sendNewsletterCampaignEmail } from "@/lib/email";

async function isAdmin() {
    const c = await cookies();
    return !!c.get("admin_session")?.value;
}

export async function GET(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type");

    if (type === "subscribers") {
        const subscribers = await getNewsletterSubscribers();
        return NextResponse.json(subscribers);
    }

    const campaigns = await getNewsletterCampaigns();
    return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
        const { subject, content } = body;
        if (!subject || !content) {
            return NextResponse.json({ error: "Subject and content are required" }, { status: 400 });
        }
        const id = await createNewsletterCampaign({ subject, content });
        return NextResponse.json({ id });
    }

    if (action === "update") {
        const { id, subject, content } = body;
        if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        await updateNewsletterCampaign(id, { subject, content });
        return NextResponse.json({ success: true });
    }

    if (action === "send") {
        const { id, subject, content } = body;
        if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

        const subscribers = await getActiveNewsletterSubscribers();
        if (subscribers.length === 0) {
            return NextResponse.json({ error: "No active subscribers" }, { status: 400 });
        }

        // Mark as sending
        await updateNewsletterCampaign(id, { status: "sending" });

        // Send emails in batches (non-blocking for the response)
        const sendAll = async () => {
            let sent = 0;
            for (const sub of subscribers) {
                try {
                    await sendNewsletterCampaignEmail(sub.email, subject, content, sub.token);
                    sent++;
                } catch (e) {
                    console.error(`Failed to send to ${sub.email}:`, e);
                }
            }
            await updateNewsletterCampaign(id, {
                status: "sent",
                sentAt: new Date().toISOString(),
                recipientCount: sent,
            });
        };

        sendAll().catch(console.error);

        return NextResponse.json({ message: `Sending to ${subscribers.length} subscribers...`, recipientCount: subscribers.length });
    }

    if (action === "delete") {
        const { id } = body;
        if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
        await deleteNewsletterCampaign(id);
        return NextResponse.json({ success: true });
    }

    if (action === "delete_subscriber") {
        const { id } = body;
        if (!id) return NextResponse.json({ error: "Subscriber ID required" }, { status: 400 });
        await deleteNewsletterSubscriber(id);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
