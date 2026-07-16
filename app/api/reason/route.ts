import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidateId, metrics } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // Fail-safe mock fallback if no API key is specified (critical for frictionless MVP demo!)
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "GEMINI_API_KEY is not configured. Falling back to pre-rendered reasoning.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the fast, efficient gemini-1.5-flash for real-time dashboard updates
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an elite enterprise Cloud security IAM expert and "IAM Surgeon" reasoning engine.
      Your task is to explain the operational blast radius and justification of a simulated IAM remediation candidate.
      
      CONTEXT:
      - We want to revoke 'Alice' (a developer) from having 'Compute Admin' privilege on 'production-folder'.
      - Current lineage is: Alice (User) ➡️ developers (Group) ➡️ platform (Group) ➡️ prod-admins (Group) ➡️ roles/compute.admin ➡️ production-folder.
      
      SIMULATED CANDIDATE:
      Candidate ID: ${candidateId}
      
      METRICS:
      - Impacted/Disrupted Users: ${metrics.affectedUsers}
      - Legitimate Dev Projects Disrupted: ${metrics.lostLegitimatePermissions} (Out of 12 projects total)
      - Remaining Risky Admin Paths for Alice: ${metrics.remainingRiskyPaths}
      - Blast Radius Cost Score: ${metrics.cost}
      - Operational Actions/Complexity: ${metrics.operationalComplexity}
      
      INSTRUCTIONS:
      Provide a highly precise, professional, 2-3 sentence justification explaining why Candidate ${candidateId} is either highly recommended or problematic.
      - If Candidate C is selected (Disconnect platform -> prod-admins & Restore Compute Viewer), emphasize that it breaks the security risk (disconnecting platform -> prod-admins) while maintaining Alice's 12 normal projects access (since developers group is untouched) and granting direct read-only viewer rights, resulting in the smallest blast radius.
      - If Candidate A is selected (Remove Alice from developers), explain that this is a blunt, bad option because she loses all her 12 normal development projects and she still retains the risk because of other redundant paths.
      - If Candidate B is selected (Disconnect platform -> prod-admins), explain that although the risk path is severed, it is too disruptive because 23 platform engineers recursively lose production admin access.
      
      Keep the writing technical, clear, and extremely objective. Do not use generic filler words.
    `;

    const result = await model.generateContent(prompt);
    const reasoning = result.response.text().trim();

    return NextResponse.json({
      success: true,
      reasoning: reasoning,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "An error occurred while contacting Gemini API",
      error: error.message,
    });
  }
}
