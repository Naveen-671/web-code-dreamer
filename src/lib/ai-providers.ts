import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'nvidia' | 'anthropic' | 'google' | 'huggingface';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export class AIProviderManager {
  private providers: Map<AIProvider, any> = new Map();

  constructor(configs: AIConfig[]) {
    configs.forEach(config => {
      this.initializeProvider(config);
    });
  }

  private initializeProvider(config: AIConfig) {
    switch (config.provider) {
      case 'nvidia':
        this.providers.set('nvidia', {
          apiKey: config.apiKey
        });
        break;
      case 'anthropic':
        this.providers.set('anthropic', new Anthropic({
          apiKey: config.apiKey,
          dangerouslyAllowBrowser: true
        }));
        break;
      case 'google':
        this.providers.set('google', new GoogleGenerativeAI(config.apiKey));
        break;
      case 'huggingface':
        // Will implement HuggingFace later
        break;
    }
  }

  async generateCode(prompt: string, provider: AIProvider, model: string): Promise<string> {
    const basePrompt = this.getBasePrompt();
    const fullPrompt = `${basePrompt}\n\nUser Request: ${prompt}`;

    switch (provider) {
      case 'nvidia':
        return this.generateWithNvidia(fullPrompt, model);
      case 'anthropic':
        return this.generateWithAnthropic(fullPrompt, model);
      case 'google':
        return this.generateWithGoogle(fullPrompt, model);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  private async generateWithNvidia(prompt: string, model: string): Promise<string> {
    const nvidia = this.providers.get('nvidia');
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidia.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content || '';
  }

  private async generateWithAnthropic(prompt: string, model: string): Promise<string> {
    const anthropic = this.providers.get('anthropic');
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    
    return response.content[0].text || '';
  }

  private async generateWithGoogle(prompt: string, model: string): Promise<string> {
    const genAI = this.providers.get('google');
    const genModel = genAI.getGenerativeModel({ model: model });
    const result = await genModel.generateContent(prompt);
    
    return result.response.text() || '';
  }

  private getBasePrompt(): string {
    return `You are an expert web developer AI assistant that generates complete, production-ready web applications.

CRITICAL INSTRUCTIONS:
1. Generate a complete HTML file with embedded CSS and JavaScript
2. Use modern web technologies (HTML5, CSS3, ES6+)
3. Make the design responsive and visually appealing
4. Include proper meta tags and semantic HTML
5. Use CSS Grid/Flexbox for layouts
6. Add smooth animations and transitions
7. Ensure cross-browser compatibility
8. Include proper error handling in JavaScript
9. Make the code clean, well-commented, and maintainable
10. Use modern CSS techniques like custom properties and modern selectors

RESPONSE FORMAT:
You must respond with a JSON object containing:
{
  "html": "complete HTML code",
  "css": "complete CSS code", 
  "js": "complete JavaScript code",
  "framework": "html|react|vue",
  "description": "brief description of what was built"
}

DESIGN PRINCIPLES:
- Use modern color schemes and typography
- Implement proper spacing and visual hierarchy
- Add hover effects and micro-interactions
- Ensure accessibility (ARIA labels, proper contrast)
- Use modern CSS features like backdrop-filter, gradient, shadows
- Implement responsive design for all screen sizes

TECHNICAL REQUIREMENTS:
- All code must be self-contained and runnable
- Use CDN links for external libraries if needed
- Include proper error handling and validation
- Optimize for performance and loading speed
- Use semantic HTML elements
- Implement proper SEO meta tags`;
  }
}

export const AI_MODELS = {
  nvidia: [
    { id: 'microsoft/phi-3-mini-4k-instruct', name: 'Phi-3 Mini 4K', description: 'Free Microsoft model' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Free Meta model' },
    { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B', description: 'Free Mistral model' }
  ],
  anthropic: [
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest responses' }
  ],
  google: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Free and fast' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Free tier available' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Free tier available' }
  ],
  huggingface: [
    { id: 'microsoft/DialoGPT-medium', name: 'DialoGPT Medium', description: 'Free conversational model' },
    { id: 'bigcode/starcoder2-3b', name: 'StarCoder2 3B', description: 'Free code model' },
    { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B', description: 'Free instruction model' }
  ]
};