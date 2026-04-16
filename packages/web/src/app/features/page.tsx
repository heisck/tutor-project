import { InfoPage } from '@/components';

export default function FeaturesPage() {
  return (
    <InfoPage
      ctaHref="/signup"
      ctaLabel="Start learning free"
      description="Studium is built to turn uploaded study material into an adaptive teaching experience that tracks coverage, checks understanding, and keeps sessions grounded in the source document."
      eyebrow="Product Features"
      sections={[
        {
          body: 'Upload PDFs, slide decks, notes, and documents. The platform extracts structure, turns material into teachable units, builds concepts and prerequisites, and prepares a session plan that stays tied to the source.',
          title: 'Document Intelligence',
        },
        {
          body: 'Sessions are designed to move in order, keep prerequisite concepts intact, and avoid the usual AI habit of skipping steps. The tutor can answer grounded questions, give hints, ask follow-ups, and keep a session summary for continuity.',
          title: 'Adaptive Tutoring',
        },
        {
          body: 'The learning engine tracks mastery evidence, confusion signals, unresolved teachable units, and readiness estimates. Progress is saved so the learner can pause, resume, and continue from the right concept instead of starting over.',
          title: 'Mastery Tracking',
        },
      ]}
      title="A learning system, not just an answer box."
    />
  );
}
