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
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Free and fast' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Free tier available' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Free tier available' }
  ],
  huggingface: [
    { id: 'microsoft/DialoGPT-medium', name: 'DialoGPT Medium', description: 'Free conversational model' },
    { id: 'bigcode/starcoder2-3b', name: 'StarCoder2 3B', description: 'Free code model' },
    { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B', description: 'Free instruction model' }
  ],
  nvidia: [
    { id: 'microsoft/phi-3-mini-4k-instruct', name: 'Phi-3 Mini 4K', description: 'Free Microsoft model' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Free Meta model' },
    { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B', description: 'Free Mistral model' }
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