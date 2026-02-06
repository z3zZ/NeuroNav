import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Type, Palette, Maximize2, ChevronDown, Zap } from 'lucide-react';

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  contrast: 'normal' | 'high';
  spacing: 'normal' | 'relaxed' | 'loose';
  font: 'default' | 'dyslexia' | 'mono';
  reducedMotion: boolean;
}

interface AccessibilityControlsProps {
  settings: AccessibilitySettings;
  onChange: (settings: AccessibilitySettings) => void;
}

export function AccessibilityControls({
  settings,
  onChange,
}: AccessibilityControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-6 w-80 max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Settings size={20} />
              Accessibility Settings
            </h3>

            {/* Font Family */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                <Type size={18} />
                Font Style
              </label>
              <div className="space-y-2">
                {[
                  { value: 'default', label: 'Default', desc: 'Standard font' },
                  { value: 'dyslexia', label: 'OpenDyslexic', desc: 'Easier to read' },
                  { value: 'mono', label: 'Monospace', desc: 'Fixed-width' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateSetting(
                        'font',
                        option.value as AccessibilitySettings['font']
                      )
                    }
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-sm text-left ${
                      settings.font === option.value
                        ? 'border-blue-500 bg-blue-50 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label={`Font: ${option.label}`}
                    aria-pressed={settings.font === option.value}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                <Type size={18} />
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'normal', label: 'Normal' },
                  { value: 'large', label: 'Large' },
                  { value: 'xlarge', label: 'X-Large' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateSetting(
                        'fontSize',
                        option.value as AccessibilitySettings['fontSize']
                      )
                    }
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                      settings.fontSize === option.value
                        ? 'border-blue-500 bg-blue-50 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label={`Font size: ${option.label}`}
                    aria-pressed={settings.fontSize === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contrast */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                <Palette size={18} />
                Contrast
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High Contrast' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateSetting(
                        'contrast',
                        option.value as AccessibilitySettings['contrast']
                      )
                    }
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                      settings.contrast === option.value
                        ? 'border-blue-500 bg-blue-50 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label={`Contrast: ${option.label}`}
                    aria-pressed={settings.contrast === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                <Maximize2 size={18} />
                Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'normal', label: 'Normal' },
                  { value: 'relaxed', label: 'Relaxed' },
                  { value: 'loose', label: 'Loose' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateSetting(
                        'spacing',
                        option.value as AccessibilitySettings['spacing']
                      )
                    }
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                      settings.spacing === option.value
                        ? 'border-blue-500 bg-blue-50 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label={`Spacing: ${option.label}`}
                    aria-pressed={settings.spacing === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reduced Motion */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Zap size={18} />
                  <span className="text-sm font-medium">Reduce Motion</span>
                </div>
                <button
                  onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.reducedMotion ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle reduced motion"
                  aria-pressed={settings.reducedMotion}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Minimises animations and transitions
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
        aria-label="Toggle accessibility settings"
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown size={24} /> : <Settings size={24} />}
      </motion.button>
    </div>
  );
}