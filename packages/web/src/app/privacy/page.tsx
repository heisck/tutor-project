import { InfoPage } from '@/components';

export default function PrivacyPage() {
  return (
    <InfoPage
      ctaHref="/signup"
      ctaLabel="Return to signup"
      description="This page explains the current data flow in straightforward terms for local and pre-launch environments. Replace it with your final hosted privacy policy before going live."
      eyebrow="Privacy"
      sections={[
        {
          body: 'The app stores account data, uploaded study documents, session state, and progress information so it can restore learning context and generate grounded tutoring sessions.',
          title: 'What Is Stored',
        },
        {
          body: 'Depending on configuration, uploaded content may be sent to connected AI providers for extraction, analysis, embeddings, and tutoring-related responses. File storage and background processing also depend on the services configured in your environment.',
          title: 'Third-Party Processing',
        },
        {
          body: 'Before launch, make sure your deployed version lists the exact providers, retention rules, and contact details that apply to your hosted environment.',
          title: 'Before You Host',
        },
      ]}
      title="How learner and document data are handled."
    />
  );
}
