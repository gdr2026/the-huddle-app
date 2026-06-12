export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { company, role, interviewers, jobDescriptionUrl } = await req.json();

  if (!company || !role || !interviewers) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = `You are an expert interview preparation coach. A candidate is preparing for a job interview. Generate a structured interview brief based on the following details:

Company: ${company}
Role: ${role}
Interviewer(s): ${interviewers}
${jobDescriptionUrl ? `Job Description URL: ${jobDescriptionUrl}` : ''}

Return ONLY a valid JSON object with exactly this structure (no markdown, no explanation, just JSON):

{
  "companySnapshot": "2-3 sentence paragraph describing the company — what they do, their scale, culture, and what makes them distinctive as an employer. Be specific and accurate.",
  "ownership": "Public" or "Private",
  "valuation": "e.g. 'NYSE: AAPL' for public, '~$4.5B (last round)' for private, or 'Undisclosed' if unknown",
  "painPoints": [
    "Pain point or strategic pressure the company is currently facing (be specific, not generic)",
    "...",
    "...",
    "...",
    "..."
  ],
  "interviewerProfile": [
    "Insight about the first interviewer based on their name, likely role, and the company context",
    "What their seniority/background likely means for how they'll run the interview",
    "The kinds of questions or themes they are likely to focus on",
    "What they probably value most in candidates for this role",
    "One practical tip for connecting with them"
  ],
  "topOfMind": [
    "What is likely most pressing for this interviewer right now given the company context and role",
    "A business or team challenge they may want this hire to help solve",
    "How they'll be evaluating cultural or strategic fit"
  ],
  "cvHighlights": [
    "Type of experience that will stand out most for this role at this company",
    "A metric or achievement framing that will resonate",
    "A skill or background element to make sure comes across",
    "Something to avoid or downplay given the company culture"
  ],
  "questions": [
    "Smart, specific question the candidate should ask — tailored to this company/role",
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
    "..."
  ],
  "coachingNudge": "One sharp, honest coaching observation — something specific this candidate should be especially mindful of walking into this interview, given the company and role. Be direct, not generic."
}

Make every field specific to ${company} and the ${role} role. Avoid generic interview advice. The interviewer(s) named are: ${interviewers}.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: 'AI API error', detail: err }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const text = data.content[0].text.trim();

  // Strip any accidental markdown fences
  const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: clean }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
