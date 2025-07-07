// Shared OpenRouter HTTP client and utilities

import type {
  InferenceRequest,
  InferenceResponse,
  InferenceError,
  ChatMessage,
  ToolCall,
  Model,
  TokenUsage,
} from '@/types/inference';
import type {
  OpenRouterBaseConfig,
  OpenRouterChatRequest,
  OpenRouterChatResponse,
  OpenRouterModelsResponse,
  OpenRouterModel,
  OpenRouterMessage,
  OpenRouterToolCall,
  OpenRouterErrorResponse,
} from './types';

export class OpenRouterClient {
  private baseUrl: string;
  private httpReferrer?: string;
  private appName?: string;

  constructor(config: OpenRouterBaseConfig) {
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.httpReferrer = config.httpReferrer;
    this.appName = config.appName;
  }

  async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    authToken: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.httpReferrer) {
      headers['HTTP-Referer'] = this.httpReferrer;
    }

    if (this.appName) {
      headers['X-Title'] = this.appName;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenRouterErrorResponse;
        throw this.createInferenceError(response.status, errorData);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'TypeError') {
        // Network error
        throw {
          type: 'network',
          message: 'Network request failed',
          details: error,
          retryable: true,
        } as InferenceError;
      }
      throw error;
    }
  }

  async fetchModels(authToken: string): Promise<Model[]> {
    const response = await this.makeRequest<OpenRouterModelsResponse>(
      '/models',
      { method: 'GET' },
      authToken
    );

    // Only return models that support tools
    return response.data
      .filter(model => model.supported_parameters?.includes('tools'))
      .map(this.parseModel);
  }

  async generateResponse(
    request: InferenceRequest,
    model: string,
    authToken: string
  ): Promise<InferenceResponse> {
    // Validate request before sending
    this.validateRequest(request);

    const openRouterRequest: OpenRouterChatRequest = {
      model,
      messages: request.messages.map(this.formatMessage),
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stop: request.stopSequences,
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      openRouterRequest.tools = request.tools;
      openRouterRequest.tool_choice = 'auto';
    }

    // Clean up undefined values that might cause 400 errors
    this.cleanRequest(openRouterRequest);

    // Log the request for debugging (remove in production)
    console.log('OpenRouter Request:', JSON.stringify(openRouterRequest, null, 2));

    try {
      const response = await this.makeRequest<OpenRouterChatResponse>(
        '/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify(openRouterRequest),
        },
        authToken
      );

      return this.parseResponse(response);
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      console.error('Request that failed:', JSON.stringify(openRouterRequest, null, 2));
      throw error;
    }
  }

  private parseModel(openRouterModel: OpenRouterModel): Model {
    const inputCost = parseFloat(openRouterModel.pricing.prompt);
    const outputCost = parseFloat(openRouterModel.pricing.completion);

    return {
      id: openRouterModel.id,
      name: openRouterModel.name,
      description: openRouterModel.description,
      contextLength: openRouterModel.context_length,
      inputCost: isNaN(inputCost) ? undefined : inputCost * 1000000, // Convert to per-token
      outputCost: isNaN(outputCost) ? undefined : outputCost * 1000000,
      provider: 'openrouter',
      capabilities: {
        supportsVision: openRouterModel.architecture.modality.includes('vision'),
        maxTokens: openRouterModel.top_provider.max_completion_tokens || 4096,
      },
    };
  }

  private formatMessage(message: ChatMessage): OpenRouterMessage {
    const openRouterMessage: OpenRouterMessage = {
      role: message.role,
      content: '',
    };

    // Handle content
    if (typeof message.content === 'string') {
      openRouterMessage.content = message.content || ' '; // Ensure non-empty
    } else if (Array.isArray(message.content)) {
      // Handle content blocks
      const contentBlocks = message.content.map(block => {
        if (block.type === 'text') {
          return {
            type: 'text' as const,
            text: block.text || ' ',
          };
        } else if (block.type === 'image') {
          return {
            type: 'image_url' as const,
            image_url: {
              url: block.imageUrl || '',
            },
          };
        } else {
          // Fallback for unknown block types
          return {
            type: 'text' as const,
            text: ' ',
          };
        }
      });
      
      // If we have content blocks, use them; otherwise provide default text content
      if (contentBlocks.length > 0) {
        openRouterMessage.content = contentBlocks;
      } else {
        openRouterMessage.content = ' ';
      }
    } else {
      // Fallback for any other content type
      openRouterMessage.content = ' ';
    }

    // Handle tool calls (only for assistant messages)
    if (message.toolCalls && message.role === 'assistant') {
      openRouterMessage.tool_calls = message.toolCalls.map(toolCall => ({
        id: toolCall.id,
        type: 'function' as const,
        function: {
          name: toolCall.function.name,
          arguments: JSON.stringify(toolCall.function.arguments),
        },
      }));
      
      // For messages with tool calls, content can be null
      if (typeof openRouterMessage.content === 'string' && openRouterMessage.content.trim() === '') {
        (openRouterMessage as any).content = null;
      }
    }

    // Handle tool call ID for tool response messages
    if (message.toolCallId && message.role === 'tool') {
      openRouterMessage.tool_call_id = message.toolCallId;
    }

    return openRouterMessage;
  }

  private parseResponse(response: OpenRouterChatResponse): InferenceResponse {
    const choice = response.choices[0];
    const message = choice.message;

    const chatMessage: ChatMessage = {
      role: 'assistant',
      content: message.content || '',
    };

    // Parse tool calls if present
    if (message.tool_calls) {
      chatMessage.toolCalls = message.tool_calls.map(this.parseToolCall);
    }

    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };

    let stopReason: InferenceResponse['stopReason'];
    switch (choice.finish_reason) {
      case 'stop':
        stopReason = 'stop';
        break;
      case 'length':
        stopReason = 'max_tokens';
        break;
      case 'tool_calls':
        stopReason = 'tool_calls';
        break;
      default:
        stopReason = 'error';
    }

    return {
      message: chatMessage,
      usage,
      stopReason,
    };
  }

  private parseToolCall(openRouterToolCall: OpenRouterToolCall): ToolCall {
    let parsedArguments: Record<string, any>;
    
    try {
      parsedArguments = JSON.parse(openRouterToolCall.function.arguments);
    } catch (error) {
      // If JSON parsing fails, create an error object
      parsedArguments = {
        _parseError: 'Invalid JSON in tool call arguments',
        _rawArguments: openRouterToolCall.function.arguments,
      };
    }

    return {
      id: openRouterToolCall.id,
      type: 'function',
      function: {
        name: openRouterToolCall.function.name,
        arguments: parsedArguments,
      },
    };
  }

  private validateRequest(request: InferenceRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request must contain at least one message');
    }

    // Validate message structure
    for (const message of request.messages) {
      if (!message.role || !['user', 'assistant', 'system', 'tool'].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }

      if (!message.content && !message.toolCalls) {
        throw new Error('Message must have content or tool calls');
      }
    }

    // Validate tools if provided
    if (request.tools) {
      for (const tool of request.tools) {
        if (tool.type !== 'function') {
          throw new Error(`Unsupported tool type: ${tool.type}`);
        }
        if (!tool.function?.name) {
          throw new Error('Tool function must have a name');
        }
      }
    }
  }

  private cleanRequest(request: OpenRouterChatRequest): void {
    // Remove undefined values that might cause API errors
    if (request.max_tokens === undefined) {
      delete request.max_tokens;
    }
    if (request.temperature === undefined) {
      delete request.temperature;
    }
    if (request.stop === undefined) {
      delete request.stop;
    }

    // Clean messages
    for (const message of request.messages) {
      if (message.tool_calls === undefined) {
        delete message.tool_calls;
      }
      if (message.tool_call_id === undefined) {
        delete message.tool_call_id;
      }

      // Handle content validation
      if (message.content === '' || message.content === undefined) {
        if (message.tool_calls && message.tool_calls.length > 0) {
          // Assistant messages with tool calls can have null content
          (message as any).content = null;
        } else {
          // Other messages need non-empty content
          message.content = ' ';
        }
      }
    }

    // Clean tools if present
    if (request.tools) {
      request.tools = request.tools.filter(tool => 
        tool.function?.name && typeof tool.function.name === 'string'
      );
      
      if (request.tools.length === 0) {
        delete request.tools;
        delete request.tool_choice;
      }
    }
  }

  private createInferenceError(status: number, errorData: OpenRouterErrorResponse): InferenceError {
    const error = errorData.error;
    
    let type: InferenceError['type'];
    let retryable = false;

    switch (status) {
      case 401:
        type = 'auth';
        break;
      case 429:
        type = 'rate_limit';
        retryable = true;
        break;
      case 400:
        type = 'invalid_request';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = 'provider_error';
        retryable = true;
        break;
      default:
        type = 'provider_error';
    }

    return {
      type,
      message: error.message || `HTTP ${status} error`,
      details: error,
      retryable,
    };
  }
}