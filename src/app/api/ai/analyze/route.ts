import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalysisResult = {
  overallScore: number | null;
  sentimentLabel: "positive" | "neutral" | "negative" | "needs_review";
  confidence: number | null;
  keywords: string[];
  model: string;
};

const extractJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-nano";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const freeText = String(payload.freeText ?? "").trim();
  const overallText = String(payload.overallText ?? "").trim();
  const wantsSentiment = Boolean(payload.wantsSentiment);
  const wantsOverall = Boolean(payload.wantsOverall);
  const minConfidence = typeof payload.minConfidence === "number" ? payload.minConfidence : 0.6;

  if (!freeText && !overallText) {
    return NextResponse.json<AnalysisResult>({
      overallScore: null,
      sentimentLabel: "needs_review",
      confidence: 0,
      keywords: [],
      model,
    });
  }

  const instructions = [
    "You are an AI that classifies B2B survey responses.",
    "Return JSON only with keys: overallScore, sentimentLabel, confidence, keywords.",
    "overallScore: integer 1-10 or null if not requested.",
    "sentimentLabel: positive, neutral, negative, or needs_review.",
    "confidence: number 0-1.",
    "keywords: array of up to 6 short phrases.",
  ].join("\n");

  const inputText = [
    "FREE_TEXT:",
    freeText || "(none)",
    "",
    "OVERALL_TEXT:",
    overallText || "(none)",
    "",
    `REQUEST: sentiment=${wantsSentiment}, overallScore=${wantsOverall}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${instructions}\n\n${inputText}`,
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "survey_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              overallScore: { type: ["integer", "null"] },
              sentimentLabel: {
                type: "string",
                enum: ["positive", "neutral", "negative", "needs_review"],
              },
              confidence: { type: "number" },
              keywords: {
                type: "array",
                items: { type: "string" },
                maxItems: 6,
              },
            },
            required: ["overallScore", "sentimentLabel", "confidence", "keywords"],
          },
        },
      },
      temperature: 0.1,
      max_output_tokens: 256,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "OpenAI API error", detail: errorText },
      { status: 502 }
    );
  }

  const data = await response.json();
  const rawText = (() => {
    const output = Array.isArray(data?.output) ? data.output : [];
    const texts: string[] = [];
    output.forEach((item: any) => {
      const content = Array.isArray(item?.content) ? item.content : [];
      content.forEach((part: any) => {
        if (part?.type === "output_text" && typeof part.text === "string") {
          texts.push(part.text);
        }
      });
    });
    return texts.join("");
  })();
  const parsed = extractJson(rawText);

  if (!parsed) {
    return NextResponse.json<AnalysisResult>({
      overallScore: null,
      sentimentLabel: "needs_review",
      confidence: 0,
      keywords: [],
      model,
    });
  }

  const scoreValue = Number(parsed.overallScore ?? parsed.score);
  const overallScore =
    wantsOverall && Number.isFinite(scoreValue)
      ? clamp(Math.round(scoreValue), 1, 10)
      : null;
  const sentiment =
    typeof parsed.sentimentLabel === "string"
      ? parsed.sentimentLabel
      : typeof parsed.sentiment === "string"
      ? parsed.sentiment
      : "needs_review";
  const sentimentLabel =
    sentiment === "positive" || sentiment === "neutral" || sentiment === "negative"
      ? sentiment
      : "needs_review";
  const confidenceValue = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? clamp(confidenceValue, 0, 1)
    : 0;
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((item: unknown) => typeof item === "string").slice(0, 6)
    : [];

  const finalResult: AnalysisResult = {
    overallScore: wantsOverall ? overallScore : null,
    sentimentLabel: wantsSentiment ? sentimentLabel : "needs_review",
    confidence,
    keywords,
    model,
  };

  if (finalResult.confidence !== null && finalResult.confidence < minConfidence) {
    finalResult.sentimentLabel = "needs_review";
    finalResult.overallScore = wantsOverall ? overallScore : null;
  }

  return NextResponse.json(finalResult);
}
