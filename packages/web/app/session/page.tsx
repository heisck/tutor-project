import type { Metadata } from 'next';

import { TutorSessionExperience } from '../../src/tutor-session-experience';
import { loadWebEnv } from '../../src/env';

export const metadata: Metadata = {
  title: 'AI Tutor PWA | Study Session',
  description:
    'Adaptive tutoring session surface with calibration, streamed explanations, and learner response submission.',
};

const env = loadWebEnv();

export default function SessionPage() {
  return <TutorSessionExperience apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL} />;
}
