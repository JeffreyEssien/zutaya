import { NextResponse, type NextRequest } from "next/server";
import { createServiceBooking } from "@/lib/servicesQueries";
import { sendEmail } from "@/lib/email";
import { SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/constants";

export async function POST(req: NextRequest) {
    try {
        const b = await req.json();
        const required = ["customerName", "customerEmail", "customerPhone", "headcount", "eventDate", "address"];
        for (const k of required) if (!b[k]) return NextResponse.json({ error: `${k} required` }, { status: 400 });

        const booking = await createServiceBooking({
            customerName: b.customerName,
            customerEmail: b.customerEmail,
            customerPhone: b.customerPhone,
            occasionId: b.occasionId,
            occasionLabel: b.occasionLabel,
            headcount: Number(b.headcount),
            eventDate: b.eventDate,
            eventTime: b.eventTime,
            address: b.address,
            city: b.city,
            state: b.state,
            locationNotes: b.locationNotes,
            animalSelections: Array.isArray(b.animalSelections) ? b.animalSelections : [],
            serviceTierId: b.serviceTierId,
            serviceTierLabel: b.serviceTierLabel,
            addOns: Array.isArray(b.addOns) ? b.addOns : [],
            estimatedTotal: b.estimatedTotal ? Number(b.estimatedTotal) : undefined,
            customerNotes: b.customerNotes,
        });

        const trackUrl = `${SITE_URL}/events/${booking.bookingCode}`;

        // Customer confirmation
        try {
            await sendEmail({
                to: booking.customerEmail,
                subject: `${SITE_NAME} — Event inquiry received (${booking.bookingCode})`,
                html: `
                    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;color:#222">
                      <h1 style="color:#7d4d2a;font-family:Georgia,serif;">Thank you, ${booking.customerName}.</h1>
                      <p>We've received your event inquiry for <strong>${booking.eventDate}</strong> with <strong>${booking.headcount} guests</strong>.</p>
                      <p>Our team will review and send a tailored quote within 24 hours.</p>
                      <p><strong>Booking reference:</strong> ${booking.bookingCode}</p>
                      <p><a href="${trackUrl}" style="display:inline-block;background:#3a6b3a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Track your booking →</a></p>
                      <p style="color:#888;font-size:12px;margin-top:30px;">— ${SITE_NAME}</p>
                    </div>`,
            });
        } catch {}
        // Admin notification
        try {
            await sendEmail({
                to: SITE_EMAIL,
                subject: `New event booking: ${booking.bookingCode} (${booking.headcount} pax)`,
                html: `<p><strong>${booking.customerName}</strong> (${booking.customerEmail} / ${booking.customerPhone})</p>
                       <p>${booking.occasionLabel || "Event"} · ${booking.headcount} pax · ${booking.eventDate}</p>
                       <p>${booking.address}</p>
                       <p>Tier: ${booking.serviceTierLabel || "—"}</p>
                       <p>Estimated: ₦${booking.estimatedTotal?.toLocaleString() || "—"}</p>
                       <p>Notes: ${booking.customerNotes || "—"}</p>`,
            });
        } catch {}

        return NextResponse.json({ ok: true, bookingCode: booking.bookingCode, trackUrl });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
    }
}
