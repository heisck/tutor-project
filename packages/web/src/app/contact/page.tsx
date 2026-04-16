import { InfoPage } from '@/components';

export default function ContactPage() {
  return (
    <InfoPage
      ctaHref="/about"
      ctaLabel="Learn more about Studium"
      description="This project does not yet ship with a configured support inbox or contact form backend. Before launch, replace this page with your real support email, response policy, and escalation path."
      eyebrow="Contact"
      sections={[
        {
          body: 'For a hosted release, add your actual support address, help desk link, or contact workflow here so learners know where to report account, billing, or content issues.',
          title: 'Support Setup',
        },
        {
          body: 'If you are testing locally, the main readiness checkpoints are your database, Redis, document storage, background worker, and AI provider keys.',
          title: 'Local Testing',
        },
      ]}
      title="Support information should be finalized before launch."
    />
  );
}
