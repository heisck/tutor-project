import UploadWorkspaceHost from './upload-workspace-host';

const pipelineStages = [
  {
    title: 'Structure preserved',
    description: 'Slides, pages, sections, and visual anchors stay attached to the material.',
  },
  {
    title: 'ATUs extracted',
    description: 'The system breaks notes into atomic teachable units instead of one generic summary.',
  },
  {
    title: 'Concept graph built',
    description: 'Prerequisites, misconceptions, and importance signals guide the teaching order.',
  },
  {
    title: 'Tutor-ready runtime',
    description: 'Coverage, retrieval, planning, and handoff memory become available for guided study.',
  },
];

const assurances = [
  'Private document pipeline',
  'Prerequisite-aware graph generation',
  'Coverage tracking before mastery',
  'Resume-ready session state',
];

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <article className="ui-panel ui-mesh overflow-hidden rounded-[34px] p-6 sm:p-8">
          <p className="ui-kicker">Content ingestion</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Turn raw study material into a tutor-ready concept map.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Upload slides, PDFs, and notes. TutorAI preserves structure, extracts ATUs, builds the concept
            graph, and prepares the runtime that drives adaptive teaching and mastery checks.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pipelineStages.map((stage) => (
              <article key={stage.title} className="ui-panel-muted rounded-[24px] p-5">
                <p className="ui-kicker">Pipeline stage</p>
                <h3 className="mt-3 text-lg font-semibold">{stage.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{stage.description}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="ui-panel rounded-[34px] p-6">
          <p className="ui-kicker">Ingestion assurances</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">What happens after upload</h3>
          <div className="mt-6 space-y-3">
            {assurances.map((item, index) => (
              <div key={item} className="ui-panel-muted flex gap-4 rounded-[22px] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary">
                  0{index + 1}
                </div>
                <p className="text-sm leading-6 text-foreground/92">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <UploadWorkspaceHost />
    </div>
  );
}
