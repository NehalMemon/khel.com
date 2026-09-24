import "@supabase/functions-js/edge-runtime.d.ts";
import { z } from "zod";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Zero-Trust: Schema validation for incoming payload
const requestSchema = z.object({
  folder: z.string().trim().min(1).max(100).optional(),
}).optional();

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Read secrets from environment
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");

    if (!apiKey || !apiSecret || !cloudName) {
      console.error("Missing Cloudinary environment variables");
      return new Response(
        JSON.stringify({ error: "Cloudinary credentials not configured on server" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate incoming payload
    let rawBody: unknown = {};
    const text = await req.text();
    if (text && text.trim().length > 0) {
      try {
        rawBody = JSON.parse(text);
      } catch {
        return new Response(
          JSON.stringify({ error: "Malformed JSON payload" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const validationResult = requestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request payload",
          details: validationResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const folder = validationResult.data?.folder;
    const timestamp = Math.floor(Date.now() / 1000);

    // Build the string to sign according to Cloudinary specifications
    // Parameters must be sorted alphabetically: folder, then timestamp
    const paramsToSign = folder
      ? `folder=${folder}&timestamp=${timestamp}`
      : `timestamp=${timestamp}`;

    const stringToSign = `${paramsToSign}${apiSecret}`;

    // Generate SHA-1 hex digest using standard Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return new Response(
      JSON.stringify({
        signature,
        timestamp,
        api_key: apiKey,
        cloud_name: cloudName,
        folder: folder || undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error signing Cloudinary upload:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
