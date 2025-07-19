import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ModelSelectorProps {
  selectedProvider: 'gemini' | 'huggingface' | 'nvidia';
  selectedModel: string;
  onProviderChange: (provider: 'gemini' | 'huggingface' | 'nvidia') => void;
  onModelChange: (model: string) => void;
}

const AI_MODELS = {
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Reliable performance' }
  ],
  huggingface: [
    { id: 'microsoft/DialoGPT-large', name: 'DialoGPT Large', description: 'Conversational AI' },
    { id: 'microsoft/CodeBERT-base', name: 'CodeBERT', description: 'Code generation' },
    { id: 'codellama/CodeLlama-34b-Instruct-hf', name: 'CodeLlama 34B', description: 'Code specialized' }
  ],
  nvidia: [
    { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B Instruct', description: 'Most capable NVIDIA model' },
    { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', description: 'Powerful reasoning' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', description: 'Fast and efficient' }
  ]
};

export function ModelSelector({ selectedProvider, selectedModel, onProviderChange, onModelChange }: ModelSelectorProps) {
  const availableModels = AI_MODELS[selectedProvider] || [];

  const handleProviderChange = (provider: string) => {
    onProviderChange(provider as 'gemini' | 'huggingface' | 'nvidia');
    // Set default model for the new provider
    const defaultModel = AI_MODELS[provider as 'gemini' | 'huggingface' | 'nvidia']?.[0]?.id;
    if (defaultModel) {
      onModelChange(defaultModel);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="provider">AI Provider</Label>
        <Select value={selectedProvider} onValueChange={handleProviderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">Google Gemini</SelectItem>
            <SelectItem value="huggingface">Hugging Face</SelectItem>
            <SelectItem value="nvidia">NVIDIA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="model">Model</Label>
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div>
                  <div className="font-medium">{model.name}</div>
                  <div className="text-sm text-muted-foreground">{model.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}