
'use server';
/**
 * @fileOverview An AI flow to improve project summaries for funding pitches.
 *
 * - improveProjectSummary - A function that takes a project summary and returns an improved version with detailed components.
 * - ImproveSummaryInput - The input type for the improveProjectSummary function.
 * - DetailedPitchOutput - The return type for the improveProjectSummary function, including title, hook, problem, solution, unique value, CTA, and overall summary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImproveSummaryInputSchema = z.object({
  summary: z.string().describe('The original project summary text to be improved.'),
});
export type ImproveSummaryInput = z.infer<typeof ImproveSummaryInputSchema>;

const DetailedPitchOutputSchema = z.object({
  suggestedTitle: z.string().describe('A catchy and concise title for the project pitch.'),
  hook: z.string().describe('An attention-grabbing opening statement or question to engage investors.'),
  problem: z.string().describe('A clear and concise description of the problem the project addresses.'),
  solution: z.string().describe('A compelling explanation of how the project solves the identified problem.'),
  uniqueValue: z.string().describe('The unique selling proposition or key differentiator of the project.'),
  callToAction: z.string().describe('A clear call to action for potential investors, e.g., requesting a meeting or further discussion.'),
  improvedSummary: z.string().describe('The overall improved summary that cohesively integrates the above elements for a pitch. This summary should be impactful and concise.'),
});
export type DetailedPitchOutput = z.infer<typeof DetailedPitchOutputSchema>;


export async function improveProjectSummary(input: ImproveSummaryInput): Promise<DetailedPitchOutput> {
  return improveSummaryFlow(input);
}

const improveSummaryPrompt = ai.definePrompt({
  name: 'improveSummaryPrompt',
  input: { schema: ImproveSummaryInputSchema },
  output: { schema: DetailedPitchOutputSchema },
  prompt: `You are an expert pitch writing assistant. Your task is to take the following project summary and transform it into a compelling pitch outline.
Focus on clarity, conciseness, impact, and effectiveness for attracting investors.
Please provide the following distinct components based on the original summary:
1.  suggestedTitle: A catchy and concise title for the pitch.
2.  hook: An attention-grabbing opening statement or question.
3.  problem: A clear description of the problem the project solves.
4.  solution: A concise explanation of how the project solves the problem.
5.  uniqueValue: What makes this project unique or better than alternatives.
6.  callToAction: A clear call to action for potential investors.
7.  improvedSummary: An overall improved summary that incorporates these elements into a cohesive, impactful narrative. This should be a paragraph or two, suitable for an executive summary.

Keep the tone professional and engaging. Avoid jargon where possible or explain it briefly if necessary.
Do not add any conversational fluff or introductions like "Here's the improved pitch outline:". Just provide the structured JSON output directly as defined by the output schema.

Original Summary:
{{{summary}}}
`,
});

const improveSummaryFlow = ai.defineFlow(
  {
    name: 'improveSummaryFlow',
    inputSchema: ImproveSummaryInputSchema,
    outputSchema: DetailedPitchOutputSchema,
  },
  async (input) => {
    const { output } = await improveSummaryPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate an improved summary and pitch components.');
    }
    return output;
  }
);

