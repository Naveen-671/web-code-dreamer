import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AI_MODELS, AIProvider } from '@/lib/ai-providers';
import { Brain, Zap, Shield, Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  selectedProvider: AIProvider;
  selectedModel: string;
  onProviderChange: (provider: AIProvider) => void;
  onModelChange: (model: string) => void;
}

const providerInfo = {
  openai: {
    name: 'OpenAI',
    icon: Brain,
    color: 'bg-emerald-500',
    description: 'Industry-leading language models'
  },
  anthropic: {
    name: 'Anthropic',
    icon: Shield,
    color: 'bg-orange-500',
    description: 'Safe and helpful AI assistant'
  },
  google: {
    name: 'Google',
    icon: Sparkles,
    color: 'bg-blue-500',
    description: 'Advanced multimodal capabilities'
  },
  huggingface: {
    name: 'Hugging Face',
    icon: Zap,
    color: 'bg-yellow-500',
    description: 'Open-source AI models'
  }
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange
}) => {
  const currentModels = AI_MODELS[selectedProvider] || [];
  const currentModel = currentModels.find(m => m.id === selectedModel);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">AI Model Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Provider</label>
          <Select value={selectedProvider} onValueChange={onProviderChange}>
            <SelectTrigger className="h-8">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {React.createElement(providerInfo[selectedProvider].icon, { 
                    className: "h-4 w-4" 
                  })}
                  <span>{providerInfo[selectedProvider].name}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(providerInfo).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {React.createElement(info.icon, { className: "h-4 w-4" })}
                    <div>
                      <div className="font-medium">{info.name}</div>
                      <div className="text-xs text-muted-foreground">{info.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Model</label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="h-8">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span>{currentModel?.name || 'Select model'}</span>
                  {currentModel && (
                    <Badge variant="secondary" className="text-xs">
                      {currentModel.description}
                    </Badge>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {currentModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-muted-foreground">{model.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Selection Info */}
        {currentModel && (
          <div className="p-3 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${providerInfo[selectedProvider].color}`} />
              <span className="text-xs font-medium">{providerInfo[selectedProvider].name} • {currentModel.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{currentModel.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};