// Supabase Edge Function: search-memory
// Handles hybrid vector + full-text search with customizable weights

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

    const { query, filters, weights, limit = 20 } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Valid search query string required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Generate query embedding
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("AI_PROVIDER_KEY");
    let queryVector: number[] = [];

    if (apiKey) {
      const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: query,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });
      const embedJson = await embedRes.json();
      queryVector = embedJson.data?.[0]?.embedding || [];
    } else {
      // Deterministic query vector mock for test/offline
      queryVector = new Array(EMBEDDING_DIMENSIONS).fill(0).map((_, i) => {
        const seed = query.charCodeAt(i % query.length);
        return Math.sin(seed + i) * 0.05;
      });
    }

    // 2. Execute Hybrid Search RPC
    const { data: results, error: rpcError } = await supabaseClient.rpc(
      "match_memories_hybrid",
      {
        query_embedding: queryVector,
        query_text: query,
        filter_source_type: filters?.sourceType || null,
        semantic_weight: weights?.semantic ?? 0.45,
        keyword_weight: weights?.keyword ?? 0.25,
        topic_weight: weights?.topic ?? 0.15,
        priority_weight: weights?.priority ?? 0.10,
        recency_weight: weights?.recency ?? 0.05,
        match_limit: limit,
      }
    );

    if (rpcError) throw rpcError;

    return new Response(
      JSON.stringify({
        success: true,
        query,
        count: results?.length || 0,
        results: results || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
