'use client';

import React, { useState } from 'react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type ModelType = 'model2' | 'model3';

interface ModelOption {
  id: ModelType;
  title: string;
  description: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'model2',
    title: 'Hydraulic Capacity Model',
    description:
      'Analyze drainage system capacity and flow rates under various conditions',
  },
  {
    id: 'model3',
    title: 'Infrastructure Health Model',
    description:
      'Assess structural integrity and maintenance requirements of drainage components',
  },
];

interface ModelSelectorProps {
  onModelSelect: (model: ModelType) => void;
}

export function ModelSelector({ onModelSelect }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(null);

  const handleConfirm = () => {
    if (selectedModel) {
      onModelSelect(selectedModel);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-between space-y-4 pt-3 pr-4 pb-5 pl-5">
      <div className="flex flex-col gap-2">
        <CardHeader className="mb-3 px-1 py-0">
          <CardTitle>Select Simulation Model</CardTitle>
          <CardDescription className="text-xs">
            Choose a simulation model to analyze your drainage system
          </CardDescription>
        </CardHeader>

        <RadioGroup
          value={selectedModel || ''}
          onValueChange={(value) => setSelectedModel(value as ModelType)}
          className="gap-4"
        >
          {MODEL_OPTIONS.map((model) => (
            <div key={model.id} className="relative">
              <RadioGroupItem
                value={model.id}
                id={model.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={model.id}
                className={cn(
                  'flex cursor-pointer rounded-lg border p-4 transition-all',
                  'hover:bg-accent hover:border-accent-foreground/20',
                  'peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50/50 dark:peer-data-[state=checked]:bg-blue-950/20',
                  selectedModel === model.id
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-border'
                )}
              >
                <div className="flex flex-1 flex-col space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all',
                        selectedModel === model.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-muted-foreground'
                      )}
                    >
                      {selectedModel === model.id && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-normal">{model.title}</span>
                  </div>
                  <p className="text-muted-foreground pl-6 text-xs font-normal">
                    {model.description}
                  </p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleConfirm}
          disabled={!selectedModel}
          className="flex-1"
        >
          Confirm Selection
        </Button>
      </div>
    </div>
  );
}
