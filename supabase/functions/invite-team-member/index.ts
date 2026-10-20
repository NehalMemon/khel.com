import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { z } from "npm:zod@^3.23.8";

const inviteSchema = z.object({
  email: z.string({
    required_error: "Missing required fields: 'email' and 'venue_id' are required.",
    invalid_type_error: "Missing required fields: 'email' and 'venue_id' are required.",
  }).email("Invalid email address"),
  venue_id: z.string({
    required_error: "Missing required fields: 'email' and 'venue_id' are required.",
    invalid_type_error: "Missing required fields: 'email' and 'venue_id' are required.",
  }).min(1, "Missing required fields: 'email' and 'venue_id' are required."),
  permissions: z.array(z.string()).default([]),
});

serve(async (req: Request) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Missing required fields: 'email' and 'venue_id' are required.");
    }

    const parseResult = inviteSchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new Error(parseResult.error.issues[0]?.message || "Missing required fields: 'email' and 'venue_id' are required.");
    }

    const { email, venue_id, permissions } = parseResult.data;

    // 1. Authenticate the caller (Venue Owner)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Unauthorized caller: Missing Authorization header");

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) throw new Error("Unauthorized caller: Invalid token");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) throw new Error("Unauthorized caller");

    // 2. Initialize Admin Client for secure reads/writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 3. Verify the caller actually owns the venue (or is platform admin)
    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', venue_id)
      .single();

    if (venueError || !venue) {
      throw new Error("Venue not found.");
    }

    if (venue.owner_id !== user.id) {
      // Check if caller is platform admin before rejecting
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'super_admin') {
        throw new Error("Unauthorized: You do not own this venue.");
      }
    }

    // 4. Send the Auth Invitation
    // Note: handle_new_user trigger will automatically create their profile record
    let newUserId: string;
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        role: 'venue_staff',
        name: email.split('@')[0]
      }
    });

    if (inviteError) {
      // If user already exists in auth, retrieve existing user ID
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        newUserId = existing.id;
      } else {
        throw inviteError;
      }
    } else if (authData?.user) {
      newUserId = authData.user.id;
    } else {
      throw new Error("Failed to invite user.");
    }

    // 5. Assign Permissions in the venue_team table
    const { error: teamError } = await supabaseAdmin
      .from('venue_team')
      .upsert({
        venue_id: venue_id,
        user_id: newUserId,
        permissions: permissions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'venue_id,user_id' });

    if (teamError) throw teamError;

    return new Response(JSON.stringify({ success: true, message: "Team member invited successfully." }), {
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
