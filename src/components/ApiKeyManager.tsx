import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { AIProvider } from '@/lib/ai-providers';

interface ApiKeyManagerProps {
  onApiKeysChange: (keys: Record<string, string>) => void;
}

interface ApiKeyConfig {
  provider: AIProvider;
  name: string;
  envVar: string;
  placeholder: string;
  docUrl: string;
  description: string;
}

const apiKeyConfigs: ApiKeyConfig[] = [
  {
    provider: 'openai',
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    placeholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    description: 'Get your API key from OpenAI Platform'
  },
  {
    provider: 'anthropic',
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Get your API key from Anthropic Console'
  },
  {
    provider: 'google',
    name: 'Google AI',
    envVar: 'GOOGLE_API_KEY',
    placeholder: 'AI...',
    docUrl: 'https://makersuite.google.com/app/apikey',
    description: 'Get your API key from Google AI Studio'
  },
  {
    provider: 'huggingface',
    name: 'Hugging Face',
    envVar: 'HUGGINGFACE_API_KEY',
    placeholder: 'hf_...',
    docUrl: 'https://huggingface.co/settings/tokens',
    description: 'Get your API key from Hugging Face'
  }
];

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeysChange }) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({});

  useEffect(() => {
    // Load API keys from localStorage
    const savedKeys: Record<string, string> = {};
    apiKeyConfigs.forEach(config => {
      const saved = localStorage.getItem(config.envVar);
      if (saved) {
        savedKeys[config.provider] = saved;
      }
    });
    setApiKeys(savedKeys);
    onApiKeysChange(savedKeys);
  }, [onApiKeysChange]);

  const updateApiKey = (provider: AIProvider, key: string) => {
    const newKeys = { ...apiKeys, [provider]: key };
    setApiKeys(newKeys);
    
    // Save to localStorage
    const config = apiKeyConfigs.find(c => c.provider === provider);
    if (config) {
      if (key) {
        localStorage.setItem(config.envVar, key);
      } else {
        localStorage.removeItem(config.envVar);
      }
    }
    
    onApiKeysChange(newKeys);
  };

  const toggleVisibility = (provider: AIProvider) => {
    setVisibleKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const testApiKey = async (provider: AIProvider) => {
    const key = apiKeys[provider];
    if (!key) return;

    setTestResults(prev => ({ ...prev, [provider]: 'testing' }));

    try {
      // Simple test request based on provider
      let testResult = false;
      
      switch (provider) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${key}` }
          });
          testResult = openaiResponse.ok;
          break;
          
        case 'anthropic':
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'test' }]
            })
          });
          testResult = anthropicResponse.ok;
          break;
          
        case 'google':
          const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
          testResult = googleResponse.ok;
          break;
          
        case 'huggingface':
          const hfResponse = await fetch('https://api-inference.huggingface.co/models/gpt2', {
            headers: { 'Authorization': `Bearer ${key}` },
            method: 'POST',
            body: JSON.stringify({ inputs: 'test' })
          });
          testResult = hfResponse.ok;
          break;
      }

      setTestResults(prev => ({ 
        ...prev, 
        [provider]: testResult ? 'success' : 'error' 
      }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider]: 'error' }));
    }
  };

  const getTestResultIcon = (result: 'testing' | 'success' | 'error' | null) => {
    switch (result) {
      case 'testing':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            API keys are stored locally in your browser. For production use, consider using environment variables or a secure key management system.
          </AlertDescription>
        </Alert>

        {apiKeyConfigs.map((config) => (
          <div key={config.provider} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{config.name}</label>
                <Badge variant="outline" className="text-xs">
                  {config.provider}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(config.docUrl, '_blank')}
                  className="h-6 px-2"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                {getTestResultIcon(testResults[config.provider])}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={visibleKeys[config.provider] ? 'text' : 'password'}
                  placeholder={config.placeholder}
                  value={apiKeys[config.provider] || ''}
                  onChange={(e) => updateApiKey(config.provider, e.target.value)}
                  className="pr-8"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(config.provider)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleKeys[config.provider] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testApiKey(config.provider)}
                disabled={!apiKeys[config.provider] || testResults[config.provider] === 'testing'}
              >
                Test
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        ))}

        <div className="mt-6 p-3 bg-muted/30 rounded-md">
          <h4 className="text-sm font-medium mb-2">Environment Variables (.env)</h4>
          <div className="space-y-1 text-xs text-muted-foreground font-mono">
            {apiKeyConfigs.map((config) => (
              <div key={config.envVar}>{config.envVar}=your_api_key_here</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};