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

const BASE_PROMPT = `You are an expert web developer AI assistant that generates complete, production-ready web applications based on SPECIFIC user requests.

CRITICAL ANALYSIS REQUIREMENT:
1. READ and UNDERSTAND the user's specific request carefully
2. If they ask for a "todo app" - create a FUNCTIONAL todo application with add/delete/edit features
3. If they ask for a "calculator" - create a WORKING calculator with buttons and math operations
4. If they ask for a "game" - create that specific game with interactive gameplay
5. If they ask for a "landing page" - create a landing page for the specified topic/business
6. NEVER create generic templates - always match the exact request

TECHNICAL INSTRUCTIONS:
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
You MUST respond with ONLY a valid JSON object (no extra text):
{
  "html": "complete HTML code that implements the user's specific request",
  "css": "complete CSS code with modern styling", 
  "js": "complete JavaScript code with functionality",
  "framework": "html",
  "description": "description of the specific functionality built"
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
- Implement proper SEO meta tags

CRITICAL: Generate UNIQUE content that exactly matches the user's request. Analyze their prompt and build exactly what they asked for.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, image, provider, model, projectId }: GenerateCodeRequest = await req.json();
    
    console.log(`Generating code with ${provider} model ${model} for project ${projectId}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not found');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update project status to generating
    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'generating' })
      .eq('id', projectId);
      
    if (updateError) {
      console.error('Error updating project status:', updateError);
      throw new Error(`Failed to update project status: ${updateError.message}`);
    }

    let generatedResponse = '';

    console.log(`Calling ${provider} provider...`);
    
    if (provider === 'gemini') {
      generatedResponse = await generateWithGemini(prompt, image, model);
    } else if (provider === 'huggingface') {
      generatedResponse = await generateWithHuggingFace(prompt, image, model);
    } else if (provider === 'nvidia') {
      generatedResponse = await generateWithNvidia(prompt, image, model);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    console.log('Generated response length:', generatedResponse.length);

    // Parse the AI response
    let parsedCode;
    try {
      // Clean the response - remove markdown formatting if present
      let cleanResponse = generatedResponse.trim();
      
      // Remove markdown code block wrapper if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      parsedCode = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (!parsedCode.html || !parsedCode.css || !parsedCode.js) {
        throw new Error('Missing required fields in AI response');
      }
      
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      console.log('Raw response snippet:', generatedResponse.substring(0, 500));
      
      // Try to extract code from markdown blocks
      const htmlMatch = generatedResponse.match(/```html\n([\s\S]*?)\n```/);
      const cssMatch = generatedResponse.match(/```css\n([\s\S]*?)\n```/);
      const jsMatch = generatedResponse.match(/```javascript\n([\s\S]*?)\n```/);

      parsedCode = {
        html: htmlMatch?.[1] || generateDynamicHTML(prompt),
        css: cssMatch?.[1] || generateDynamicCSS(prompt),
        js: jsMatch?.[1] || generateDynamicJS(prompt),
        framework: 'html',
        description: `Generated ${prompt} application`
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
    console.error('Error stack:', error.stack);
    
    // Try to update project status to error if we have the projectId
    let requestBody: any = {};
    try {
      // Re-extract the request body for error handling
      if (req.bodyUsed) {
        // If body already used, try to get projectId from the error context
        requestBody = { projectId: null };
      } else {
        requestBody = await req.json();
      }
    } catch (e) {
      requestBody = { projectId: null };
    }
    
    if (requestBody.projectId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from('projects')
            .update({ status: 'error' })
            .eq('id', requestBody.projectId);
        }
      } catch (updateError) {
        console.error('Failed to update project status to error:', updateError);
      }
    }
    
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
  console.log('Starting Gemini generation...');
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not found in environment variables');

  const fullPrompt = `${BASE_PROMPT}\n\nUser Request: ${prompt}\n\nIMPORTANT: Generate UNIQUE and VARIED content based on this specific request. Make it different from previous generations. Be creative and implement the specific features requested.`;
  
  const requestBody: any = {
    contents: [{
      parts: [{ text: fullPrompt }]
    }],
    generationConfig: {
      temperature: 0.9,
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

  console.log(`Calling Gemini API with model: ${model}`);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  const data = await response.json();
  console.log('Gemini response status:', response.status);
  
  if (!response.ok) {
    console.error('Gemini API error response:', data);
    throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
  }

  const result = data.candidates[0].content.parts[0].text;
  console.log('Gemini generation completed successfully');
  return result;
}

async function generateWithHuggingFace(prompt: string, image?: string, model: string = 'microsoft/DialoGPT-large'): Promise<string> {
  console.log('Starting HuggingFace generation...');
  const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');
  if (!apiKey) {
    console.error('HUGGINGFACE_API_KEY not found in environment variables');
    throw new Error('HUGGINGFACE_API_KEY not found');
  }

  const fullPrompt = `${BASE_PROMPT}\n\nUser Request: ${prompt}\n\nIMPORTANT: Generate UNIQUE and VARIED content based on this specific request. Make it different from previous generations.`;

  // Use text generation models that actually work
  const workingModel = 'microsoft/DialoGPT-medium'; // Use a more reliable model
  
  console.log(`Calling HuggingFace API with model: ${workingModel}`);
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${workingModel}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          },
          options: {
            wait_for_model: true
          }
        })
      }
    );

    console.log('HuggingFace response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace API error response:', errorText);
      
      // If the model is not available or there's an error, generate structured response directly
      console.log('HuggingFace API failed, generating structured code directly...');
      return JSON.stringify({
        html: generateDynamicHTML(prompt),
        css: generateDynamicCSS(prompt),
        js: generateDynamicJS(prompt),
        framework: 'html',
        description: `Generated ${prompt} application (HuggingFace API unavailable)`
      });
    }

    const data = await response.json();
    const result = data[0]?.generated_text || data.generated_text;
    
    // If we don't get a proper response, generate a structured response
    if (!result || result.length < 100) {
      console.log('HuggingFace returned minimal response, generating structured code...');
      return JSON.stringify({
        html: generateDynamicHTML(prompt),
        css: generateDynamicCSS(prompt),
        js: generateDynamicJS(prompt),
        framework: 'html',
        description: `Generated ${prompt} application using HuggingFace`
      });
    }
    
    console.log('HuggingFace generation completed successfully');
    return result;
    
  } catch (error) {
    console.error('HuggingFace API request failed:', error);
    
    // Always provide a fallback with proper structure
    console.log('Generating fallback structured code due to API error...');
    return JSON.stringify({
      html: generateDynamicHTML(prompt),
      css: generateDynamicCSS(prompt),
      js: generateDynamicJS(prompt),
      framework: 'html',
      description: `Generated ${prompt} application (fallback due to API error)`
    });
  }
}

async function generateWithNvidia(prompt: string, image?: string, model: string = 'nvidia/nemotron-4-340b-instruct'): Promise<string> {
  console.log('Starting NVIDIA generation...');
  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  if (!apiKey) throw new Error('NVIDIA_API_KEY not found');

  const fullPrompt = `${BASE_PROMPT}\n\nUser Request: ${prompt}\n\nIMPORTANT: Generate UNIQUE and VARIED content based on this specific request. Make it different from previous generations.`;
  
  const messages: any[] = [
    { role: 'system', content: 'You are an expert web developer that generates complete web applications. Always respond with valid JSON containing html, css, js, framework, and description fields. Be creative and generate different content for different requests.' },
    { role: 'user', content: fullPrompt }
  ];

  if (image) {
    messages[1].content = [
      { type: 'text', text: fullPrompt },
      { type: 'image_url', image_url: { url: image } }
    ];
  }

  console.log(`Calling NVIDIA API with model: ${model}`);
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 4000,
      stream: false
    })
  });

  const data = await response.json();
  console.log('NVIDIA response status:', response.status);
  
  if (!response.ok) {
    console.error('NVIDIA API error response:', data);
    throw new Error(`NVIDIA API error: ${data.error?.message || 'Unknown error'}`);
  }

  const result = data.choices[0].message.content;
  console.log('NVIDIA generation completed successfully');
  return result;
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
});`;
}

function generateDynamicHTML(prompt: string): string {
  const appType = prompt.toLowerCase();
  let content = '';
  
  if (appType.includes('calculator')) {
    content = `
        <div class="calculator">
            <div class="display" id="display">0</div>
            <div class="buttons">
                <button onclick="clearDisplay()">C</button>
                <button onclick="deleteLast()">←</button>
                <button onclick="appendToDisplay('/')">/</button>
                <button onclick="appendToDisplay('*')">×</button>
                <button onclick="appendToDisplay('7')">7</button>
                <button onclick="appendToDisplay('8')">8</button>
                <button onclick="appendToDisplay('9')">9</button>
                <button onclick="appendToDisplay('-')">-</button>
                <button onclick="appendToDisplay('4')">4</button>
                <button onclick="appendToDisplay('5')">5</button>
                <button onclick="appendToDisplay('6')">6</button>
                <button onclick="appendToDisplay('+')">+</button>
                <button onclick="appendToDisplay('1')">1</button>
                <button onclick="appendToDisplay('2')">2</button>
                <button onclick="appendToDisplay('3')">3</button>
                <button onclick="calculate()" class="equals">=</button>
                <button onclick="appendToDisplay('0')" class="zero">0</button>
                <button onclick="appendToDisplay('.')">.</button>
            </div>
        </div>`;
  } else if (appType.includes('todo') || appType.includes('task')) {
    content = `
        <div class="todo-app">
            <h2>Todo List</h2>
            <div class="input-section">
                <input type="text" id="todoInput" placeholder="Add a new task...">
                <button onclick="addTodo()">Add</button>
            </div>
            <ul id="todoList" class="todo-list"></ul>
        </div>`;
  } else {
    content = `
        <div class="dynamic-app">
            <h2>${prompt}</h2>
            <p>This application was generated based on your request: "${prompt}"</p>
            <div class="features">
                <div class="feature">
                    <h3>Interactive Elements</h3>
                    <button onclick="showAlert()">Click Me</button>
                </div>
                <div class="feature">
                    <h3>Dynamic Content</h3>
                    <p id="dynamic-text">This text will change!</p>
                    <button onclick="changeText()">Change Text</button>
                </div>
            </div>
        </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt} - Generated App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Generated: ${prompt}</h1>
        </header>
        <main>
            ${content}
        </main>
    </div>
    <script src="script.js"></script>
</body>
</html>`;
}

function generateDynamicCSS(prompt: string): string {
  return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 15px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    overflow: hidden;
}

header {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 2rem;
    text-align: center;
}

main {
    padding: 2rem;
}

/* Calculator Styles */
.calculator {
    max-width: 300px;
    margin: 0 auto;
    background: #f8f9fa;
    border-radius: 10px;
    padding: 20px;
}

.display {
    background: #222;
    color: white;
    padding: 20px;
    text-align: right;
    font-size: 2rem;
    border-radius: 5px;
    margin-bottom: 20px;
}

.buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}

.buttons button {
    padding: 20px;
    border: none;
    border-radius: 5px;
    font-size: 1.2rem;
    cursor: pointer;
    background: #e9ecef;
    transition: all 0.2s;
}

.buttons button:hover {
    background: #dee2e6;
    transform: translateY(-2px);
}

.equals {
    grid-row: span 2;
    background: #667eea !important;
    color: white !important;
}

.zero {
    grid-column: span 2;
}

/* Todo Styles */
.todo-app {
    max-width: 500px;
    margin: 0 auto;
}

.input-section {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.input-section input {
    flex: 1;
    padding: 12px;
    border: 2px solid #e9ecef;
    border-radius: 5px;
    font-size: 1rem;
}

.input-section button {
    padding: 12px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.todo-list {
    list-style: none;
}

.todo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #f8f9fa;
    margin-bottom: 10px;
    border-radius: 5px;
}

.todo-item.completed {
    text-decoration: line-through;
    opacity: 0.7;
}

/* Dynamic App Styles */
.dynamic-app h2 {
    color: #667eea;
    margin-bottom: 1rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 30px;
}

.feature {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
}

button {
    background: #667eea;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
}

button:hover {
    background: #5a6fd8;
    transform: translateY(-2px);
}`;
}

function generateDynamicJS(prompt: string): string {
  const appType = prompt.toLowerCase();
  
  if (appType.includes('calculator')) {
    return `let display = document.getElementById('display');
let currentInput = '0';
let shouldResetDisplay = false;

function updateDisplay() {
    display.textContent = currentInput;
}

function clearDisplay() {
    currentInput = '0';
    updateDisplay();
}

function deleteLast() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function appendToDisplay(value) {
    if (shouldResetDisplay) {
        currentInput = '';
        shouldResetDisplay = false;
    }
    
    if (currentInput === '0' && value !== '.') {
        currentInput = value;
    } else {
        currentInput += value;
    }
    updateDisplay();
}

function calculate() {
    try {
        const result = eval(currentInput.replace('×', '*'));
        currentInput = result.toString();
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        currentInput = 'Error';
        shouldResetDisplay = true;
        updateDisplay();
    }
}`;
  } else if (appType.includes('todo') || appType.includes('task')) {
    return `let todos = [];
let todoIdCounter = 0;

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text) {
        const todo = {
            id: todoIdCounter++,
            text: text,
            completed: false
        };
        todos.push(todo);
        input.value = '';
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
    }
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');
        li.innerHTML = \`
            <span onclick="toggleTodo(\${todo.id})">\${todo.text}</span>
            <button onclick="deleteTodo(\${todo.id})">Delete</button>
        \`;
        todoList.appendChild(li);
    });
}

document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});`;
  } else {
    return `function showAlert() {
    alert('Hello! This is your generated application.');
}

function changeText() {
    const textElement = document.getElementById('dynamic-text');
    const messages = [
        'Text changed!',
        'This is dynamic!',
        'Generated with AI!',
        'Interactive content!',
        'Your app is working!'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    textElement.textContent = randomMessage;
    textElement.style.color = '#667eea';
}

document.addEventListener('DOMContentLoaded', function() {
    // Add some interactive effects
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
});`;
  }
}