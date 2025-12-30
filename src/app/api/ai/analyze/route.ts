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
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${instructions}\n\n${inputText}` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Gemini API error", detail: errorText },
      { status: 502 }
    );
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("") ||
    "";
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
