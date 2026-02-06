import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Onboarding } from './components/onboarding';
import { WowMoment } from './components/wow-moment';
import { StudyPlanEnhanced } from './components/study-plan-enhanced';
import { AccessibilityControls } from './components/accessibility-controls';
import { FocusMode } from './components/focus-mode';
import { Reflection, ReflectionData } from './components/reflection';

interface Subject {
  id: string;
  name: string;
  examDate: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  energyDrain: 'low' | 'medium' | 'high';
}

interface OnboardingData {
  subjects: Subject[];
  dailyEnergy: number;
  sessionLength: 'short' | 'medium' | 'long';
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
}

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  contrast: 'normal' | 'high';
  spacing: 'normal' | 'relaxed' | 'loose';
  font: 'default' | 'dyslexia' | 'mono';
  reducedMotion: boolean;
}

type AppState =
  | 'onboarding'
  | 'wow-moment'
  | 'plan'
  | 'focus'
  | 'reflection';

export default function App() {
  // Load saved data from localStorage on mount
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('neuronav_state');
    return (saved as AppState) || 'onboarding';
  });

  const [planData, setPlanData] = useState<OnboardingData | null>(() => {
    const saved = localStorage.getItem('neuronav_plan');
    return saved ? JSON.parse(saved) : null;
  });

  const [a11ySettings, setA11ySettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('neuronav_accessibility');
    return saved ? JSON.parse(saved) : {
      fontSize: 'normal',
      contrast: 'normal',
      spacing: 'normal',
      font: 'default',
      reducedMotion: false,
    };
  });

  const [focusTask, setFocusTask] = useState<any>(null);

  const [reflectionData, setReflectionData] = useState<ReflectionData[]>(() => {
    const saved = localStorage.getItem('neuronav_reflections');
    return saved ? JSON.parse(saved) : [];
  });

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    if (state !== 'wow-moment') {
      localStorage.setItem('neuronav_state', state);
    }
  }, [state]);

  useEffect(() => {
    if (planData) {
      localStorage.setItem('neuronav_plan', JSON.stringify(planData));
    }
  }, [planData]);

  useEffect(() => {
    localStorage.setItem('neuronav_accessibility', JSON.stringify(a11ySettings));
  }, [a11ySettings]);

  useEffect(() => {
    if (reflectionData.length > 0) {
      localStorage.setItem('neuronav_reflections', JSON.stringify(reflectionData));
    }
  }, [reflectionData]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setPlanData(data);
    setState('wow-moment');
  };

  const handleWowMomentComplete = () => {
    setState('plan');
  };

  const handleReset = () => {
    // Clear all saved data
    localStorage.removeItem('neuronav_state');
    localStorage.removeItem('neuronav_plan');
    localStorage.removeItem('neuronav_reflections');
    setState('onboarding');
    setPlanData(null);
    setReflectionData([]);
  };

  const handleFocusMode = (task: any) => {
    setFocusTask(task);
    setState('focus');
  };

  const handleFocusComplete = () => {
    setState('reflection');
  };

  const handleFocusExit = () => {
    setState('plan');
    setFocusTask(null);
  };

  const handleReflectionComplete = (data: ReflectionData) => {
    setReflectionData([...reflectionData, data]);
    setState('plan');
    setFocusTask(null);
  };

  const handleReflectionSkip = () => {
    setState('plan');
    setFocusTask(null);
  };

  // Apply accessibility settings
  const getFontSizeClass = () => {
    switch (a11ySettings.fontSize) {
      case 'large':
        return 'text-lg';
      case 'xlarge':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  const getSpacingClass = () => {
    switch (a11ySettings.spacing) {
      case 'relaxed':
        return 'leading-relaxed';
      case 'loose':
        return 'leading-loose';
      default:
        return 'leading-normal';
    }
  };

  const getFontFamilyClass = () => {
    switch (a11ySettings.font) {
      case 'dyslexia':
        return 'font-[OpenDyslexic,sans-serif]';
      case 'mono':
        return 'font-mono';
      default:
        return 'font-sans';
    }
  };

  const getContrastClass = () => {
    return a11ySettings.contrast === 'high' ? 'high-contrast' : '';
  };

  const getMotionClass = () => {
    return a11ySettings.reducedMotion ? 'reduce-motion' : '';
  };

  return (
    <div
      className={`min-h-screen ${getFontSizeClass()} ${getSpacingClass()} ${getFontFamilyClass()} ${getContrastClass()} ${getMotionClass()}`}
    >
      <AnimatePresence mode="wait">
        {state === 'onboarding' && (
          <div key="onboarding" className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <Onboarding onComplete={handleOnboardingComplete} />
          </div>
        )}

        {state === 'wow-moment' && (
          <WowMoment key="wow" onComplete={handleWowMomentComplete} />
        )}

        {state === 'plan' && planData && (
          <div key="plan" className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
            <StudyPlanEnhanced data={planData} onReset={handleReset} />
          </div>
        )}

        {state === 'focus' && focusTask && (
          <FocusMode
            key="focus"
            task={focusTask}
            onComplete={handleFocusComplete}
            onExit={handleFocusExit}
          />
        )}

        {state === 'reflection' && (
          <div key="reflection" className="bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen flex items-center">
            <Reflection
              onComplete={handleReflectionComplete}
              onSkip={handleReflectionSkip}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Accessibility Controls (visible on most screens) */}
      {state !== 'wow-moment' && state !== 'focus' && (
        <AccessibilityControls
          settings={a11ySettings}
          onChange={setA11ySettings}
        />
      )}

      {/* Global Styles for Accessibility */}
      <style>{`
        /* High Contrast Mode */
        .high-contrast {
          --tw-gradient-from: #000 !important;
          --tw-gradient-to: #fff !important;
        }
        
        .high-contrast .bg-gradient-to-br,
        .high-contrast .bg-gradient-to-r {
          background: #fff !important;
        }
        
        .high-contrast input,
        .high-contrast button,
        .high-contrast select {
          border-width: 3px !important;
        }
        
        .high-contrast .text-gray-600,
        .high-contrast .text-gray-700 {
          color: #000 !important;
        }
        
        .high-contrast .bg-gray-50 {
          background: #fff !important;
          border: 2px solid #000 !important;
        }

        .high-contrast .border-gray-200 {
          border-color: #000 !important;
        }

        /* Reduced Motion */
        .reduce-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* Dyslexia-Friendly Font */
        @font-face {
          font-family: 'OpenDyslexic';
          src: local('OpenDyslexic');
          font-display: swap;
        }

        /* Print Styles */
        @media print {
          .no-print,
          button,
          .fixed {
            display: none !important;
          }
          
          * {
            color: #000 !important;
            background: #fff !important;
          }
          
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            background: #fff !important;
          }
        }

        /* Focus Visible for Keyboard Navigation */
        *:focus-visible {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}