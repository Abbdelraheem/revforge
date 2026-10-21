"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/components/ui/button";

export interface StepItem {
  id: number | string;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Background connecting bar */}
        <div className="absolute top-1/2 start-0 end-0 -translate-y-1/2 h-[1px] bg-border -z-0" />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group cursor-pointer"
              onClick={() => onStepClick?.(idx)}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full border flex items-center justify-center font-mono text-sm transition-colors",
                  isCompleted &&
                    "bg-primary text-primary-foreground border-primary",
                  isCurrent &&
                    "bg-background text-primary border-primary ring-2 ring-primary/20 font-bold",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-background text-muted-foreground border-border"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
              </div>

              <span
                className={cn(
                  "mt-2 text-sm font-medium text-center truncate max-w-[100px]",
                  isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
