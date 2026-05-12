import { getServiceBookings } from "@/lib/servicesQueries";
import BookingsAdmin from "@/components/modules/BookingsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
    const bookings = await getServiceBookings();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">Event Bookings</h1>
                <p className="text-warm-cream/60 text-sm">Review inquiries, send quotes, track event lifecycle.</p>
            </div>
            <BookingsAdmin initial={bookings} />
        </div>
    );
}
