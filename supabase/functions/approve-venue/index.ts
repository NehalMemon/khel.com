import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { z } from "npm:zod@^3.23.8";

const approveSchema = z.object({
  application_id: z.string({
    required_error: "application_id is required",
    invalid_type_error: "application_id is required",
  }).min(1, "application_id is required"),
});

serve(async (req: Request) => {
  // CORS headers for frontend requests
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const parseResult = approveSchema.safeParse(rawBody);

    if (!parseResult.success) {
      throw new Error(parseResult.error.issues[0]?.message || "application_id is required");
    }

    const { application_id } = parseResult.data;

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch the pending application
    const { data: app, error: fetchErr } = await supabaseAdmin
      .from('venue_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (fetchErr || !app) throw new Error("Application not found.");
    if (app.status !== 'pending') throw new Error("Application is not pending.");

    // 2. Invite the new owner (Auth triggers handle_new_user to create the profile)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(app.email, {
      data: { 
        role: 'venue_owner', 
        name: app.applicant_name, 
        phone: app.phone 
      }
    });
    
    if (authErr) throw authErr;
    const newUserId = authData.user.id;
    
    // 3. Generate a unique slug for the venue
    const baseSlug = app.venue_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const uniqueSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

    // 4. Create the Draft Venue
    // PostGIS casts WKT strings like 'POINT(lon lat)' automatically
    const { error: venueErr } = await supabaseAdmin
      .from('venues')
      .insert({
        owner_id: newUserId,
        name: app.venue_name,
        slug: uniqueSlug,
        address: app.venue_address,
        status: 'draft',
        coordinates: 'POINT(67.0000 24.8600)' // Default Karachi coordinates; owner adjusts during setup
      });
      
    if (venueErr) throw venueErr;

    // 5. Update Application Status
    const { error: updateErr } = await supabaseAdmin
      .from('venue_applications')
      .update({ status: 'approved' })
      .eq('id', application_id);
      
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, message: "Venue approved and owner invited." }), {
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
