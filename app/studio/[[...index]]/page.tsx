'use client';

import { Studio } from 'sanity';
import config from '@/sanity.config';

export default function StudioPage() {
  return (
    <div className="studio-wrapper">
      <Studio config={config} />
      <style jsx>{`
        .studio-wrapper {
          height: 100vh;
          max-height: 100dvh;
          overflow: auto;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}
