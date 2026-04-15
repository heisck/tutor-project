'use client';

import { useEffect, useState } from 'react';

import UploadWorkspace from './upload-workspace';

function UploadWorkspaceSkeleton() {
  return (
    <section className="ui-panel rounded-[32px] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">Preparing workspace</p>
          <h3 className="mt-2 text-lg font-semibold">Loading client tools</h3>
        </div>
        <span className="ui-chip">Upload shell</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_320px]">
        <div className="rounded-[28px] border border-dashed border-border/70 bg-muted/20 p-8">
          <div className="h-7 w-40 rounded-full bg-white/8" />
          <div className="mt-4 h-14 rounded-[22px] bg-white/6" />
          <div className="mt-3 h-14 rounded-[22px] bg-white/5" />
        </div>
        <div className="space-y-3">
          <div className="rounded-[22px] bg-white/6 p-5">
            <div className="h-5 w-28 rounded-full bg-white/8" />
            <div className="mt-4 h-2 rounded-full bg-white/8" />
          </div>
          <div className="rounded-[22px] bg-white/6 p-5">
            <div className="h-5 w-36 rounded-full bg-white/8" />
            <div className="mt-4 h-12 rounded-[18px] bg-white/7" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function UploadWorkspaceHost() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <UploadWorkspaceSkeleton />;
  }

  return <UploadWorkspace />;
}
