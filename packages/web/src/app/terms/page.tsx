import { InfoPage } from '@/components';

export default function TermsPage() {
  return (
    <InfoPage
      ctaHref="/signup"
      ctaLabel="Back to signup"
      description="These terms are a plain-language starter policy for local and pre-launch environments. Replace them with your final legal copy before public launch."
      eyebrow="Terms"
      sections={[
        {
          body: 'Use the app only for lawful educational purposes and only with study materials you have the right to upload. Do not rely on the system as a substitute for professional legal, medical, or safety-critical advice.',
          title: 'Acceptable Use',
        },
        {
          body: 'Uploaded content, generated teaching plans, and session records may be processed by connected AI and storage services configured by the deployment owner. Review and update your provider agreements before launching publicly.',
          title: 'Processing and Services',
        },
        {
          body: 'This local project is provided as-is until you harden it for production and publish final legal terms for your hosted deployment.',
          title: 'Pre-Launch Status',
        },
      ]}
      title="Study use terms for this deployment."
    />
  );
}
