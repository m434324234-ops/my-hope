export interface ExtractedQuestion {
  question_type: string;
  question_statement: string;
  options?: (string | object)[];
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
    const prompt = `You are an expert question extractor for exam papers. Extract ALL questions from this image with EXTREME attention to detail.

CRITICAL FORMATTING RULES:

1. TEXT FORMATTING:
   - Use KaTeX for ALL mathematical expressions
   - Wrap plain text in \\text{}
   - Use $ for inline math mode
   - Examples: \\text{A } 4 \\times 4 \\text{ digital image}, U \\leq 4

2. TABLES:
   - ALWAYS use KaTeX array format for tables
   - Example:
   \\begin{array}{|c|c|c|c|}
   \\hline
   0 & 1 & 0 & 2 \\\\
   \\hline
   4 & 7 & 3 & 3 \\\\
   \\hline
   \\end{array}

3. DIAGRAMS (circuits, graphs, geometric figures, FBDs):
   - If the question contains a diagram that CANNOT be represented in KaTeX, embed Excalidraw JSON
   - Place the Excalidraw JSON directly in the question_statement after describing what it shows
   - Format:
   {
     "type": "excalidraw",
     "version": 2,
     "source": "supabase-mastersup",
     "elements": [
       {
         "id": "unique-id-1",
         "type": "rectangle",
         "x": 100,
         "y": 150,
         "width": 200,
         "height": 120,
         "strokeColor": "#000000",
         "backgroundColor": "transparent",
         "strokeWidth": 2
       },
       {
         "id": "unique-id-2",
         "type": "polygon",
         "x": 180,
         "y": 50,
         "points": [[0,0], [150,220], [-150,220]],
         "strokeColor": "#000000",
         "backgroundColor": "transparent",
         "strokeWidth": 2
       },
       {
         "id": "unique-id-3",
         "type": "ellipse",
         "x": 130,
         "y": 190,
         "width": 220,
         "height": 120,
         "strokeColor": "#000000",
         "backgroundColor": "transparent",
         "strokeWidth": 2
       },
       {
         "id": "text-1",
         "type": "text",
         "x": 200,
         "y": 200,
         "text": "Label",
         "fontSize": 24,
         "strokeColor": "#000000"
       }
     ]
   }

4. OPTIONS:
   - Extract all options (A, B, C, D, etc.)
   - If an option is simple text/math, use string
   - If an option contains a diagram, use Excalidraw JSON object
   - Options array can mix strings and objects

EXAMPLES:

Example 1 (Table in question):
{
  "question_statement": "\\text{A } 4 \\times 4 \\text{ digital image has pixel intensities } (U) \\text{ as shown in the figure. The number of pixels with } U \\leq 4 \\text{ is:}\\n\\n\\begin{array}{|c|c|c|c|}\\n\\hline\\n0 & 1 & 0 & 2 \\\\\\\\\\n\\hline\\n4 & 7 & 3 & 3 \\\\\\\\\\n\\hline\\n5 & 5 & 4 & 4 \\\\\\\\\\n\\hline\\n6 & 7 & 3 & 2 \\\\\\\\\\n\\hline\\n\\end{array}",
  "options": ["3", "8", "11", "9"]
}

Example 2 (Diagram in question):
{
  "question_statement": "\\text{In the given figure, the numbers associated with the rectangle, triangle, and ellipse are } 1, 2, \\text{ and } 3, \\text{ respectively. Which one among the given options is the most appropriate combination of } P, Q, \\text{ and } R?\\n\\n{\\"type\\":\\"excalidraw\\",\\"version\\":2,\\"source\\":\\"supabase-mastersup\\",\\"elements\\":[{\\"id\\":\\"rect-1\\",\\"type\\":\\"rectangle\\",\\"x\\":100,\\"y\\":150,\\"width\\":200,\\"height\\":120,\\"strokeColor\\":\\"#000000\\",\\"backgroundColor\\":\\"transparent\\",\\"strokeWidth\\":2},{\\"id\\":\\"tri-1\\",\\"type\\":\\"polygon\\",\\"x\\":180,\\"y\\":50,\\"points\\":[[0,0],[150,220],[-150,220]],\\"strokeColor\\":\\"#000000\\",\\"backgroundColor\\":\\"transparent\\",\\"strokeWidth\\":2},{\\"id\\":\\"ellipse-1\\",\\"type\\":\\"ellipse\\",\\"x\\":130,\\"y\\":190,\\"width\\":220,\\"height\\":120,\\"strokeColor\\":\\"#000000\\",\\"backgroundColor\\":\\"transparent\\",\\"strokeWidth\\":2},{\\"id\\":\\"text-1\\",\\"type\\":\\"text\\",\\"x\\":70,\\"y\\":200,\\"text\\":\\"1\\",\\"fontSize\\":24,\\"strokeColor\\":\\"#000000\\"},{\\"id\\":\\"text-2\\",\\"type\\":\\"text\\",\\"x\\":210,\\"y\\":60,\\"text\\":\\"2\\",\\"fontSize\\":24,\\"strokeColor\\":\\"#000000\\"},{\\"id\\":\\"text-3\\",\\"type\\":\\"text\\",\\"x\\":260,\\"y\\":300,\\"text\\":\\"3\\",\\"fontSize\\":24,\\"strokeColor\\":\\"#000000\\"},{\\"id\\":\\"text-P\\",\\"type\\":\\"text\\",\\"x\\":190,\\"y\\":240,\\"text\\":\\"P\\",\\"fontSize\\":24,\\"strokeColor\\":\\"#000000\\"},{\\"id\\":\\"text-Q\\",\\"type\\":\\"text\\",\\"x\\":260,\\"y\\":250,\\"text\\":\\"Q\\",\\"fontSize\\":24,\\"strokeColor\\":\\"#000000\\"},{\\"id\\":\\"text-R\\",\\"type\\":\\"text\\",\\"x\\":210,\\"y\\":170,\\"text\\":\\"R\\",\\"fontSize\\":24,\\"strokeColor\\":\\"#000000\\"}]}",
  "options": ["P = 6; Q = 5; R = 3", "P = 5; Q = 6; R = 3", "P = 3; Q = 6; R = 6", "P = 5; Q = 3; R = 6"]
}

RETURN FORMAT:
Return ONLY a valid JSON array with this structure:
[
  {
    "question_statement": "formatted text with KaTeX and/or Excalidraw JSON",
    "options": ["option1", "option2", "option3", "option4"] or null for non-MCQ/MSQ
  }
]

Extract EVERY question from the image. Be precise with formatting. Return ONLY the JSON array.`;

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
                temperature: 0.1,
                topK: 32,
                topP: 0.9,
                maxOutputTokens: 16384,
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
