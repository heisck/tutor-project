import { InfoPage } from '@/components';

export default function HowItWorksPage() {
  return (
    <InfoPage
      ctaHref="/signup"
      ctaLabel="Create an account"
      description="The workflow is designed to move from raw study material to structured learning, then from guided teaching to verified understanding."
      eyebrow="How It Works"
      sections={[
        {
          body: 'Upload the study material you want to learn from. Supported formats go through validation first so the system can reserve an upload, store the file, and create a document record safely.',
          title: '1. Upload',
        },
        {
          body: 'The document engine extracts text and structure, creates source units and chunks, generates atomic teachable units, builds a concept graph, and initializes the coverage ledger that tracks what has or has not been taught.',
          title: '2. Process',
        },
        {
          body: 'Start a session on a processed document, choose a study mode, and calibrate the explanation style. The planner orders concepts by prerequisite and prepares lesson segments with checks and mastery gates.',
          title: '3. Learn',
        },
        {
          body: 'As the learner answers or asks questions, the tutor updates mastery state, coverage progress, and handoff data. Sessions can be paused, resumed, and continued without losing context.',
          title: '4. Verify and Resume',
        },
      ]}
      title="From source material to adaptive tutoring."
    />
  );
}
