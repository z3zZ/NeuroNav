import { useId, useState } from 'react';

export const SUBJECT_NAMES = [
  'Computing',
  'Biology',
  'Maths',
  'History',
  'Chemistry',
  'Physics',
  'English Language',
  'English Literature',
  'Geography',
  'Psychology',
  'Business',
  'Economics',
  'Art & Design',
  'French',
  'Spanish',
  'German',
  'Music',
  'Religious Studies',
  'Sociology',
  'Physical Education',
];

/** Existing custom names stay custom; choosing Other never creates a subject called Other. */
export function SubjectPicker({
  value,
  onChange,
  error,
  id: suppliedId,
}: {
  value: string;
  onChange: (name: string) => void;
  error?: string;
  id?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [other, setOther] = useState(!!value && !SUBJECT_NAMES.includes(value));
  const custom = other || (!!value && !SUBJECT_NAMES.includes(value));
  return (
    <div className="stack">
      <div className="field">
        <label className="label" htmlFor={id}>
          Subject
        </label>
        <select
          id={id}
          className="select"
          value={custom ? 'other' : value}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setOther(e.target.value === 'other');
            onChange(e.target.value === 'other' ? '' : e.target.value);
          }}
        >
          <option value="">Choose a subject</option>
          {SUBJECT_NAMES.map((name) => (
            <option key={name}>{name}</option>
          ))}
          <option value="other">Other — enter your own</option>
        </select>
      </div>
      {custom && (
        <div className="field">
          <label className="label" htmlFor={`${id}-custom`}>
            Custom subject name
          </label>
          <input
            id={`${id}-custom`}
            className="input"
            value={value}
            maxLength={100}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
      )}
      {error && (
        <p className="error-text" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
