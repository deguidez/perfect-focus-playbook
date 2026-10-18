import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  albumId: z.string().uuid(),
  fileName: z.string().min(1).max(300),
  image: z.string().startsWith("data:image/jpeg;base64,").max(6_000_000),
});

const INSTRUCTIONS = `You are an expert sports photo editor culling event photos (races, matches).
Identify the MAIN athlete: the most prominent person who is the obvious subject (largest, most central, closest).
Evaluate only that athlete:
- main_subject_found: false if there is no clear main athlete.
- face_sharpness: 0-100 focus quality ON THE MAIN ATHLETE'S FACE (100 = tack sharp eyes/skin texture, 60 = acceptable, below 40 = clearly out of focus or motion blur). If face not visible, judge the body.
- eyes_closed: true only if the main athlete's eyes are clearly closed or mid-blink.
- head_cut: true if the frame crops off part of the main athlete's head (top of head, face cut by border).
- notes: very short reason in Portuguese (max 8 words).`;

export const analyzePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("AI_CONFIG: IA não configurada");

    const { data: album } = await supabase.from("albums").select("id").eq("id", data.albumId).maybeSingle();
    if (!album) throw new Error("Álbum não encontrado");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");

    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const schema = z.object({
      main_subject_found: z.boolean(),
      face_sharpness: z.number().int().min(0).max(100),
      eyes_closed: z.boolean(),
      head_cut: z.boolean(),
      notes: z.string(),
    });

    let out: z.infer<typeof schema>;
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions: INSTRUCTIONS,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this photo." },
              { type: "image", image: new URL(data.image) },
            ],
          },
        ],
        output: Output.object({ schema }),
        maxRetries: 0,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      out = (await result.output) as z.infer<typeof schema>;
    } catch (err) {
      const e = err as { statusCode?: number; message?: string; cause?: { statusCode?: number } };
      const status = e.statusCode ?? e.cause?.statusCode;
      throw new Error(`AI_${status ?? "ERR"}: ${e.message ?? "Falha na análise"}`);
    }

    const row = {
      album_id: data.albumId,
      owner_id: userId,
      file_name: data.fileName,
      main_subject_found: out.main_subject_found,
      face_sharpness: Math.round(out.face_sharpness),
      eyes_closed: out.eyes_closed,
      head_cut: out.head_cut,
      notes: out.notes.slice(0, 200),
    };
    const { error } = await supabase.from("photo_results").upsert(row, { onConflict: "album_id,file_name" });
    if (error) throw new Error(error.message);
    return row;
  });
