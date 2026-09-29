import { describeExam } from '../lib/dates';
import { SUBJECT_IMAGE_FILES, subjectImageKey } from '../lib/selectors';
import type { Subject } from '../lib/types';
import { useData } from '../state/data';
import { useSettings } from '../state/settings';
import { DecorativeImage } from './DecorativeImage';

/**
 * The heading link stretches over the whole card, so the card is one tab stop
 * with a name taken from the live heading. No nested buttons.
 */
export function SubjectCard({ subject, headingLevel = 3 }: { subject: Subject; headingLevel?: 2 | 3 }) {
  const { data } = useData();
  const { effective } = useSettings();
  const key = subjectImageKey(subject);
  const openTasks = data.tasks.filter((t) => t.subjectId === subject.id && !t.done).length;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const topicCount = subject.topics.length;

  return (
    <li className="subject-card">
      <div className="subject-card__media" data-colour={subject.colour} data-pattern={key ?? 'plain'}>
        {key && effective.showImagery && (
          <DecorativeImage
            name={SUBJECT_IMAGE_FILES[key]}
            widths={[320, 640]}
            sizes="(max-width: 479px) 96px, (max-width: 1199px) 45vw, 240px"
            width={320}
            height={320}
          />
        )}
      </div>
      <div className="subject-card__body">
        <Heading className="subject-card__title">
          <a href={`#/subjects/${subject.id}`}>{subject.name}</a>
        </Heading>
        <p className="subject-card__meta">
          {topicCount} {topicCount === 1 ? 'topic' : 'topics'} · {openTasks} {openTasks === 1 ? 'task' : 'tasks'} to do
        </p>
        <p className="subject-card__meta">{describeExam(subject.examDate)}</p>
        <span className="subject-card__cta" aria-hidden="true">
          Open subject →
        </span>
      </div>
    </li>
  );
}
