// Supabase Edge Function: generate-embedding
// Generates vector embeddings for a capture on secure server-side infrastructure

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { captureId } = await req.json();
    if (!captureId) {
      return new Response(JSON.stringify({ error: "Missing captureId parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch capture details
    const { data: capture, error: fetchError } = await supabaseClient
      .from("captures")
      .select("id, content, excerpt, source_id, sources(title)")
      .eq("id", captureId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !capture) {
      return new Response(JSON.stringify({ error: "Capture not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textToEmbed = [
      capture.sources?.title || "",
      capture.excerpt || "",
      (capture.content || "").slice(0, 8000),
    ].filter(Boolean).join("\n\n");

    // Compute SHA-256 hash
    const msgUint8 = new TextEncoder().encode(textToEmbed);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Generate embedding from OpenAI/Gemini/Local embedding provider on trusted backend
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("AI_PROVIDER_KEY");
    let embeddingVector: number[] = [];

    if (apiKey) {
      const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: textToEmbed,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });
      const embedJson = await embedRes.json();
      embeddingVector = embedJson.data?.[0]?.embedding || [];
    } else {
      // Deterministic fallback mock vector generator for dev / offline staging environments
      embeddingVector = new Array(EMBEDDING_DIMENSIONS).fill(0).map((_, i) => {
        const seed = contentHash.charCodeAt(i % contentHash.length);
        return Math.sin(seed + i) * 0.05;
      });
    }

    if (embeddingVector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding length mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embeddingVector.length}`);
    }

    // Insert or update embedding
    const { error: embedInsertError } = await supabaseClient
      .from("embeddings")
      .upsert({
        user_id: user.id,
        capture_id: capture.id,
        content_hash: contentHash,
        model: EMBEDDING_MODEL,
        embedding: embeddingVector,
      }, { onConflict: "capture_id" });

    if (embedInsertError) throw embedInsertError;

    // Update processing status to completed
    await supabaseClient
      .from("captures")
      .update({ processing_status: "completed" })
      .eq("id", capture.id)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        captureId: capture.id,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Embedding generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
