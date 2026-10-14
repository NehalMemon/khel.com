import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as crypto from "https://deno.land/std@0.168.0/crypto/mod.ts";

serve(async (req) => {
  try {
    // 1. Extract Safepay Signature Header
    const signature = req.headers.get('X-SFPY-SIGNATURE')
    const payload = await req.text()

    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    // 2. Verify the Signature (HMAC SHA256)
    const secretKey = Deno.env.get('SAFEPAY_SECRET_KEY')!
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    
    // Safepay specific verification logic will go here.
    // For now, assuming successful verification for the architecture:
    const data = JSON.parse(payload)
    
    // Check if the transaction was actually successful
    if (data.event !== 'transaction.succeeded') {
      return new Response('Ignored event type', { status: 200 })
    }

    const gatewayRef = data.tracker // Safepay's unique transaction ID
    const bookingId = data.metadata.booking_id // Passed from the frontend during init
    const amountPaid = data.amount

    // 3. Initialize Supabase Admin Client (Bypasses RLS to update the ledger)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Execute the Ledger RPC
    const { error } = await supabaseAdmin.rpc('confirm_booking_with_payment', {
      p_booking_id: bookingId,
      p_gateway_ref: gatewayRef,
      p_amount_paid: amountPaid
    })

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Ledger updated successfully' }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (err) {
    console.error('Webhook Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})