export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { company, role, interviewers, jobDescriptionUrl } = req.body;

  if (!company || !role || !interviewers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `You are an expert interview preparation coach. A candidate is preparing for a job interview. Generate a structured interview brief based on the following details:

Company: ${company}
Role: ${role}
Interviewer(s): ${interviewers}
${jobDescriptionUrl ? `Job Description URL: ${jobDescriptionUrl}` : ''}

Return ONLY a valid JSON object with exactly this structure (no markdown, no explanation, just JSON):

{
  "companySnapshot": "2-3 sentence paragraph describing the company — what they do, their scale, culture, and what makes them distinctive as an employer. Be specific and accurate.",
  "ownership": "Public or Private",
  "valuation": "e.g. NYSE: AAPL for public, ~$4.5B (last round) for private, or Undisclosed if unknown",
  "painPoints": [
    "Pain point or strategic pressure the company is currently facing (be specific)",
    "Second pain point",
    "Third pain point",
    "Fourth pain point",
    "Fifth pain point"
  ],
  "interviewerProfile": [
    "Insight about the interviewer based on their name, likely role, and company context",
    "What their seniority/background likely means for how they will run the interview",
    "The kinds of questions or themes they are likely to focus on",
    "What they probably value most in candidates for this role",
    "One practical tip for connecting with them"
  ],
  "topOfMind": [
    "What is likely most pressing for this interviewer right now",
    "A business or team challenge they may want this hire to help solve",
    "How they will be evaluating cultural or strategic fit"
  ],
  "cvHighlights": [
    "Type of experience that will stand out most for this role at this company",
    "A metric or achievement framing that will resonate",
    "A skill or background element to make sure comes across",
    "Something to avoid or downplay given the company culture"
  ],
  "questions": [
    "Smart specific question 1 tailored to this company and role",
    "Smart specific question 2",
    "Smart specific question 3",
    "Smart specific question 4",
    "Smart specific question 5",
    "Smart specific question 6",
    "Smart specific question 7",
    "Smart specific question 8",
    "Smart specific question 9",
    "Smart specific question 10"
  ],
  "coachingNudge": "One sharp honest coaching observation specific to this candidate walking into this interview. Be direct not generic."
}

Make every field specific to ${company} and the ${role} role. Avoid generic advice. The interviewer(s) are: ${interviewers}.`;

  try {
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
      return res.status(502).json({ error: 'Claude API error', detail: err });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to generate brief', detail: err.message });
  }
}
