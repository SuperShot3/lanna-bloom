import { LineIcon } from '@/components/icons/LineIcon';
import { getLineContactUrl } from '@/lib/messenger';

export function LineFloatingButton() {
  return (
    <div
      className="
        fixed right-4 z-[95]
        bottom-[calc(6rem+env(safe-area-inset-bottom,0px))]
        md:right-6 md:bottom-6
      "
    >
      <div className="group relative">
        {/* Desktop tooltip */}
        <div
          className="
            pointer-events-none absolute bottom-full right-0 mb-2 hidden md:block
            translate-y-1 opacity-0 transition
            group-hover:translate-y-0 group-hover:opacity-100
          "
          aria-hidden
        >
          <div className="rounded-md bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            Contact us on LINE
          </div>
        </div>

        <a
          href={getLineContactUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on LINE"
          className="
            relative inline-flex items-center justify-center
            rounded-full overflow-hidden
            bg-[#06C755] text-white
            ring-1 ring-black/10
            shadow-[0_14px_26px_rgba(0,0,0,0.22),0_3px_0_rgba(0,0,0,0.12)]
            after:content-[''] after:absolute after:inset-[2px] after:rounded-full after:pointer-events-none
            after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),inset_0_-10px_18px_rgba(0,0,0,0.16)]
            transition-transform transition-shadow duration-200 ease-out
            before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-white/20
            before:scale-0 before:opacity-0 before:transition before:duration-300
            hover:scale-[1.06] hover:shadow-[0_18px_34px_rgba(0,0,0,0.24),0_3px_0_rgba(0,0,0,0.12)]
            hover:before:scale-[1.8] hover:before:opacity-100
            focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#06C755]/30
            active:scale-[0.95] active:translate-y-[1px]
            active:shadow-[0_10px_20px_rgba(0,0,0,0.20),0_1px_0_rgba(0,0,0,0.10)]
            h-12 w-12 sm:h-13 sm:w-13 md:h-14 md:w-14
          "
        >
          <span className="relative inline-flex items-center justify-center">
            <LineIcon className="h-6 w-6" />
          </span>
          <span className="sr-only">Chat with us on LINE</span>
        </a>
      </div>
    </div>
  );
}

