// Supabase Edge Function: process-capture
// Handles validation, storage of captures, source deduplication, and triggers async AI processing

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    // Verify authenticated user identity from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user identity" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { source, content, engagement, intelligence, privacy, captureMethod } = payload;

    if (!source || !source.url || !source.canonicalUrl) {
      return new Response(JSON.stringify({ error: "Invalid source data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Deduplicate/Upsert source
    const { data: existingSource } = await supabaseClient
      .from("sources")
      .select("id")
      .eq("user_id", user.id)
      .eq("canonical_url", source.canonicalUrl)
      .maybeSingle();

    let sourceId = existingSource?.id;

    if (!sourceId) {
      const { data: newSource, error: sourceInsertError } = await supabaseClient
        .from("sources")
        .insert({
          user_id: user.id,
          url: source.url.slice(0, 2048),
          canonical_url: source.canonicalUrl.slice(0, 2048),
          source_type: source.sourceType || "generic",
          platform: source.platform || "Web",
          title: (source.title || "").slice(0, 500),
          author: source.author ? source.author.slice(0, 255) : null,
          channel: source.channel ? source.channel.slice(0, 255) : null,
          favicon_url: source.faviconUrl ? source.faviconUrl.slice(0, 2048) : null,
          published_at: source.publishedAt || null,
        })
        .select("id")
        .single();

      if (sourceInsertError) throw sourceInsertError;
      sourceId = newSource.id;
    }

    // 2. Insert Capture
    const sanitizedText = (content?.text || "").slice(0, 100000);
    const sanitizedExcerpt = (content?.excerpt || "").slice(0, 2000);

    const { data: newCapture, error: captureError } = await supabaseClient
      .from("captures")
      .insert({
        user_id: user.id,
        source_id: sourceId,
        content: sanitizedText,
        excerpt: sanitizedExcerpt,
        engagement_timestamp_seconds: engagement?.currentTimestampSeconds || null,
        engagement_duration_seconds: engagement?.engagementDurationSeconds || null,
        priority_score: intelligence?.priorityScore || 0,
        capture_method: captureMethod || "manual",
        processing_status: "pending",
        sync_status: "synced",
      })
      .select("id")
      .single();

    if (captureError) throw captureError;

    // 3. Record Capture Privacy metadata
    await supabaseClient.from("capture_privacy").insert({
      capture_id: newCapture.id,
      user_id: user.id,
      transcript_captured: Boolean(privacy?.transcriptCaptured),
      full_text_captured: Boolean(privacy?.fullTextCaptured),
      metadata_captured: Boolean(privacy?.metadataCaptured ?? true),
      locally_processed: Boolean(privacy?.locallyProcessed ?? true),
      backend_synced: true,
    });

    // 4. Link Topics from candidates
    if (Array.isArray(intelligence?.topicCandidates)) {
      for (const topicName of intelligence.topicCandidates) {
        if (!topicName || typeof topicName !== "string") continue;
        const normalized = topicName.trim().toLowerCase().slice(0, 100);
        if (!normalized) continue;

        // Upsert topic
        const { data: topic } = await supabaseClient
          .from("topics")
          .upsert(
            { user_id: user.id, name: topicName.trim(), normalized_name: normalized },
            { onConflict: "user_id,normalized_name" }
          )
          .select("id")
          .single();

        if (topic) {
          await supabaseClient
            .from("capture_topics")
            .insert({
              capture_id: newCapture.id,
              topic_id: topic.id,
              user_id: user.id,
              confidence: 0.9,
              source: "keyword",
            })
            .catch(() => {}); // Ignore duplicate join
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: newCapture.id,
        sourceId,
        processingStatus: "pending",
        message: "Saved to your memory.",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
