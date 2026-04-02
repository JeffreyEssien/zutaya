import { NextRequest, NextResponse } from "next/server";
import { createNewsletterSubscriber } from "@/lib/queries";
import { sendNewsletterWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, firstName, source } = body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
        }

        const { subscriber, alreadyExists } = await createNewsletterSubscriber({
            email,
            firstName,
            source: source || "footer",
        });

        if (alreadyExists) {
            return NextResponse.json({ message: "You're already subscribed!", alreadyExists: true });
        }

        // Send welcome email (non-blocking)
        if (subscriber) {
            sendNewsletterWelcomeEmail(subscriber.email, subscriber.firstName, subscriber.token).catch(console.error);
        }

        return NextResponse.json({ message: "Successfully subscribed!", subscriber });
    } catch (error: any) {
        console.error("Newsletter subscribe error:", error);
        return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }
}
