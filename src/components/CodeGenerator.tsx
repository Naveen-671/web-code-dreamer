import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WebContainer, FileSystemTree } from '@webcontainer/api';
import { MonacoEditor } from './MonacoEditor';
import { PreviewFrame } from './PreviewFrame';
import { ImageUpload } from './ImageUpload';
import { ModelSelector } from './ModelSelector';
import { ApiKeyManager } from './ApiKeyManager';
import { AIProviderManager, AIProvider } from '@/lib/ai-providers';
import { inngest } from '@/lib/inngest';
import { toast } from "sonner";
import { 
  Wand2, 
  Image as ImageIcon, 
  Code2, 
  Play, 
  Copy, 
  Download,
  Sparkles,
  Brain,
  Palette,
  Settings
} from 'lucide-react';

interface GeneratedCode {
  html: string;
  css: string;
  js: string;
  framework: 'react' | 'html' | 'vue';
}

export const CodeGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'image' | 'settings'>('prompt');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const webcontainerInstance = useRef<WebContainer | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Initialize WebContainer
  const initWebContainer = useCallback(async () => {
    try {
      if (!webcontainerInstance.current) {
        webcontainerInstance.current = await WebContainer.boot();
        toast.success("Preview environment ready!");
      }
      return webcontainerInstance.current;
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error);
      toast.error("Failed to initialize preview environment");
      return null;
    }
  }, []);

  // AI Code Generation (Mock - replace with actual AI service)
  const generateCodeFromPrompt = async (userPrompt: string): Promise<GeneratedCode> => {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock generated code based on prompt
    const mockCode: GeneratedCode = {
      framework: 'react',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style id="generated-styles"></style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="./app.js"></script>
</body>
</html>`,
      css: `
/* Generated CSS based on: ${userPrompt} */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-container {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 1rem;
}

.description {
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.button:hover {
  transform: translateY(-2px);
}
      `,
      js: `
const { useState } = React;

function App() {
  const [count, setCount] = useState(0);
  
  return React.createElement('div', { className: 'app-container' },
    React.createElement('h1', { className: 'title' }, 'Generated App'),
    React.createElement('p', { className: 'description' }, 
      'This app was generated from: "${userPrompt}"'
    ),
    React.createElement('p', { style: { marginBottom: '1rem' } }, 
      'Counter: ' + count
    ),
    React.createElement('button', { 
      className: 'button',
      onClick: () => setCount(count + 1)
    }, 'Click me!')
  );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
      `
    };

    return mockCode;
  };

  // Generate code from image (Mock - replace with actual vision AI)
  const generateCodeFromImage = async (imageUrl: string): Promise<GeneratedCode> => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock code generation from image
    return {
      framework: 'react',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated from Image</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="./app.js"></script>
</body>
</html>`,
      css: `
/* Generated from uploaded image */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: #f8fafc;
  padding: 2rem;
}

.image-recreation {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #64748b;
  font-size: 1.1rem;
}
      `,
      js: `
function App() {
  return React.createElement('div', { className: 'image-recreation' },
    React.createElement('div', { className: 'header' },
      React.createElement('h1', { className: 'title' }, 'Recreated from Image'),
      React.createElement('p', { className: 'subtitle' }, 
        'This layout was generated from your uploaded image'
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
      `
    };
  };

  // Handle code generation
  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      toast.error("Please enter a prompt or upload an image");
      return;
    }

    setIsGenerating(true);
    setIsPreviewReady(false);

    try {
      let code: GeneratedCode;
      
      if (activeTab === 'image' && uploadedImage) {
        toast.info("Analyzing image and generating code...");
        code = await generateCodeFromImage(uploadedImage);
      } else {
        toast.info("Generating code from prompt...");
        code = await generateCodeFromPrompt(prompt);
      }

      setGeneratedCode(code);
      await setupPreview(code);
      toast.success("Code generated successfully!");
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error("Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };

  // Setup preview in WebContainer
  const setupPreview = async (code: GeneratedCode) => {
    const webcontainer = await initWebContainer();
    if (!webcontainer) return;

    try {
      // Create file structure
      const files: FileSystemTree = {
        'index.html': {
          file: {
            contents: code.html.replace('<style id="generated-styles"></style>', 
              `<style>${code.css}</style>`)
          }
        },
        'app.js': {
          file: {
            contents: code.js
          }
        },
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: "generated-app",
              version: "1.0.0",
              scripts: {
                start: "serve ."
              },
              devDependencies: {
                serve: "^14.0.0"
              }
            }, null, 2)
          }
        }
      };

      // Mount files
      await webcontainer.mount(files);

      // Install dependencies and start server
      const installProcess = await webcontainer.spawn('npm', ['install']);
      await installProcess.exit;

      const serverProcess = await webcontainer.spawn('npm', ['start']);
      
      // Get the preview URL
      webcontainer.on('server-ready', (port, url) => {
        if (previewRef.current) {
          previewRef.current.src = url;
          setIsPreviewReady(true);
        }
      });

    } catch (error) {
      console.error('Preview setup failed:', error);
      toast.error("Failed to setup preview");
    }
  };

  // Copy code to clipboard
  const copyCode = async (codeType: keyof Pick<GeneratedCode, 'html' | 'css' | 'js'>) => {
    if (!generatedCode) return;
    
    await navigator.clipboard.writeText(generatedCode[codeType]);
    toast.success(`${codeType.toUpperCase()} copied to clipboard!`);
  };

  // Download code as files
  const downloadCode = () => {
    if (!generatedCode) return;

    const zip = {
      'index.html': generatedCode.html,
      'styles.css': generatedCode.css,
      'script.js': generatedCode.js
    };

    // Simple download implementation
    Object.entries(zip).forEach(([filename, content]) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });

    toast.success("Code files downloaded!");
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Code Generator
              </h1>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Beta
            </Badge>
          </div>
          
          {generatedCode && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadCode}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Input Panel */}
        <div className="w-96 border-r border-border/50 bg-background/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="flex rounded-lg bg-muted/50 p-1">
              <button
                onClick={() => setActiveTab('prompt')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-all ${
                  activeTab === 'prompt' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Wand2 className="h-4 w-4" />
                Text Prompt
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-all ${
                  activeTab === 'image' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                Image Upload
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-all ${
                  activeTab === 'settings' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {activeTab === 'prompt' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Describe what you want to build
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Create a modern landing page with a hero section, features grid, and contact form. Use a purple gradient background..."
                    className="min-h-[200px] resize-none"
                  />
                </div>
              </div>
            ) : activeTab === 'image' ? (
              <ImageUpload 
                onImageUpload={setUploadedImage}
                uploadedImage={uploadedImage}
              />
            ) : (
              <div className="space-y-4">
                <ApiKeyManager onApiKeysChange={setApiKeys} />
                <ModelSelector
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  onProviderChange={setSelectedProvider}
                  onModelChange={setSelectedModel}
                />
              </div>
            )}

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Code
                </>
              )}
            </Button>

            {/* Generated Code Preview */}
            {generatedCode && (
              <div className="space-y-3">
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Generated Files</h3>
                    <Badge variant="outline" className="text-xs">
                      {generatedCode.framework}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {(['html', 'css', 'js'] as const).map((type) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{type}.{type === 'js' ? 'js' : type}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(type)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor and Preview */}
        <div className="flex-1 flex flex-col">
          {generatedCode ? (
            <div className="flex-1 flex">
              {/* Monaco Editor */}
              <div className="flex-1 border-r border-border/50">
                <MonacoEditor code={generatedCode} />
              </div>
              
              {/* Preview */}
              <div className="flex-1 bg-background">
                <PreviewFrame 
                  ref={previewRef}
                  isReady={isPreviewReady}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center space-y-4 max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Palette className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Ready to Generate</h3>
                <p className="text-muted-foreground">
                  Enter a prompt or upload an image to generate code with AI. 
                  Your designs from the Figma canvas can also be converted to code here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};