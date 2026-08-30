'use client'

import { ReactNode } from 'react'

interface BookingStepProps {
  step: number
  currentStep: number
  title: string
  children: ReactNode
  onBack?: () => void
}

export function BookingStep({
  step,
  currentStep,
  title,
  children,
  onBack,
}: BookingStepProps) {
  if (step !== currentStep) return null

  return (
    <div className="animate-fade-in">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>
      )}
      
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
            {step}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
