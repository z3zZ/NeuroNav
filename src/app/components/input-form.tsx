import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

interface Subject {
  id: string;
  name: string;
  examDate: string;
}

interface FormData {
  subjects: Subject[];
  studyLength: string;
  energyLevel: string;
}

interface InputFormProps {
  onSubmit: (data: FormData) => void;
}

export function InputForm({ onSubmit }: InputFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [studyLength, setStudyLength] = useState('medium');
  const [energyLevel, setEnergyLevel] = useState('moderate');

  const addSubject = () => {
    if (currentSubject && currentDate) {
      setSubjects([
        ...subjects,
        {
          id: crypto.randomUUID(),
          name: currentSubject,
          examDate: currentDate,
        },
      ]);
      setCurrentSubject('');
      setCurrentDate('');
    }
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subjects.length > 0) {
      onSubmit({
        subjects,
        studyLength,
        energyLevel,
      });
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-8"
    >
      <h1 className="text-3xl mb-2">Plan Your Exams</h1>
      <p className="text-gray-600 mb-8">
        A simple, clear tool to organise your revision time
      </p>

      {/* Subject Input */}
      <div className="mb-8">
        <label htmlFor="subject" className="block text-lg mb-3">
          Add Subjects & Exam Dates
        </label>
        <div className="flex gap-3 mb-4">
          <input
            id="subject"
            type="text"
            placeholder="Subject name"
            value={currentSubject}
            onChange={(e) => setCurrentSubject(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none text-base"
            aria-label="Subject name"
          />
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none text-base"
            aria-label="Exam date"
          />
          <button
            type="button"
            onClick={addSubject}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            aria-label="Add subject"
          >
            <Plus size={20} />
            Add
          </button>
        </div>

        {/* Subject List */}
        {subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {subjects.map((subject) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">{subject.name}</span>
                  <span className="text-gray-600 ml-3">
                    Exam: {new Date(subject.examDate).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSubject(subject.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={`Remove ${subject.name}`}
                >
                  <X size={20} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Study Length */}
      <div className="mb-8">
        <label htmlFor="study-length" className="block text-lg mb-3">
          Preferred Study Session Length
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'short', label: '25 mins', desc: 'Quick focus' },
            { value: 'medium', label: '45 mins', desc: 'Balanced' },
            { value: 'long', label: '90 mins', desc: 'Deep work' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStudyLength(option.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                studyLength === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`Study length: ${option.label}`}
              aria-pressed={studyLength === option.value}
            >
              <div className="text-lg font-medium">{option.label}</div>
              <div className="text-sm text-gray-600">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Energy Level */}
      <div className="mb-8">
        <label htmlFor="energy-level" className="block text-lg mb-3">
          Your Focus & Energy Level
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'low', label: 'Low Energy', desc: 'Need it gentle' },
            { value: 'moderate', label: 'Moderate', desc: 'Steady pace' },
            { value: 'high', label: 'High Energy', desc: 'Ready to push' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setEnergyLevel(option.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                energyLevel === option.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`Energy level: ${option.label}`}
              aria-pressed={energyLevel === option.value}
            >
              <div className="text-lg font-medium">{option.label}</div>
              <div className="text-sm text-gray-600">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={subjects.length === 0}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 rounded-lg text-lg font-medium transition-all ${
          subjects.length === 0
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
        }`}
      >
        Generate My Plan
      </motion.button>
    </motion.form>
  );
}
