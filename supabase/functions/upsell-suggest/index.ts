// Sugerencias de venta cruzada (upselling) usando Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items, availableProducts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const cartSummary = (items ?? [])
      .map((i: any) => `- ${i.name} (marca: ${i.brand ?? "s/m"})`)
      .join("\n");

    const catalogSummary = (availableProducts ?? [])
      .slice(0, 80)
      .map((p: any) => `${p.id}|${p.name}|${p.brand ?? ""}|${p.category ?? ""}`)
      .join("\n");

    const systemPrompt = `Eres un asesor experto de ferretería. Dado un carrito actual y el catálogo disponible, sugiere de 1 a 4 productos COMPLEMENTARIOS (no duplicados ni similares) que el cliente probablemente necesite. Devuelve solo IDs reales del catálogo.`;

    const userPrompt = `Carrito actual:\n${cartSummary}\n\nCatálogo (id|nombre|marca|categoría):\n${catalogSummary}\n\nSugiere complementos útiles.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_complements",
              description: "Devuelve productos complementarios del catálogo",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_id: { type: "string" },
                        reason: { type: "string", description: "Por qué lo necesita (máx 80 chars)" },
                      },
                      required: ["product_id", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_complements" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta de nuevo." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos en Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "Error en IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: Array<{ product_id: string; reason: string }> = [];
    if (call?.function?.arguments) {
      try {
        suggestions = JSON.parse(call.function.arguments).suggestions ?? [];
      } catch (e) {
        console.error("parse error", e);
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upsell-suggest error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
