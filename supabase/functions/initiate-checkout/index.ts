import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { z } from "npm:zod@^3.23.8";

const requestSchema = z.object({
  slot_id: z.string({
    required_error: "slot_id is required",
    invalid_type_error: "slot_id is required",
  }).min(1, "slot_id is required"),
});

serve(async (req: Request) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Invalid JSON body");
    }

    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new Error(parseResult.error.issues[0]?.message || "slot_id is required");
    }

    const { slot_id } = parseResult.data;

    // 1. Authenticate the user calling the function
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) throw new Error("Invalid Authorization token");

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(jwt);
    if (userErr || !user) throw new Error("Unauthorized request");

    // 2. Initialize Service Role Client for secure DB checks and mutations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 3. Verify Slot Hold & Fetch Pricing
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('slots')
      .select(`
        *,
        court:courts ( id, venue_id, hourly_rate )
      `)
      .eq('id', slot_id)
      .single();

    if (slotErr || !slot) throw new Error("Slot not found");

    // Ensure slot is available or held by this user
    if (slot.status !== 'held' && slot.status !== 'available') {
      throw new Error(`Slot is not available for booking (status: ${slot.status})`);
    }

    if (slot.status === 'held') {
      if (slot.held_by && slot.held_by !== user.id) {
        throw new Error("Slot is currently held by another customer");
      }
      if (slot.held_until && new Date(slot.held_until).getTime() < Date.now()) {
        throw new Error("Slot hold has expired. Please reselect the slot.");
      }
    }

    // 4. Calculate Duration and Total Amount
    const [startH] = (slot.start_time || "00:00").split(":").map(Number);
    const [endH] = (slot.end_time || "01:00").split(":").map(Number);
    const durationHours = endH > startH ? endH - startH : 1;
    const hourlyRate = Number(slot.court?.hourly_rate) || 0;
    const totalAmount = hourlyRate > 0 ? hourlyRate * durationHours : 1000;

    // 5. Fetch Platform Commission from dynamic app_config
    const { data: config } = await supabaseAdmin
      .from('app_config')
      .select('commission_rate')
      .eq('id', 1)
      .maybeSingle();

    const commissionRate = Number(config?.commission_rate) || 0;
    const commissionAmount = Math.round((totalAmount * commissionRate / 100) * 100) / 100;
    const venuePayout = totalAmount - commissionAmount;

    // 6. Check for Existing Pending Booking or Create New Booking
    let bookingId: string;
    let bookingRef: string;

    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref')
      .eq('slot_id', slot.id)
      .eq('customer_id', user.id)
      .eq('payment_status', 'pending')
      .maybeSingle();

    if (existingBooking) {
      bookingId = existingBooking.id;
      bookingRef = existingBooking.booking_ref;
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      bookingRef = `KHEL-${randomSuffix}`;

      const { data: newBooking, error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .insert({
          booking_ref: bookingRef,
          customer_id: user.id,
          venue_id: slot.court.venue_id,
          court_id: slot.court.id,
          slot_id: slot.id,
          status: 'confirmed',
          payment_status: 'pending',
          total_charged: totalAmount,
          commission_amount_snapshot: commissionAmount,
          venue_payout_amount: venuePayout,
        })
        .select('id, booking_ref')
        .single();

      if (bookingErr || !newBooking) {
        throw new Error(bookingErr?.message || "Failed to create pending booking");
      }

      bookingId = newBooking.id;
      bookingRef = newBooking.booking_ref;
    }

    // 7. Initialize Safepay Payment Session (Tracker + TBT)
    const safepayPublicKey = Deno.env.get('SAFEPAY_PUBLIC_KEY') ?? '';
    const safepaySecretKey = Deno.env.get('SAFEPAY_SECRET_KEY') ?? '';
    const safepayEnv = Deno.env.get('SAFEPAY_ENV') ?? 'sandbox';
    const baseUrl = safepayEnv === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';

    let tracker = "";
    let tbt = "";

    // Step 7A: Create Tracker Session with booking_id attached to metadata
    if (safepayPublicKey) {
      try {
        const initRes = await fetch(`${baseUrl}/order/v1/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: safepayPublicKey,
            amount: totalAmount,
            currency: 'PKR',
            environment: safepayEnv,
            metadata: {
              booking_id: bookingId,
            },
          }),
        });

        if (initRes.ok) {
          const initData = await initRes.json();
          tracker = initData?.data?.token ?? "";
        } else {
          console.error("Safepay init error:", await initRes.text());
        }
      } catch (err: unknown) {
        console.error("Safepay init network error:", err);
      }
    }

    // Step 7B: Create Time-Based Token (Passport TBT) using Merchant Secret
    if (safepaySecretKey) {
      try {
        const tbtRes = await fetch(`${baseUrl}/client/passport/v1/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SFPY-MERCHANT-SECRET': safepaySecretKey,
          },
          body: JSON.stringify({
            client: safepayPublicKey,
          }),
        });

        if (tbtRes.ok) {
          const tbtData = await tbtRes.json();
          tbt = typeof tbtData?.data === 'string' ? tbtData.data : "";
        } else {
          console.error("Safepay passport error:", await tbtRes.text());
        }
      } catch (err: unknown) {
        console.error("Safepay passport network error:", err);
      }
    }

    // If tracker was created, link it to the booking
    if (tracker) {
      await supabaseAdmin
        .from('bookings')
        .update({ payment_gateway_ref: tracker })
        .eq('id', bookingId);
    }

    return new Response(JSON.stringify({
      success: true,
      booking_id: bookingId,
      booking_ref: bookingRef,
      amount: totalAmount,
      tracker: tracker,
      tbt: tbt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
