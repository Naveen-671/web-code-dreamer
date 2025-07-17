import { Inngest } from 'inngest';
import { AIProviderManager, AIProvider } from './ai-providers';

export const inngest = new Inngest({ id: 'web-builder' });

export interface GenerateCodeEvent {
  data: {
    userId: string;
    prompt: string;
    image?: string;
    provider: AIProvider;
    model: string;
    conversationId: string;
  };
}

export interface CodeGenerationMemory {
  conversationId: string;
  history: Array<{
    prompt: string;
    response: string;
    timestamp: number;
  }>;
  context: {
    projectType: string;
    framework: string;
    style: string;
  };
}

// AI Code Generation Agent
export const generateCodeAgent = inngest.createFunction(
  { id: 'generate-code' },
  { event: 'ai/generate-code' },
  async ({ event, step }) => {
    const { userId, prompt, image, provider, model, conversationId } = event.data;

    // Step 1: Load conversation memory
    const memory = await step.run('load-memory', async () => {
      const stored = localStorage.getItem(`conversation:${conversationId}`);
      return stored ? JSON.parse(stored) : {
        conversationId,
        history: [],
        context: {
          projectType: 'web-app',
          framework: 'html',
          style: 'modern'
        }
      };
    });

    // Step 2: Analyze prompt for context
    const analysisResult = await step.run('analyze-prompt', async () => {
      const contextPrompt = `
        Analyze this web development request and extract:
        1. Project type (landing-page, dashboard, e-commerce, blog, etc.)
        2. Framework preference (html, react, vue, or auto-detect)
        3. Style preference (modern, minimalist, colorful, professional, etc.)
        4. Key features requested

        Request: "${prompt}"
        
        Respond in JSON format:
        {
          "projectType": "...",
          "framework": "...",
          "style": "...",
          "features": ["...", "..."]
        }
      `;

      // Use a fast model for analysis
      const aiManager = new AIProviderManager([{
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY || ''
      }]);

      const analysisResponse = await aiManager.generateCode(contextPrompt, 'openai', 'gpt-3.5-turbo');
      
      try {
        return JSON.parse(analysisResponse);
      } catch {
        return {
          projectType: 'web-app',
          framework: 'html',
          style: 'modern',
          features: []
        };
      }
    });

    // Step 3: Generate code with full context
    const codeResult = await step.run('generate-code', async () => {
      const contextualPrompt = `
        Previous conversation context:
        ${memory.history.slice(-3).map(h => `User: ${h.prompt}\nAI: Generated code for ${h.response}`).join('\n')}

        Current project context:
        - Type: ${analysisResult.projectType}
        - Framework: ${analysisResult.framework}
        - Style: ${analysisResult.style}
        - Features: ${analysisResult.features.join(', ')}

        ${image ? `Image provided: ${image}` : ''}

        User Request: ${prompt}

        Generate a complete, production-ready web application that:
        1. Matches the requested style and features
        2. Is fully functional and self-contained
        3. Includes proper responsive design
        4. Uses modern web technologies
        5. Has smooth animations and interactions
        6. Includes error handling and validation
        7. Is optimized for performance
        8. Follows accessibility best practices
      `;

      const aiManager = new AIProviderManager([{
        provider,
        model,
        apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || ''
      }]);

      return await aiManager.generateCode(contextualPrompt, provider, model);
    });

    // Step 4: Parse and validate generated code
    const parsedCode = await step.run('parse-code', async () => {
      try {
        const parsed = JSON.parse(codeResult);
        
        // Validate required fields
        if (!parsed.html || !parsed.css || !parsed.js) {
          throw new Error('Invalid code structure');
        }

        return parsed;
      } catch (error) {
        // Fallback: try to extract code from text response
        const htmlMatch = codeResult.match(/```html\n([\s\S]*?)\n```/);
        const cssMatch = codeResult.match(/```css\n([\s\S]*?)\n```/);
        const jsMatch = codeResult.match(/```javascript\n([\s\S]*?)\n```/);

        return {
          html: htmlMatch?.[1] || '<html><body><h1>Error generating code</h1></body></html>',
          css: cssMatch?.[1] || 'body { font-family: Arial, sans-serif; }',
          js: jsMatch?.[1] || 'console.log("Code generation error");',
          framework: analysisResult.framework,
          description: 'Generated with fallback parser'
        };
      }
    });

    // Step 5: Save to memory
    await step.run('save-memory', async () => {
      memory.history.push({
        prompt,
        response: parsedCode.description || 'Code generated successfully',
        timestamp: Date.now()
      });

      // Update context
      memory.context = {
        projectType: analysisResult.projectType,
        framework: analysisResult.framework,
        style: analysisResult.style
      };

      // Keep only last 10 interactions
      if (memory.history.length > 10) {
        memory.history = memory.history.slice(-10);
      }

      localStorage.setItem(`conversation:${conversationId}`, JSON.stringify(memory));
    });

    return {
      success: true,
      code: parsedCode,
      analysis: analysisResult,
      conversationId
    };
  }
);

// Image Analysis Agent  
export const analyzeImageAgent = inngest.createFunction(
  { id: 'analyze-image' },
  { event: 'ai/analyze-image' },
  async ({ event, step }) => {
    const { userId, image, provider, model, conversationId } = event.data;

    // Step 1: Analyze image for UI components
    const analysisResult = await step.run('analyze-image', async () => {
      const analysisPrompt = `
        Analyze this UI/design image and describe:
        1. Layout structure (header, navigation, main content, footer, etc.)
        2. Color scheme and typography
        3. UI components (buttons, forms, cards, etc.)
        4. Visual style (modern, minimalist, corporate, etc.)
        5. Responsive design considerations
        6. Interactive elements and their purposes

        Provide detailed technical specifications for recreating this design in HTML/CSS/JavaScript.
      `;

      const aiManager = new AIProviderManager([{
        provider,
        model,
        apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || ''
      }]);

      return await aiManager.generateCode(analysisPrompt, provider, model);
    });

    // Step 2: Generate code based on analysis
    const codeResult = await step.run('generate-from-image', async () => {
      const codePrompt = `
        Based on this image analysis, generate a complete, pixel-perfect recreation:
        
        ${analysisResult}

        Requirements:
        1. Match the visual design exactly
        2. Make it fully responsive
        3. Add appropriate interactions
        4. Use modern CSS techniques
        5. Include hover effects and animations
        6. Ensure accessibility compliance
        7. Optimize for performance
      `;

      const aiManager = new AIProviderManager([{
        provider,
        model,
        apiKey: process.env[`${provider.toUpperCase()}_API_KEY`] || ''
      }]);

      return await aiManager.generateCode(codePrompt, provider, model);
    });

    // Step 3: Parse and return results
    const parsedCode = await step.run('parse-image-code', async () => {
      try {
        return JSON.parse(codeResult);
      } catch {
        return {
          html: '<html><body><h1>Image analysis in progress...</h1></body></html>',
          css: 'body { font-family: Arial, sans-serif; }',
          js: 'console.log("Image-based code generation");',
          framework: 'html',
          description: 'Generated from image analysis'
        };
      }
    });

    return {
      success: true,
      code: parsedCode,
      analysis: analysisResult,
      conversationId
    };
  }
);

// Memory Management Agent
export const memoryManagerAgent = inngest.createFunction(
  { id: 'manage-memory' },
  { event: 'memory/cleanup' },
  async ({ event, step }) => {
    // Clean up old conversations
    await step.run('cleanup-old-conversations', async () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('conversation:'));
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      keys.forEach(key => {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const lastActivity = data.history?.[data.history.length - 1]?.timestamp || 0;
        
        if (now - lastActivity > maxAge) {
          localStorage.removeItem(key);
        }
      });
    });

    return { success: true };
  }
);

// Export functions array for registration
export const inngestFunctions = [
  generateCodeAgent,
  analyzeImageAgent,
  memoryManagerAgent
];
