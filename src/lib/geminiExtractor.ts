export interface ExtractedQuestion {
  question_type: string;
  question_statement: string;
  options?: string[];
  correct_marks: number;
  incorrect_marks: number;
  skipped_marks: number;
  partial_marks: number;
  time_minutes: number;
}

class GeminiAPIManager {
  private apiKeys: string[];
  private currentIndex: number = 0;
  private failedKeys: Set<string> = new Set();

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys.filter(key => key.trim().length > 0);
  }

  private getNextKey(): string | null {
    if (this.failedKeys.size >= this.apiKeys.length) {
      return null;
    }

    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      const key = this.apiKeys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;

      if (!this.failedKeys.has(key)) {
        return key;
      }
      attempts++;
    }

    return null;
  }

  private markKeyAsFailed(key: string) {
    this.failedKeys.add(key);
  }

  async extractQuestionsFromImage(
    imageDataUrl: string,
    questionMetadata: {
      question_type: string;
      correct_marks: number;
      incorrect_marks: number;
      skipped_marks: number;
      partial_marks: number;
      time_minutes: number;
    }
  ): Promise<ExtractedQuestion[]> {
    const prompt = `You are an expert question extractor. Extract ALL questions from this exam paper image. For each question:

1. Extract the complete question statement
2. If the question is MCQ or MSQ, extract all options
3. Format mathematical expressions, symbols, and equations in proper KaTeX syntax (use \\text{} for plain text, proper math mode for equations)
4. If there are diagrams, circuits, graphs, FBD, or visual elements that CANNOT be represented purely in KaTeX:
   - Include a placeholder in the question statement like: [DIAGRAM_PLACEHOLDER]
   - Describe the diagram structure in detail so it can be converted to Excalidraw JSON format
   - Provide coordinates, shapes (rectangle, ellipse, polygon, line, arrow, text), and labels
   - Use this format for Excalidraw JSON:
   {
     "type": "excalidraw",
     "version": 2,
     "source": "supabase-mastersup",
     "elements": [
       {
         "id": "unique-id",
         "type": "rectangle|ellipse|polygon|line|arrow|text",
         "x": number,
         "y": number,
         "width": number (for rectangles/ellipses),
         "height": number (for rectangles/ellipses),
         "points": [[x1,y1], [x2,y2]] (for polygons/lines),
         "text": "content" (for text elements),
         "fontSize": number (for text),
         "strokeColor": "#000000",
         "backgroundColor": "transparent",
         "strokeWidth": 2
       }
     ]
   }

5. For simple tables, try to represent them in KaTeX using \\begin{array} format
6. For options, if any option contains a diagram, provide the Excalidraw JSON for that specific option

Return a JSON array of questions in this exact format:
[
  {
    "question_statement": "The full question text with KaTeX formatting or with Excalidraw JSON embedded",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"] or null if not MCQ/MSQ,
    "question_type": "${questionMetadata.question_type}"
  }
]

IMPORTANT:
- Extract EVERY question visible in the image
- Use proper KaTeX syntax: \\text{} for text, \\frac{}{} for fractions, \\sqrt{} for roots, subscripts with _, superscripts with ^
- For Excalidraw diagrams, ensure all coordinates are properly calculated to match the visual layout
- Return ONLY valid JSON, no additional text
- If multiple questions exist, include all of them in the array`;

    const base64Data = imageDataUrl.split(',')[1];

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.apiKeys.length) {
      const apiKey = this.getNextKey();
      if (!apiKey) {
        throw new Error('All API keys have failed');
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: 'image/png',
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error('Invalid response format from Gemini API');
        }

        const textContent = data.candidates[0].content.parts[0].text;
        const jsonMatch = textContent.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }

        const questions = JSON.parse(jsonMatch[0]);

        return questions.map((q: any) => ({
          question_type: questionMetadata.question_type,
          question_statement: q.question_statement,
          options: q.options || null,
          correct_marks: questionMetadata.correct_marks,
          incorrect_marks: questionMetadata.incorrect_marks,
          skipped_marks: questionMetadata.skipped_marks,
          partial_marks: questionMetadata.partial_marks,
          time_minutes: questionMetadata.time_minutes,
        }));
      } catch (error) {
        lastError = error as Error;
        this.markKeyAsFailed(apiKey);
        attempts++;
      }
    }

    throw lastError || new Error('Failed to extract questions from all API keys');
  }
}

export { GeminiAPIManager };
