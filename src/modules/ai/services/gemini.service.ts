import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  public static readonly DEFAULT_MODEL = 'gemini-2.0-flash';
  public static readonly DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';

  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenerativeAI | null = null;
  private readonly openrouterApiKey: string | null = null;
  private mockMode = false;

  constructor(private readonly configService: ConfigService) {
    this.openrouterApiKey =
      this.configService.get<string>('env.openrouterApiKey') ||
      process.env.OPENROUTER_API_KEY ||
      null;

    const geminiApiKey =
      this.configService.get<string>('env.geminiApiKey') ||
      process.env.GEMINI_API_KEY ||
      null;

    if (this.openrouterApiKey) {
      const masked = `${this.openrouterApiKey.slice(0, 8)}...${this.openrouterApiKey.slice(-4)}`;
      this.logger.log(
        `AI Service initialized with OpenRouter API Key (${masked})`,
      );
    } else if (geminiApiKey) {
      const masked = `${geminiApiKey.slice(0, 7)}...${geminiApiKey.slice(-4)}`;
      this.logger.log(
        `AI Service initialized with Google Gemini API Key (${masked})`,
      );
      this.ai = new GoogleGenerativeAI(geminiApiKey);
    } else {
      this.logger.warn(
        'Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is defined. AI Service will operate in MOCK MODE.',
      );
      this.mockMode = true;
    }
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  getModelName(): string {
    if (this.openrouterApiKey) {
      return (
        process.env.OPENROUTER_MODEL || GeminiService.DEFAULT_OPENROUTER_MODEL
      );
    }
    return GeminiService.DEFAULT_MODEL;
  }

  /**
   * Streams generation content using OpenRouter API (if configured), direct Gemini API,
   * or falls back to simulated stream in mock mode if API fails.
   */
  /**
   * Streams generation content using OpenRouter API (if configured), direct Gemini API,
   * or falls back to simulated stream in mock mode if API fails.
   */
  async generateContentStream(
    systemInstruction: string,
    prompt: string,
    responseSchema: any,
    onChunk: (text: string) => void,
  ): Promise<Record<string, any>> {
    if (this.mockMode) {
      return this.runMockStream(prompt, onChunk);
    }

    // 1. Prefer OpenRouter API if OPENROUTER_API_KEY is configured
    if (this.openrouterApiKey) {
      try {
        return await this.generateOpenRouterStream(
          systemInstruction,
          prompt,
          responseSchema,
          onChunk,
        );
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `OpenRouter API call failed (${errorMessage.slice(0, 300)}). Falling back to mock generator.`,
        );
        return this.runMockStream(prompt, onChunk);
      }
    }

    // 2. Direct Google Gemini API fallback
    const maxRetries = 2;
    let baseDelayMs = 2000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = this.ai!.getGenerativeModel({
          model: GeminiService.DEFAULT_MODEL,
          systemInstruction,
        });

        const responseStream = await model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
          },
        });

        let completeText = '';
        for await (const chunk of responseStream.stream) {
          const text = chunk.text();
          if (text) {
            completeText += text;
            onChunk(text);
          }
        }

        return this.cleanAndParseJson(completeText);
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isDailyQuotaExceeded =
          errorMessage.includes('limit: 0') ||
          errorMessage.includes('PerDayPerProject');
        const isRateLimit =
          (errorMessage.includes('429') ||
            errorMessage.includes('Quota exceeded')) &&
          !isDailyQuotaExceeded;

        if (isRateLimit && attempt < maxRetries) {
          this.logger.warn(
            `Gemini API rate limited (429). Retrying attempt ${attempt + 1}/${maxRetries} in ${baseDelayMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, baseDelayMs));
          baseDelayMs *= 1.5;
          continue;
        }

        this.logger.warn(
          `Gemini API call failed (${errorMessage.slice(0, 500)}). Falling back to mock response generator.`,
        );
        return this.runMockStream(prompt, onChunk);
      }
    }

    return this.runMockStream(prompt, onChunk);
  }

  /**
   * Stream completions using OpenRouter OpenAI-compatible API
   */
  private async generateOpenRouterStream(
    systemInstruction: string,
    prompt: string,
    responseSchema: any,
    onChunk: (text: string) => void,
  ): Promise<Record<string, any>> {
    const model =
      process.env.OPENROUTER_MODEL || GeminiService.DEFAULT_OPENROUTER_MODEL;
    this.logger.log(`Streaming from OpenRouter API (Model: ${model})...`);

    let fullSystemInstruction = systemInstruction;
    if (responseSchema) {
      fullSystemInstruction += `\n\nCRITICAL OUTPUT RULES:\n1. You MUST output ONLY valid JSON matching this schema:\n${JSON.stringify(responseSchema)}\n2. Keep task and feature descriptions concise.\n3. Do NOT wrap output in markdown formatting or extra text.`;
    }

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Nexus Flow App',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: fullSystemInstruction },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 8192,
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter HTTP ${response.status}: ${errorText.slice(0, 300)}`,
      );
    }

    let completeText = '';
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              completeText += content;
              onChunk(content);
            }
          } catch {
            // Ignore incomplete SSE chunk JSON parse errors
          }
        }
      }
    }

    return this.cleanAndParseJson(completeText);
  }

  /**
   * Cleans potential Markdown code-block wrappers (```json ... ```) before parsing JSON.
   * Attempts auto-repair if LLM output was truncated mid-stream.
   */
  private cleanAndParseJson(rawText: string): Record<string, any> {
    let cleaned = rawText.trim();
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (firstError) {
      this.logger.warn(
        `JSON parse error on raw LLM output. Attempting auto-repair for truncated stream...`,
      );
      const repaired = this.tryRepairTruncatedJson(cleaned);
      if (repaired) {
        this.logger.log('Successfully auto-repaired truncated JSON response.');
        return repaired;
      }
      throw firstError;
    }
  }

  private tryRepairTruncatedJson(jsonStr: string): Record<string, any> | null {
    let str = jsonStr.trim();
    if (!str.startsWith('{') && !str.startsWith('[')) return null;

    // Check for unbalanced quotes (unterminated string)
    let inString = false;
    let escape = false;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }
    }

    if (inString) {
      str += '"';
    }

    // Remove dangling trailing comma or key prefix at the end
    str = str.replace(/,\s*$/, '').replace(/,\s*"[^"]*"?\s*:?\s*$/, '');

    // Track open brackets/braces to close them
    const stack: string[] = [];
    inString = false;
    escape = false;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char === '{' ? '}' : ']');
        } else if (char === '}' || char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === char) {
            stack.pop();
          }
        }
      }
    }

    while (stack.length > 0) {
      str += stack.pop();
    }

    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  private async runMockStream(
    prompt: string,
    onChunk: (text: string) => void,
  ): Promise<Record<string, any>> {
    this.logger.log('Executing mock stream generation for prompt...');

    // Simulate latency with chunk intervals
    const isChat = prompt.includes('suggest');
    const mockJson = isChat
      ? this.getMockBoardChatSuggestions()
      : this.getMockOnboardingPlan(prompt);

    const jsonString = JSON.stringify(mockJson, null, 2);
    const chunkSize = Math.max(10, Math.floor(jsonString.length / 10));

    for (let i = 0; i < jsonString.length; i += chunkSize) {
      const part = jsonString.slice(i, i + chunkSize);
      onChunk(part);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return mockJson;
  }

  getOnboardingSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        projectSummary: { type: SchemaType.STRING },
        assumptions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        features: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              feature_name: { type: SchemaType.STRING },
              feature_description: { type: SchemaType.STRING },
              priority: {
                type: SchemaType.STRING,
                enum: ['HIGH', 'MEDIUM', 'LOW'],
              },
              color: { type: SchemaType.STRING },
              tasks: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    task_name: { type: SchemaType.STRING },
                    task_description: { type: SchemaType.STRING },
                    priority: {
                      type: SchemaType.STRING,
                      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                    },
                    type: {
                      type: SchemaType.STRING,
                      enum: [
                        'FEATURE',
                        'BUG',
                        'IMPROVEMENT',
                        'DOCUMENTATION',
                        'RESEARCH',
                        'CHORE',
                      ],
                    },
                    acceptanceCriteria: {
                      type: SchemaType.ARRAY,
                      items: { type: SchemaType.STRING },
                    },
                    estimatedComplexity: {
                      type: SchemaType.STRING,
                      enum: ['S', 'M', 'L', 'XL'],
                    },
                    dependencies: {
                      type: SchemaType.ARRAY,
                      description:
                        'Exact task_name values of other tasks that must be completed before this task can start. Reference tasks by their exact task_name string. Use an empty array if there are no dependencies.',
                      items: { type: SchemaType.STRING },
                    },
                  },
                  required: [
                    'task_name',
                    'task_description',
                    'priority',
                    'type',
                    'dependencies',
                  ],
                },
              },
            },
            required: ['feature_name', 'feature_description', 'priority', 'color', 'tasks'],
          },
        },
      },
      required: ['projectSummary', 'assumptions', 'features'],
    };
  }

  getBoardChatSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        suggestions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              action: {
                type: SchemaType.STRING,
                enum: [
                  'CREATE_COLUMN',
                  'CREATE_TASK',
                  'UPDATE_TASK',
                  'DELETE_TASK',
                ],
              },
              columnName: { type: SchemaType.STRING },
              color: { type: SchemaType.STRING },
              taskTitle: { type: SchemaType.STRING },
              taskDescription: { type: SchemaType.STRING },
              taskPriority: {
                type: SchemaType.STRING,
                enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
              },
              taskType: {
                type: SchemaType.STRING,
                enum: [
                  'FEATURE',
                  'BUG',
                  'IMPROVEMENT',
                  'DOCUMENTATION',
                  'RESEARCH',
                  'CHORE',
                ],
              },
              explanation: { type: SchemaType.STRING },
            },
            required: ['action', 'explanation'],
          },
        },
      },
      required: ['suggestions'],
    };
  }

  getAssigneeRecommendationSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        recommendedUserId: { type: SchemaType.STRING },
        recommendedUserName: { type: SchemaType.STRING },
        confidenceScore: { type: SchemaType.NUMBER },
        explanation: { type: SchemaType.STRING },
      },
      required: [
        'recommendedUserId',
        'recommendedUserName',
        'confidenceScore',
        'explanation',
      ],
    };
  }

  getTaskBreakdownSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        subtasks: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              sortOrder: { type: SchemaType.NUMBER },
            },
            required: ['title', 'sortOrder'],
          },
        },
      },
      required: ['subtasks'],
    };
  }

  getGeneratedDescriptionSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        description: { type: SchemaType.STRING },
        acceptanceCriteria: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ['description', 'acceptanceCriteria'],
    };
  }

  getProjectOverviewSchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        statusSummary: {
          type: SchemaType.STRING,
          description:
            'High-level summary of the overall project health and current stage progress.',
        },
        whoIsDoingWhat: {
          type: SchemaType.STRING,
          description:
            'A concise breakdown of current team member assignments and active workloads.',
        },
        remainingTasksSummary: {
          type: SchemaType.STRING,
          description:
            'Overview of tasks left to complete, key backlog items, and pending milestones.',
        },
        bottlenecks: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            'Key blockers, stalled stages, or overdue tasks impacting momentum.',
        },
        workloadWarnings: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            'Warnings about team overload, unassigned high-priority tasks, or missing assignees.',
        },
      },
      required: [
        'statusSummary',
        'whoIsDoingWhat',
        'remainingTasksSummary',
        'bottlenecks',
        'workloadWarnings',
      ],
    };
  }

  getDashboardSummarySchema() {
    return {
      type: SchemaType.OBJECT,
      properties: {
        headline: { type: SchemaType.STRING },
        quickInsight: { type: SchemaType.STRING },
        focusRecommendation: { type: SchemaType.STRING },
      },
      required: ['headline', 'quickInsight', 'focusRecommendation'],
    };
  }

  private getMockOnboardingPlan(prompt: string): Record<string, any> {
    return {
      projectSummary: `Plan based on request: "${prompt}". This includes a setup layout.`,
      assumptions: [
        'User is building a digital platform',
        'Authentication and API access are required upfront',
      ],
      features: [
        {
          title: 'Authentication & Security',
          rationale: 'Necessary to authenticate users securely.',
          priority: 'HIGH',
          color: '#3b82f6',
          dependencies: [],
          tasks: [
            {
              title: 'Implement JWT Auth flow',
              description:
                'Create login, registration, and refresh token validation endpoints.',
              priority: 'HIGH',
              type: 'FEATURE',
              acceptanceCriteria: [
                'JWT generated on successful login',
                'RefreshToken validated and refreshed successfully',
              ],
              estimatedComplexity: 'M',
              dependencies: [],
            },
            {
              title: 'Database user schema',
              description: 'Define User entity with hashed passwords.',
              priority: 'HIGH',
              type: 'FEATURE',
              acceptanceCriteria: ['Passwords securely hashed using bcrypt'],
              estimatedComplexity: 'S',
              dependencies: [],
            },
          ],
        },
        {
          title: 'Core Dashboard',
          rationale: 'Provides users with a central view of their workspace.',
          priority: 'MEDIUM',
          color: '#10b981',
          dependencies: ['Authentication & Security'],
          tasks: [
            {
              title: 'Build Dashboard Layout component',
              description:
                'Implement a sidebar and main workspace component viewport.',
              priority: 'MEDIUM',
              type: 'FEATURE',
              acceptanceCriteria: ['Responsive design matching client specs'],
              estimatedComplexity: 'L',
              dependencies: [],
            },
          ],
        },
      ],
    };
  }

  private getMockBoardChatSuggestions(): Record<string, any> {
    return {
      suggestions: [
        {
          action: 'CREATE_COLUMN',
          columnName: 'In Testing',
          color: '#8b5cf6',
          explanation:
            'To track tasks undergoing QA verification before release.',
        },
        {
          action: 'CREATE_TASK',
          columnName: 'TODO',
          taskTitle: 'Configure API rate limiters',
          taskDescription:
            'Set up Global NestJS throttlers for DDOS protection.',
          taskPriority: 'HIGH',
          taskType: 'IMPROVEMENT',
          explanation: 'Adding protection middleware prevents API abuse.',
        },
      ],
    };
  }
}
