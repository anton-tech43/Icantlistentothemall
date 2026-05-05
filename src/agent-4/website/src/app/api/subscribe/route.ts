import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const normalised = email.trim().toLowerCase();
  const confirmation_token = crypto.randomUUID();

  const { error } = await supabase
    .from("subscribers")
    .upsert(
      {
        email: normalised,
        status: "pending",
        confirmation_token,
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
