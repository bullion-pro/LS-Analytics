import { Heart, MessageCircle as CommentIcon, Share2 } from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  ThreadsIcon,
  type SocialIconProps,
} from "@/components/charts/PlatformEngagementBars";
import type { SocialPlatform } from "@/mock/engagement";
import type { ComponentType } from "react";

const PLATFORM_ICON: Record<SocialPlatform, ComponentType<SocialIconProps>> = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  Threads: ThreadsIcon,
};
const PLATFORM_TINT: Record<SocialPlatform, string> = {
  Instagram: "bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]",
  Facebook: "bg-[var(--color-seq-100)] text-[var(--color-seq-600)]",
  Threads: "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]",
};

interface FeedPost {
  id: string;
  platform: SocialPlatform;
  caption: string;
  monthLabel: string;
  likes: number;
  comments: number;
  shares: number;
}

/** Named, dated posts with their real engagement numbers — the concrete texture underneath the
 *  heatmap rollup, same pattern as ActivityFeed elsewhere in the app. */
export function SocialPostFeed({ posts }: { posts: FeedPost[] }) {
  return (
    <div className="flex flex-col">
      {posts.map((p, i) => {
        const Icon = PLATFORM_ICON[p.platform];
        return (
          <div key={p.id} className={`flex items-start gap-3 py-3 ${i !== posts.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${PLATFORM_TINT[p.platform]}`}>
              <Icon size={14} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium leading-snug text-[var(--color-ink)]">{p.caption}</p>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-label text-[11px] text-[var(--color-ink-muted)]">
                  {p.platform} · {p.monthLabel}
                </span>
                <span className="flex items-center gap-3 font-label text-[11px] text-[var(--color-ink-secondary)]">
                  <span className="flex items-center gap-1">
                    <Heart size={11} strokeWidth={2} /> {p.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <CommentIcon size={11} strokeWidth={2} /> {p.comments.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 size={11} strokeWidth={2} /> {p.shares.toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
