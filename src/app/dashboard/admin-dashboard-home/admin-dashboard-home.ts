import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, of, switchMap, timer } from 'rxjs';

import {
  AdminDashboardData,
  AdminDashboardService,
  DashboardPeriod,
  DashboardSeries,
} from '../../services/admin-dashboard.service';
import { AuthService } from '../../services/auth';

type SeriesKey = 'logins' | 'newSignups' | 'revenue';
type RoleKey = 'admins' | 'instructors' | 'learners';

/** Optional "+12%" growth badge shown next to the legend totals (add `change` to DashboardSeries in the service). */
type SeriesWithChange = DashboardSeries & { change?: number | null };

/** Labels of the "Time Period" select -> API value. */
const PERIOD_OPTIONS = {
  'Last 7 Days': 'WEEK',
  'Last 30 Days': 'MONTH',
  'Last 12 Months': 'YEAR',
} as const satisfies Record<string, DashboardPeriod>;
type PeriodLabel = keyof typeof PERIOD_OPTIONS;

/** How often the dashboard reloads itself (the backend counts a user online for 2 minutes after a heartbeat). */
const REFRESH_MS = 30_000;

// Plot area inside the 600 x 340 viewBox of the two area charts (labels sit at y = 330).
const PLOT_LEFT = 55;
const PLOT_RIGHT = 590;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 300;

/** Figma axes: 0 ... top in 6 equal steps (0, 500, 1k ... 3k / 0, 3k ... 18k). */
const AXIS_STEPS = 6;
const NICE_STEPS = [1, 2, 3, 5, 10];

// Donut (viewBox 300 x 300): ring from r = 54 to r = 126, 6px gap, 8px rounded corners.
const DONUT_CENTER = 150;
const DONUT_OUTER = 126;
const DONUT_INNER = 54;
const DONUT_GAP = 3;
const DONUT_CORNER = 8;



interface AxisScale {
  /** Highest tick - the value drawn at PLOT_TOP. */
  top: number;
  ticks: number[];
}

interface Point {
  x: number;
  y: number;
}

interface AxisLabel {
  index: number;
  label: string;
  x: number;
}

interface DonutSegment {
  key: RoleKey;
  color: string;
  path: string;
  delay: string;
}

/** "Nice" axis: AXIS_STEPS equal steps (1 / 2 / 3 / 5 x 10^n) from 0 up to a value >= max. */
function buildScale(max: number, integersOnly: boolean): AxisScale {
  const safeMax = max > 0 ? max : 1;
  const rawStep = safeMax / AXIS_STEPS;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let step = (NICE_STEPS.find((nice) => normalized <= nice) ?? 10) * magnitude;
  if (integersOnly) step = Math.max(1, Math.ceil(step));
  const ticks = Array.from({ length: AXIS_STEPS + 1 }, (_, index) => index * step);
  return { top: step * AXIS_STEPS, ticks };
}

/** Smooth line through the points (horizontal tangents, so the curve never dips below its data). */
function linePath(points: Point[]): string {
  if (!points.length) return '';
  const [first, ...rest] = points;
  const segments = rest.map((point, index) => {
    const previous = points[index];
    const middle = (previous.x + point.x) / 2;
    return ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  });
  return `M ${first.x} ${first.y}${segments.join('')}`;
}

function areaPath(points: Point[]): string {
  if (!points.length) return '';
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.x} ${PLOT_BOTTOM} L ${points[0].x} ${PLOT_BOTTOM} Z`;
}

function polar(radius: number, degrees: number): Point {
  const radians = ((degrees - 90) * Math.PI) / 180; // 0deg = 12 o'clock, clockwise
  return {
    x: DONUT_CENTER + radius * Math.cos(radians),
    y: DONUT_CENTER + radius * Math.sin(radians),
  };
}

/**
 * Ring segment with rounded corners and a gap to its neighbours.
 * The shape is inset by DONUT_CORNER and the template strokes it with a (2 x DONUT_CORNER) round-joined
 * stroke in the same colour, which rounds every corner.
 */
function sectorPath(startDeg: number, endDeg: number, gapped: boolean): string {
  const outer = DONUT_OUTER - DONUT_CORNER;
  const inner = DONUT_INNER + DONUT_CORNER;

  if (endDeg - startDeg >= 359.99) {
    const ring = (radius: number): string =>
      `M ${DONUT_CENTER - radius} ${DONUT_CENTER} a ${radius} ${radius} 0 1 0 ${2 * radius} 0 a ${radius} ${radius} 0 1 0 ${-2 * radius} 0 Z`;
    return `${ring(outer)} ${ring(inner)}`;
  }

  // Each edge is a line parallel to the radial line, `offset` px inside the segment,
  // so the white gap between neighbours has the same width at every radius.
  const offset = (gapped ? DONUT_GAP / 2 : 0) + DONUT_CORNER;
  const toDeg = (rad: number): number => (rad * 180) / Math.PI;
  const outerPad = toDeg(Math.asin(offset / outer));
  const innerPad = toDeg(Math.asin(offset / inner));

  const outerFrom = startDeg + outerPad;
  const outerTo = endDeg - outerPad;
  const innerFrom = startDeg + innerPad;
  const innerTo = endDeg - innerPad;
  if (outerTo <= outerFrom || innerTo <= innerFrom) return '';

  const a = polar(outer, outerFrom);
  const b = polar(outer, outerTo);
  const c = polar(inner, innerTo);
  const d = polar(inner, innerFrom);
  const largeOuter = outerTo - outerFrom > 180 ? 1 : 0;
  const largeInner = innerTo - innerFrom > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${largeOuter} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${largeInner} 0 ${d.x} ${d.y} Z`;
}

@Component({
  selector: 'app-admin-dashboard-home',
  templateUrl: './admin-dashboard-home.html',
  styleUrl: './admin-dashboard-home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardHome {
  private readonly auth = inject(AuthService);
  private readonly api = inject(AdminDashboardService);

  // ---------- greeting ----------
  readonly userName = computed(() => this.auth.user()?.firstName?.trim() || this.auth.displayName());

  // ---------- period filter ----------
  readonly timePeriods = Object.keys(PERIOD_OPTIONS) as PeriodLabel[];
  private readonly period = signal<PeriodLabel>('Last 30 Days');

  /** Read by the template as a plain property: `[value]="selectedPeriod"`. */
  get selectedPeriod(): PeriodLabel {
    return this.period();
  }

  onPeriodChange(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const label = event.target.value;
    if (this.isPeriodLabel(label)) this.period.set(label);
  }

  // ---------- data ----------
  /**
   * Loads when the period changes, then again every REFRESH_MS so "Online Users" and the charts stay live.
   * A failed first load shows the "No chart data" state; a failed refresh keeps the numbers already on screen.
   */
  private readonly data = toSignal(
    toObservable(this.period).pipe(
      switchMap((label) =>
        timer(0, REFRESH_MS).pipe(
          switchMap((tick) =>
            this.api
              .getAdminDashboard(PERIOD_OPTIONS[label])
              .pipe(catchError(() => (tick === 0 ? of(null) : EMPTY))),
          ),
        ),
      ),
    ),
    { initialValue: null as AdminDashboardData | null },
  );

  /** Read by the template as a plain property: `dashboardData?.logins?.total`. */
  get dashboardData(): AdminDashboardData | null {
    return this.data();
  }

  hasChartData(key: SeriesKey): boolean {
    return (this.data()?.[key]?.values ?? []).some((value) => value > 0);
  }

  /** Growth badge ("+12%") next to a legend total; null when the API doesn't send one. */
  getChange(key: 'logins' | 'newSignups'): number | null {
    return (this.data()?.[key] as SeriesWithChange | undefined)?.change ?? null;
  }

  formatChange(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '';
    const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
  }

  // ---------- x axis: Apr 1, Apr 5, Apr 10 ... (not every label) ----------
  private readonly axisLabels = computed(() => {
    const data = this.data();
    const build = (series: DashboardSeries | undefined): AxisLabel[] => {
      const labels = series?.labels ?? [];
      const step = labels.length <= 8 ? 1 : Math.ceil(labels.length / 7);
      return labels
        .map((label, index) => ({ index, label, x: this.xAt(index, labels.length) }))
        .filter(({ index }) => step === 1 || index === 0 || ((index + 1) % step === 0 && index >= 3));
    };
    return {
      logins: build(data?.logins),
      newSignups: build(data?.newSignups),
      revenue: build(data?.revenue),
    };
  });

  getVisibleLabels(key: SeriesKey): AxisLabel[] {
    return this.axisLabels()[key];
  }

  // ---------- Login's & Sign up's chart (both lines share one y-axis) ----------
  private readonly loginScale = computed(() => {
    const data = this.data();
    const max = Math.max(0, ...(data?.logins?.values ?? []), ...(data?.newSignups?.values ?? []));
    return buildScale(max, true);
  });

  private readonly revenueScale = computed(() =>
    buildScale(Math.max(0, ...(this.data()?.revenue?.values ?? [])), false),
  );

  get loginTicks(): number[] {
    return this.loginScale().ticks;
  }

  get revenueTicks(): number[] {
    return this.revenueScale().ticks;
  }

  getLoginY(value: number): number {
    return this.yAt(value, this.loginScale());
  }

  getRevenueY(value: number): number {
    return this.yAt(value, this.revenueScale());
  }

  private readonly charts = computed(() => {
    const data = this.data();
    const loginScale = this.loginScale();
    const revenueScale = this.revenueScale();
    const plot = (series: DashboardSeries | undefined, scale: AxisScale): Point[] =>
      (series?.values ?? []).map((value, index, all) => ({
        x: this.xAt(index, all.length),
        y: this.yAt(value, scale),
      }));

    const logins = plot(data?.logins, loginScale);
    const signups = plot(data?.newSignups, loginScale);
    const revenue = plot(data?.revenue, revenueScale);
    return {
      loginPath: linePath(logins),
      loginAreaPath: areaPath(logins),
      signupPath: linePath(signups),
      signupAreaPath: areaPath(signups),
      revenuePath: linePath(revenue),
      revenueAreaPath: areaPath(revenue),
    };
  });

  get loginPath(): string {
    return this.charts().loginPath;
  }
  get loginAreaPath(): string {
    return this.charts().loginAreaPath;
  }
  get signupPath(): string {
    return this.charts().signupPath;
  }
  get signupAreaPath(): string {
    return this.charts().signupAreaPath;
  }
  get revenuePath(): string {
    return this.charts().revenuePath;
  }
  get revenueAreaPath(): string {
    return this.charts().revenueAreaPath;
  }

  // ---------- user distribution donut ----------
  readonly roles: { key: RoleKey; label: string; bar: string }[] = [
    { key: 'admins', label: 'Admins', bar: 'bg-purple-500' },
    { key: 'instructors', label: 'Instructors', bar: 'bg-amber-400' },
    { key: 'learners', label: 'Learners', bar: 'bg-blue-500' },
  ];

  private readonly donut = computed(() => {
   const distribution = this.data()?.userDistribution;
const all: { key: RoleKey; color: string; count: number }[] = [
  { key: 'admins', color: '#a96bfa', count: distribution?.admins ?? 0 },
  { key: 'instructors', color: '#ffcf5e', count: distribution?.instructors ?? 0 },
  { key: 'learners', color: '#7b8fe6', count: distribution?.learners ?? 0 },
];
const entries = all.filter((entry) => entry.count > 0);

    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    let start = 0;
    const segments: DonutSegment[] = entries.map((entry, index) => {
      const sweep = (entry.count / total) * 360;
      const path = sectorPath(start, start + sweep, entries.length > 1);
      start += sweep;
      return { key: entry.key, color: entry.color, path, delay: `${220 + index * 100}ms` };
    });
    return { total, segments };
  });

  get hasUserDistribution(): boolean {
    return this.donut().total > 0;
  }

  get donutSegments(): DonutSegment[] {
    return this.donut().segments;
  }

  getRolePercentage(role: RoleKey): string {
    const distribution = this.data()?.userDistribution;
    const total = this.donut().total;
    if (!distribution || !total) return '0%';
    return `${Math.round((distribution[role] / total) * 100)}%`;
  }

  // ---------- formatting ----------
  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '0';
    return new Intl.NumberFormat('en', {
      notation: Math.abs(value) >= 10_000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(value);
  }

  formatPercentage(value: number | null | undefined): string {
    const rate = value ?? 0;
    return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
  }

  getCourseCompletionDisplay(): string {
    const data = this.data();
    return data ? this.formatPercentage(data.courseCompletionRate) : '—';
  }

  // ---------- helpers ----------
  private xAt(index: number, count: number): number {
    return count <= 1
      ? (PLOT_LEFT + PLOT_RIGHT) / 2
      : PLOT_LEFT + (index / (count - 1)) * (PLOT_RIGHT - PLOT_LEFT);
  }

  private yAt(value: number, scale: AxisScale): number {
    return PLOT_BOTTOM - (Math.min(value, scale.top) / scale.top) * (PLOT_BOTTOM - PLOT_TOP);
  }

  private isPeriodLabel(value: string): value is PeriodLabel {
    return Object.prototype.hasOwnProperty.call(PERIOD_OPTIONS, value);
  }
}