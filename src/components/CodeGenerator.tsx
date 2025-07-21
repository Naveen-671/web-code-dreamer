import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Code2, Eye, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';
import { MonacoEditor } from './MonacoEditor';
import { PreviewFrame } from './PreviewFrame';
import { ImageUpload } from './ImageUpload';
import { ModelSelector } from './ModelSelector';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string;
  prompt: string;
  image_url?: string;
  generated_html?: string;
  generated_css?: string;
  generated_js?: string;
  framework: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export function CodeGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'huggingface' | 'nvidia'>('nvidia');
  const [selectedModel, setSelectedModel] = useState('nvidia/nemotron-4-340b-instruct');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('prompt');

  useEffect(() => {
    // Initialize API keys from your provided values
    localStorage.setItem('HUGGINGFACE_API_KEY', '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');
    localStorage.setItem('GOOGLE_API_KEY', 'AIzaSyDUVLXa_5oxCng36P2EsevoT0EVguVlvJY');
    initializeAuth();
    loadProjects();
  }, []);

  const initializeAuth = async () => {
    // Sign in anonymously if no user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await supabase.auth.signInAnonymously();
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const generateCode = async () => {
    if (!prompt.trim() && !uploadedImage) {
      toast.error('Please provide a prompt or upload an image');
      return;
    }

    setIsGenerating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create new project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
          description: prompt,
          prompt,
          image_url: uploadedImage,
          framework: 'html',
          status: 'pending',
          user_id: user.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      setCurrentProject(project);
      setProjects(prev => [project, ...prev]);

      // Call the AI code generation Edge Function
      const { data, error } = await supabase.functions.invoke('ai-code-generator', {
        body: {
          prompt,
          image: uploadedImage,
          provider: selectedProvider,
          model: selectedModel,
          projectId: project.id
        }
      });

      if (error) throw error;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        const { data: updatedProject, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', project.id)
          .single();

        if (fetchError) throw fetchError;

        if (updatedProject.status === 'completed') {
          setCurrentProject(updatedProject);
          setActiveTab('preview');
          toast.success('Code generated successfully!');
          loadProjects(); // Refresh projects list
          break;
        } else if (updatedProject.status === 'error') {
          throw new Error('Code generation failed');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (attempts >= maxAttempts) {
        throw new Error('Code generation timed out');
      }

    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate code: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="container mx-auto p-2 max-w-full h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-3xl font-bold flex-1 text-center">AI Code Generator</h1>
        <ThemeToggle />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-1 min-h-0 overflow-y-auto">{/* min-h-0 allows flex children to shrink */}
        {/* Left Panel - Projects List */}
        <div className="flex flex-col h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-lg">Projects</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    currentProject?.id === project.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setCurrentProject(project)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm truncate">{project.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {project.description}
                      </p>
                      <Badge
                        variant={
                          project.status === 'completed' ? 'default' :
                          project.status === 'generating' ? 'secondary' :
                          project.status === 'error' ? 'destructive' : 'outline'
                        }
                        className="mt-2 text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Input Panel */}
        <div className="flex flex-col h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                AI Code Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prompt">Prompt</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="prompt" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Describe your application:
                    </label>
                    <Textarea
                      placeholder="Example: Create a modern landing page for a fitness app with a hero section, features grid, and contact form..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>
                  
                  <ImageUpload onImageUpload={setUploadedImage} uploadedImage={uploadedImage} />
                  
                  <Button 
                    onClick={generateCode} 
                    disabled={isGenerating} 
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Generate Code
                      </>
                    )}
                  </Button>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <ModelSelector
                    selectedProvider={selectedProvider}
                    selectedModel={selectedModel}
                    onProviderChange={setSelectedProvider}
                    onModelChange={setSelectedModel}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Code Editor Panel */}
        <div className="flex flex-col h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Generated Code
              </CardTitle>
              {currentProject && (
                <Badge variant="secondary">{currentProject.framework || 'html'}</Badge>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {currentProject ? (
                <MonacoEditor
                  code={{
                    html: currentProject.generated_html || '',
                    css: currentProject.generated_css || '',
                    js: currentProject.generated_js || '',
                    framework: (currentProject.framework as 'react' | 'html' | 'vue') || 'html'
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a project to view generated code
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="flex flex-col h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <PreviewFrame 
                html={currentProject?.generated_html || ''}
                css={currentProject?.generated_css || ''}
                js={currentProject?.generated_js || ''}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}