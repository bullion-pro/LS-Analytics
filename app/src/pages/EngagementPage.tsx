import { MessageCircle, Users, CheckCircle2, ShieldCheck, Bot } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroBand } from "@/components/layout/HeroBand";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { AwaitingReplyList } from "@/components/ui/AwaitingReplyList";
import { SocialPostFeed } from "@/components/ui/SocialPostFeed";
import { BroadcastCampaignList } from "@/components/charts/BroadcastCampaignList";
import { CompositionBar } from "@/components/charts/CompositionBar";
import { TrendLine } from "@/components/charts/TrendLine";
import { TargetMeter } from "@/components/charts/TargetMeter";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { RankedBar } from "@/components/charts/RankedBar";
import { PlatformEngagementBars } from "@/components/charts/PlatformEngagementBars";
import { chartColors } from "@/components/charts/chartColors";
import { useFilters, type BranchFilter } from "@/store/filters";
import { useMockQuery } from "@/lib/useMockQuery";
import { PERIOD_PRESETS, monthsForPeriod, type PeriodPreset } from "@/mock/calendar";
import { BRANCHES } from "@/mock/dimensions";
import { priorComparableMonths } from "@/mock/derive";
import {
  engagementHeroTotals,
  activeConversationsAsOfDaysAgo,
  responseTimeTrendYoY,
  resolutionRateVsTarget,
  conversationsAwaitingReply,
  messageMixByCategory,
  broadcastCampaigns,
  broadcastInsight,
  flowCompletionSummary,
  flowDropOffRanking,
  socialFollowerSnapshot,
  platformEngagementSummary,
  topSocialPosts,
  FLOW_NAME,
} from "@/mock/engagement";
import { computeDelta, formatNumber, formatPct } from "@/lib/format";

const formatMinutes = (v: number) => `${v.toFixed(1)}m`;
const formatCount = (v: number) => formatNumber(Math.round(v));

function buildEngagement(period: PeriodPreset, branch: BranchFilter) {
  const months = monthsForPeriod(period);
  const priorMonths = priorComparableMonths(months);
  const priorLabel = months.length === 1 ? "last month" : "prior period";

  const hero = engagementHeroTotals(months, branch);
  const activePrior30d = activeConversationsAsOfDaysAgo(branch, 30);
  const activeDelta = computeDelta(hero.activeCount, activePrior30d, "30 days ago");

  const priorHero = priorMonths.length ? engagementHeroTotals(priorMonths, branch) : undefined;
  const responseDelta = priorHero ? computeDelta(hero.avgFirstResponseMinutes, priorHero.avgFirstResponseMinutes, priorLabel, false) : undefined;
  const resolutionDelta = priorHero ? computeDelta(hero.resolutionRatePct, priorHero.resolutionRatePct, priorLabel) : undefined;

  const responseTrend = responseTimeTrendYoY(branch);
  const resolutionTarget = resolutionRateVsTarget(months, branch);
  const attention = conversationsAwaitingReply(branch, 6);

  const messageMix = messageMixByCategory(months, branch);
  const campaigns = broadcastCampaigns(months, branch, { good: chartColors.good, warning: chartColors.warning, critical: chartColors.critical }, 5);
  const campaignInsight = broadcastInsight(months, branch);

  const flowSummary = flowCompletionSummary(branch);
  const flowDropOff = flowDropOffRanking(branch);

  const followers = socialFollowerSnapshot();
  const platformSummary = platformEngagementSummary(months);
  const topPosts = topSocialPosts(months, 6);

  const engagementLeader = [...platformSummary].sort((a, b) => b.avgTotal - a.avgTotal)[0];
  const deepestEngagement = [...platformSummary].sort(
    (a, b) => (b.avgComments + b.avgShares) / (b.avgTotal || 1) - (a.avgComments + a.avgShares) / (a.avgTotal || 1),
  )[0];

  return {
    periodMonths: months,
    priorLabel,
    hero,
    activeDelta,
    responseDelta,
    resolutionDelta,
    responseTrend,
    resolutionTarget,
    attention,
    messageMix,
    campaigns,
    campaignInsight,
    flowSummary,
    flowDropOff,
    followers,
    platformSummary,
    engagementLeader,
    deepestEngagement,
    topPosts,
  };
}

export function EngagementPage() {
  const period = useFilters((s) => s.period);
  const branch = useFilters((s) => s.branch);
  const periodLabel = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "";
  const branchLabel = branch === "all" ? "All Branches" : (BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches");

  const { data, isPending, isPlaceholderData } = useMockQuery(["engagement", period, branch], () => buildEngagement(period, branch));

  return (
    <>
      <TopBar title="Engagement" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        {/* ── Tier 1: how healthy is the conversation channel right now ── */}
        <HeroBand>
          {isPending || !data ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="font-label text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-on-obsidian)]">
                  Avg. First Response Time &middot; {periodLabel}
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <AnimatedNumber
                    value={data.hero.avgFirstResponseMinutes}
                    format={formatMinutes}
                    className="text-[50px] font-semibold leading-none tracking-[-0.02em] text-white"
                  />
                  {data.responseDelta && <DeltaPill delta={data.responseDelta} tone="dark" />}
                </div>
                {data.responseDelta && <p className="mt-1.5 font-label text-[12px] text-[var(--color-on-obsidian-muted)]">{data.responseDelta.label}</p>}

                <p className="mt-5 max-w-md text-[13px] leading-relaxed text-[var(--color-on-obsidian-secondary)]">
                  <span className="font-semibold text-white">{formatNumber(data.hero.activeCount)}</span> conversations are open or
                  awaiting a reply right now. <span className="font-semibold text-white">{formatPct(data.hero.resolutionRatePct, 0)}</span>{" "}
                  of conversations started {periodLabel.toLowerCase()} have been resolved, and{" "}
                  <span className="font-semibold text-white">{formatPct(data.hero.optedInSharePct, 0)}</span> of contacts are
                  opted in for marketing messages.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 lg:w-auto lg:min-w-[420px]">
                <StatTile
                  tone="dark"
                  label="Active Conversations"
                  value={formatNumber(data.hero.activeCount)}
                  numeric={{ raw: data.hero.activeCount, format: formatNumber }}
                  delta={data.activeDelta}
                  icon={MessageCircle}
                />
                <StatTile
                  tone="dark"
                  label="Resolution Rate"
                  value={formatPct(data.hero.resolutionRatePct, 0)}
                  numeric={{ raw: data.hero.resolutionRatePct, format: (v) => formatPct(v, 0) }}
                  delta={data.resolutionDelta}
                  icon={CheckCircle2}
                />
                <StatTile
                  tone="dark"
                  label="Opted-in Contacts"
                  value={formatPct(data.hero.optedInSharePct, 0)}
                  numeric={{ raw: data.hero.optedInSharePct, format: (v) => formatPct(v, 0) }}
                  deltaCaption={periodLabel}
                  icon={ShieldCheck}
                />
              </div>
            </div>
          )}
        </HeroBand>

        {/* ── Tier 2: reach — which campaigns land, and what kind of messaging we're sending ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Broadcast campaigns" subtitle={`Delivery & read status by campaign · ${periodLabel.toLowerCase()}`} />
            {!data ? (
              <ChartSkeleton height={260} />
            ) : (
              <>
                <BroadcastCampaignList campaigns={data.campaigns} />
                {data.campaignInsight.campaignCount > 0 && (
                  <div className="mt-4">
                    <InsightCallout
                      tone={data.campaignInsight.failedSkippedSharePct > 0.08 ? "warning" : "accent"}
                      text={`${formatPct(data.campaignInsight.failedSkippedSharePct, 0)} of broadcast sends across ${data.campaignInsight.campaignCount} campaigns failed or were skipped this period, mostly for "${data.campaignInsight.topReason}."`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Message mix" subtitle="By pricing category, this period" />
            {!data ? <ChartSkeleton height={160} /> : <CompositionBar data={data.messageMix} valueFormatter={formatCount} />}
          </Card>
        </section>

        {/* ── Tier 3: service quality — is the desk keeping up ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="First response time" subtitle="Last 12 months, vs. the same months last year" />
            {!data ? <ChartSkeleton /> : <TrendLine data={data.responseTrend} currentLabel="This year" priorLabel="Last year" valueFormatter={formatMinutes} />}
          </Card>
          <Card>
            <CardHeader title="Resolution rate" subtitle={`Vs. a 90% SLA target · ${periodLabel.toLowerCase()}`} />
            {!data ? (
              <ChartSkeleton height={140} />
            ) : (
              <TargetMeter
                achievedLabel="Resolved"
                targetLabel="SLA target"
                achievedValue={data.resolutionTarget.achievedPct}
                targetValue={data.resolutionTarget.targetPct}
                valueFormatter={(v) => formatPct(v, 0)}
              />
            )}
          </Card>
        </section>

        {/* ── Tier 4: what needs a reply right now ── */}
        <section className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Awaiting reply" subtitle="Open conversations, longest-waiting first" />
            {!data ? <ChartSkeleton height={220} /> : <AwaitingReplyList items={data.attention} />}
          </Card>
        </section>

        {/* ── Tier 5: automation — is the chatbot actually helping ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Automation completion" subtitle={FLOW_NAME} />
            {!data ? (
              <ChartSkeleton height={200} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-2">
                <RadialGauge value={data.flowSummary.completionRatePct} valueLabel={formatPct(data.flowSummary.completionRatePct, 0)} label="Completed" size={140} />
                <div className="flex items-center gap-2 font-label text-[11.5px] text-[var(--color-ink-muted)]">
                  <Bot size={13} strokeWidth={1.8} />
                  {formatNumber(data.flowSummary.totalExecutions)} runs · avg. {data.flowSummary.avgDurationMinutes.toFixed(1)}m to complete
                </div>
              </div>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Where the flow gets abandoned" subtitle="Non-completed runs, by last step reached" />
            {!data ? (
              <ChartSkeleton height={200} />
            ) : data.flowDropOff.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[var(--color-ink-muted)]">Every run completes — no drop-off to show.</p>
            ) : (
              <>
                <RankedBar data={data.flowDropOff} valueFormatter={formatCount} />
                <div className="mt-4">
                  <InsightCallout text={`"${data.flowDropOff[0].label}" is where the most conversations abandon the flow — worth simplifying that step or offering a human handoff there.`} />
                </div>
              </>
            )}
          </Card>
        </section>

        {/* ── Tier 6: social presence — company-wide (Social tables carry no branch scoping) ── */}
        <section className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Audience" subtitle="Follower count by platform, vs. 30 days ago — company-wide, not branch-filterable" />
            {!data ? (
              <ChartSkeleton height={100} />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {data.followers.map((f) => (
                  <StatTile
                    key={f.platform}
                    label={f.platform}
                    value={formatNumber(f.current)}
                    numeric={{ raw: f.current, format: formatNumber }}
                    delta={computeDelta(f.current, f.prior30d, "30 days ago")}
                    icon={Users}
                  />
                ))}
              </div>
            )}
          </Card>
        </section>
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Engagement by platform" subtitle={`Avg. likes, comments & shares per post · ${periodLabel.toLowerCase()}`} />
            {!data ? (
              <ChartSkeleton height={200} />
            ) : (
              <>
                <PlatformEngagementBars data={data.platformSummary} />
                {data.engagementLeader && data.deepestEngagement && (
                  <div className="mt-4">
                    <InsightCallout
                      text={
                        data.engagementLeader.key === data.deepestEngagement.key
                          ? `${data.engagementLeader.label} leads on both volume and depth of engagement — the highest average engagement per post, and the highest share of that engagement coming from comments and shares rather than likes alone.`
                          : `${data.engagementLeader.label} drives the most engagement per post overall, but ${data.deepestEngagement.label} sees the highest share of comments and shares relative to likes — a sign of a smaller, more conversational audience worth nurturing.`
                      }
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Top posts" subtitle={periodLabel} />
            {!data ? <ChartSkeleton height={260} /> : <SocialPostFeed posts={data.topPosts} />}
          </Card>
        </section>
      </main>
    </>
  );
}
