import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCodeRequest {
  prompt: string;
  image?: string;
  provider: 'gemini' | 'huggingface' | 'nvidia';
  model: string;
  projectId: string;
}

const BASE_PROMPT = `You are an expert web developer AI that generates complete, production-ready web applications.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, image, provider, model, projectId }: GenerateCodeRequest = await req.json();
    
    console.log(`Generating code with ${provider} model ${model} for project ${projectId}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update project status to generating
    await supabase
      .from('projects')
      .update({ status: 'generating' })
      .eq('id', projectId);

    let generatedResponse = '';

    if (provider === 'gemini') {
      generatedResponse = await generateWithGemini(prompt, image, model);
    } else if (provider === 'huggingface') {
      generatedResponse = await generateWithHuggingFace(prompt, image, model);
    } else if (provider === 'nvidia') {
      generatedResponse = await generateWithNvidia(prompt, image, model);
    }

    // Parse the AI response
    let parsedCode;
    try {
      parsedCode = JSON.parse(generatedResponse);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      // Try to extract code from markdown blocks
      const htmlMatch = generatedResponse.match(/```html\n([\s\S]*?)\n```/);
      const cssMatch = generatedResponse.match(/```css\n([\s\S]*?)\n```/);
      const jsMatch = generatedResponse.match(/```javascript\n([\s\S]*?)\n```/);

      parsedCode = {
        html: htmlMatch?.[1] || generateFallbackHTML(prompt),
        css: cssMatch?.[1] || generateFallbackCSS(),
        js: jsMatch?.[1] || generateFallbackJS(),
        framework: 'html',
        description: 'Generated web application'
      };
    }

    // Update project with generated code
    await supabase
      .from('projects')
      .update({
        status: 'completed',
        generated_html: parsedCode.html,
        generated_css: parsedCode.css,
        generated_js: parsedCode.js,
        framework: parsedCode.framework || 'html'
      })
      .eq('id', projectId);

    console.log(`Successfully generated code for project ${projectId}`);

    return new Response(
      JSON.stringify({
        success: true,
        code: parsedCode,
        projectId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-code-generator:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate code', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});

async function generateWithGemini(prompt: string, image?: string, model: string = 'gemini-1.5-flash'): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not found in environment variables');

  const fullPrompt = `${BASE_PROMPT}\n\nUser Request: ${prompt}`;
  
  const requestBody: any = {
    contents: [{
      parts: [{ text: fullPrompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    }
  };

  if (image) {
    // Add image to the request if provided
    requestBody.contents[0].parts.unshift({
      inlineData: {
        mimeType: 'image/jpeg',
        data: image.replace(/^data:image\/[^;]+;base64,/, '')
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
  }

  return data.candidates[0].content.parts[0].text;
}

async function generateWithHuggingFace(prompt: string, image?: string, model: string = 'microsoft/DialoGPT-large'): Promise<string> {
  const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not found');

  const fullPrompt = `${BASE_PROMPT}\n\nUser Request: ${prompt}`;

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_length: 2000,
          temperature: 0.7,
          return_full_text: false
        }
      })
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${data.error || 'Unknown error'}`);
  }

  return data[0]?.generated_text || data.generated_text || JSON.stringify({
    html: generateFallbackHTML(prompt),
    css: generateFallbackCSS(),
    js: generateFallbackJS(),
    framework: 'html',
    description: 'Generated with HuggingFace'
  });
}

async function generateWithNvidia(prompt: string, image?: string, model: string = 'nvidia/nemotron-4-340b-instruct'): Promise<string> {
  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  if (!apiKey) throw new Error('NVIDIA_API_KEY not found');

  const fullPrompt = `${BASE_PROMPT}\n\nUser Request: ${prompt}`;
  
  const messages: any[] = [
    { role: 'system', content: 'You are an expert web developer that generates complete web applications.' },
    { role: 'user', content: fullPrompt }
  ];

  if (image) {
    messages[1].content = [
      { type: 'text', text: fullPrompt },
      { type: 'image_url', image_url: { url: image } }
    ];
  }

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      stream: false
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`NVIDIA API error: ${data.error?.message || 'Unknown error'}`);
  }

  return data.choices[0].message.content;
}

function generateFallbackHTML(prompt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Generated Application</h1>
            <p>Based on: ${prompt}</p>
        </header>
        
        <main>
            <section class="hero">
                <h2>Welcome to Your Generated App</h2>
                <p>This is a fallback template while we improve our AI generation.</p>
                <button class="cta-button" onclick="showMessage()">Get Started</button>
            </section>
            
            <section class="features">
                <div class="feature-card">
                    <h3>Feature 1</h3>
                    <p>Description of the first feature of your app.</p>
                </div>
                <div class="feature-card">
                    <h3>Feature 2</h3>
                    <p>Description of the second feature of your app.</p>
                </div>
                <div class="feature-card">
                    <h3>Feature 3</h3>
                    <p>Description of the third feature of your app.</p>
                </div>
            </section>
        </main>
        
        <footer>
            <p>&copy; 2024 Generated App. All rights reserved.</p>
        </footer>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`;
}

function generateFallbackCSS(): string {
  return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    padding: 2rem 0;
    color: white;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}

.hero {
    background: white;
    padding: 3rem 2rem;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    text-align: center;
    margin: 2rem 0;
}

.hero h2 {
    color: #667eea;
    margin-bottom: 1rem;
}

.cta-button {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 25px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.cta-button:hover {
    transform: translateY(-2px);
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
}

.feature-card {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-5px);
}

.feature-card h3 {
    color: #667eea;
    margin-bottom: 1rem;
}

footer {
    text-align: center;
    padding: 2rem 0;
    color: white;
    margin-top: 2rem;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    header h1 {
        font-size: 2rem;
    }
    
    .hero {
        padding: 2rem 1rem;
    }
}`;
}

function generateFallbackJS(): string {
  return `function showMessage() {
    alert('Welcome to your generated application! This is a demo.');
}

// Add smooth scrolling
document.addEventListener('DOMContentLoaded', function() {
    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });
    
    // Add interactive button effects
    const button = document.querySelector('.cta-button');
    if (button) {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }
});

console.log('Generated application loaded successfully!');`;
}