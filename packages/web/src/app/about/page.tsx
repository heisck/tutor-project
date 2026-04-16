import { InfoPage } from '@/components';

export default function AboutPage() {
  return (
    <InfoPage
      ctaHref="/features"
      ctaLabel="Explore the platform"
      description="Studium is aimed at learners who need more than summaries. The product is built around the idea that understanding should be measured through evidence, not assumed after one explanation."
      eyebrow="About Studium"
      sections={[
        {
          body: 'The platform combines document analysis, prerequisite-aware planning, retrieval-grounded tutoring, and session continuity so learners can move through complex material in a deliberate order.',
          title: 'What We Are Building',
        },
        {
          body: 'Instead of treating AI like a single chat box, the system keeps state, records mastery signals, and tracks what content has actually been covered. That makes it closer to a tutoring workflow than a generic assistant.',
          title: 'Why It Feels Different',
        },
      ]}
      title="AI tutoring that is structured, adaptive, and accountable."
    />
  );
}
