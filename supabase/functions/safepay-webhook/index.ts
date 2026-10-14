import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2";
import { z } from "npm:zod@^3.23.8";

const webhookSchema = z.object({
  event: z.string(),
  tracker: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  metadata: z
    .object({
      booking_id: z.string().optional(),
    })
    .passthrough()
    .optional(),
  data: z
    .object({
      tracker: z.string().optional(),
      metadata: z
        .object({
          booking_id: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
}).passthrough();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sfpy-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 1. Extract Safepay Signature Header
    const signature = req.headers.get("x-sfpy-signature") ?? req.headers.get("X-SFPY-SIGNATURE");
    const payload = await req.text();

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!payload || payload.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Empty payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Verify the Signature (HMAC SHA256)
    const secretKey = Deno.env.get("SAFEPAY_SECRET_KEY");
    if (secretKey) {
      const encoder = new TextEncoder();
      await crypto.subtle.importKey(
        "raw",
        encoder.encode(secretKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      // Safepay specific verification logic will go here.
      // For now, assuming successful verification for the architecture.
    }

    // 3. Parse and Validate Payload
    let rawBody: unknown;
    try {
      rawBody = JSON.parse(payload);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = webhookSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request payload",
          details: validationResult.error.flatten(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = validationResult.data;

    // Check if the transaction was actually successful
    if (data.event !== "payment.succeeded") {
      return new Response(
        JSON.stringify({ message: `Ignored event type: ${data.event}` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const gatewayRef = data.tracker ?? data.data?.tracker;
    const bookingId = data.metadata?.booking_id ?? data.data?.metadata?.booking_id;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing booking_id in metadata" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!gatewayRef) {
      return new Response(
        JSON.stringify({ error: "Missing tracker in payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Initialize Supabase Admin Client (bypasses RLS to update booking payment state)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 5. Update the bookings table
    const { data: updatedBookings, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        payment_status: "paid",
        payment_gateway_ref: gatewayRef,
      })
      .eq("id", bookingId)
      .select();

    if (updateError) {
      console.error("Database update error:", updateError.message);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!updatedBookings || updatedBookings.length === 0) {
      return new Response(
        JSON.stringify({ error: `Booking not found: ${bookingId}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Booking payment status updated successfully",
        booking: updatedBookings[0],
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Webhook Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});