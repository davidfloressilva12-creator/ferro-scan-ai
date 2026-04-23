// Smart product search using Lovable AI Gateway (Gemini)
// Maps natural language queries to category names and brands present in inventory.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, categories, brands } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Eres un asistente experto en ferretería. Tu tarea es analizar una consulta en lenguaje natural y devolver qué categorías y marcas del inventario son relevantes.

Categorías disponibles: ${(categories ?? []).join(", ")}
Marcas disponibles: ${(brands ?? []).join(", ")}

Devuelve SOLO las categorías y marcas que existen en las listas anteriores y que sean relevantes para la consulta. Incluye también palabras clave del producto (ej: "tubo", "pegamento") para búsqueda textual.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_inventory",
              description: "Devuelve categorías, marcas y palabras clave relevantes",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Categorías relevantes (deben existir en la lista)",
                  },
                  brands: {
                    type: "array",
                    items: { type: "string" },
                    description: "Marcas relevantes (deben existir en la lista)",
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Palabras clave del producto buscado en español",
                  },
                  explanation: {
                    type: "string",
                    description: "Breve explicación (1 frase) de qué se está buscando",
                  },
                },
                required: ["categories", "brands", "keywords", "explanation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "search_inventory" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, intenta en un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Sin créditos de IA. Agrega fondos en tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      return new Response(JSON.stringify({ error: "Error del gateway IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ categories: [], brands: [], keywords: [query], explanation: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
