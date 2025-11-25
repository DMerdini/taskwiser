'use server';
/**
 * @fileOverview Summarizes a task description to quickly understand the key points.
 *
 * - summarizeTaskDescription - A function that handles the task description summarization process.
 * - SummarizeTaskDescriptionInput - The input type for the summarizeTaskDescription function.
 * - SummarizeTaskDescriptionOutput - The return type for the summarizeTaskDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTaskDescriptionInputSchema = z.object({
  description: z.string().describe('The task description to summarize.'),
});
export type SummarizeTaskDescriptionInput = z.infer<typeof SummarizeTaskDescriptionInputSchema>;

const SummarizeTaskDescriptionOutputSchema = z.object({
  summary: z.string().describe('The summarized task description.'),
});
export type SummarizeTaskDescriptionOutput = z.infer<typeof SummarizeTaskDescriptionOutputSchema>;

export async function summarizeTaskDescription(input: SummarizeTaskDescriptionInput): Promise<SummarizeTaskDescriptionOutput> {
  return summarizeTaskDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTaskDescriptionPrompt',
  input: {schema: SummarizeTaskDescriptionInputSchema},
  output: {schema: SummarizeTaskDescriptionOutputSchema},
  prompt: `Summarize the following task description in a concise manner:\n\n{{{description}}}`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const summarizeTaskDescriptionFlow = ai.defineFlow(
  {
    name: 'summarizeTaskDescriptionFlow',
    inputSchema: SummarizeTaskDescriptionInputSchema,
    outputSchema: SummarizeTaskDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
