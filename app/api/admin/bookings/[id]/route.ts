import { NextResponse, type NextRequest } from "next/server";
import { updateServiceBooking, getServiceBookingByCode } from "@/lib/servicesQueries";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const b = await req.json();

        const supabase = getSupabaseServiceClient();
        const before = supabase ? (await supabase.from("service_bookings").select("*").eq("id", id).single()).data : null;

        await updateServiceBooking(id, {
            status: b.status,
            quotedTotal: b.quotedTotal !== undefined ? Number(b.quotedTotal) : undefined,
            depositAmount: b.depositAmount !== undefined ? Number(b.depositAmount) : undefined,
            depositPaid: b.depositPaid,
            adminNotes: b.adminNotes,
            leftoverKg: b.leftoverKg !== undefined ? Number(b.leftoverKg) : undefined,
        });

        // Quote sent email
        if (b.status === "quoted" && before && before.status !== "quoted" && before.customer_email) {
            const code = before.booking_code;
            try {
                await sendEmail({
                    to: before.customer_email,
                    subject: `${SITE_NAME} — Your event quote is ready (${code})`,
                    html: `<p>Hi ${before.customer_name},</p>
                           <p>Your tailored quote for <strong>${before.event_date}</strong> is ready.</p>
                           <p><strong>Quoted total:</strong> ₦${Number(b.quotedTotal || 0).toLocaleString()}</p>
                           ${b.depositAmount ? `<p><strong>Deposit to confirm:</strong> ₦${Number(b.depositAmount).toLocaleString()}</p>` : ""}
                           <p><a href="${SITE_URL}/events/${code}" style="display:inline-block;background:#3a6b3a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View booking →</a></p>`,
                });
            } catch {}
        }

        // Post-event upsell when complete with leftovers
        if (b.status === "complete" && b.leftoverKg && Number(b.leftoverKg) > 0 && before?.customer_email) {
            const code = before.booking_code;
            try {
                await sendEmail({
                    to: before.customer_email,
                    subject: `${SITE_NAME} — Make the most of your leftovers`,
                    html: `<p>Hi ${before.customer_name},</p>
                           <p>Hope the event was a hit. We have <strong>${Number(b.leftoverKg)}kg</strong> of leftover meat from your event.</p>
                           <p>Want it processed into stew packs, vacuum-sealed for the freezer, and delivered? One tap below:</p>
                           <p><a href="${SITE_URL}/shop?leftover=${code}" style="display:inline-block;background:#3a6b3a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Convert leftovers →</a></p>
                           <p style="color:#666;font-size:12px;">Reference ${code}</p>`,
                });
                if (supabase) {
                    await supabase.from("post_event_followups").insert({ booking_id: id, sent_at: new Date().toISOString() });
                }
            } catch {}
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message }, { status: 500 });
    }
}
