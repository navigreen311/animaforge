'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventType = 'shot' | 'milestone' | 'meeting' | 'review';
type ViewMode = 'month' | 'week' | 'gantt' | 'list';
type EventStatus = 'scheduled' | 'in_progress' | 'complete' | 'overdue';
type Phase = 'pre-prod' | 'production' | 'post';
type ListFilter = 'all' | 'shots' | 'milestones' | 'reviews';
type SortKey = 'date' | 'event' | 'project' | 'type' | 'owner' | 'status';

interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  projectId: string;
  date: string; // ISO
  startHour?: number; // 0-23 for week view
  durationHours?: number;
  owner: string;
  status: EventStatus;
  description?: string;
}

interface GanttTask {
  id: string;
  name: string;
  projectId: string;
  startDay: number; // offset from Gantt start
  duration: number; // days
  phase: Phase;
  dependencies?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  workload: number; // 0-100
  color: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROJECTS: ProjectOption[] = [
  { id: 'all', name: 'All Projects' },
  { id: 'p1', name: 'Midnight Fable' },
  { id: 'p2', name: 'Product Launch Ad' },
  { id: 'p3', name: 'Explainer Video' },
];

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'gantt', label: 'Gantt' },
  { id: 'list', label: 'List' },
];

const EVENT_COLORS: Record<EventType, { bg: string; text: string; border: string; label: string }> = {
  shot: { bg: 'rgba(124, 58, 237, 0.18)', text: '#c4b5fd', border: '#7c3aed', label: 'Shot due' },
  milestone: { bg: 'rgba(34, 197, 94, 0.18)', text: '#86efac', border: '#22c55e', label: 'Milestone' },
  meeting: { bg: 'rgba(59, 130, 246, 0.18)', text: '#93c5fd', border: '#3b82f6', label: 'Team meeting' },
  review: { bg: 'rgba(251, 191, 36, 0.18)', text: '#fcd34d', border: '#fbbf24', label: 'Review deadline' },
};

const PHASE_COLORS: Record<Phase, string> = {
  'pre-prod': '#3b82f6',
  production: '#7c3aed',
  post: '#22c55e',
};

const STATUS_COLORS: Record<EventStatus, { bg: string; text: string }> = {
  scheduled: { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.18)', text: '#93c5fd' },
  complete: { bg: 'rgba(34, 197, 94, 0.18)', text: '#86efac' },
  overdue: { bg: 'rgba(239, 68, 68, 0.18)', text: '#fca5a5' },
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

// Today is 2026-04-09 per project context. Spread events across April 2026.
const YEAR = 2026;
const MONTH = 3; // April (0-indexed)

function iso(y: number, m: number, d: number, h = 9): string {
  return new Date(Date.UTC(y, m, d, h, 0, 0)).toISOString();
}

const MOCK_EVENTS: CalendarEvent[] = [
  { id: 'e1',  title: 'Hero intro shot', type: 'shot', projectId: 'p1', date: iso(YEAR, MONTH, 3, 10), startHour: 10, durationHours: 2, owner: 'Aria Chen', status: 'complete', description: 'Final render delivery for scene 1 hero shot.' },
  { id: 'e2',  title: 'Daily standup', type: 'meeting', projectId: 'p1', date: iso(YEAR, MONTH, 6, 9), startHour: 9, durationHours: 1, owner: 'Team', status: 'complete' },
  { id: 'e3',  title: 'Pre-prod sign-off', type: 'milestone', projectId: 'p1', date: iso(YEAR, MONTH, 7, 14), owner: 'Director', status: 'complete', description: 'Pre-production phase officially closed.' },
  { id: 'e4',  title: 'Scene 3 review', type: 'review', projectId: 'p2', date: iso(YEAR, MONTH, 8, 15), startHour: 15, durationHours: 1, owner: 'Jordan Lee', status: 'complete' },
  { id: 'e5',  title: 'Shot 12 due', type: 'shot', projectId: 'p2', date: iso(YEAR, MONTH, 9, 12), startHour: 12, durationHours: 3, owner: 'Mika Tanaka', status: 'in_progress', description: 'Chase sequence rooftop approach.' },
  { id: 'e6',  title: 'Daily standup', type: 'meeting', projectId: 'p1', date: iso(YEAR, MONTH, 9, 9), startHour: 9, durationHours: 1, owner: 'Team', status: 'in_progress' },
  { id: 'e7',  title: 'Render window', type: 'meeting', projectId: 'p3', date: iso(YEAR, MONTH, 10, 13), startHour: 13, durationHours: 4, owner: 'Render Farm', status: 'scheduled' },
  { id: 'e8',  title: 'Director review', type: 'review', projectId: 'p1', date: iso(YEAR, MONTH, 11, 16), startHour: 16, durationHours: 2, owner: 'Director', status: 'scheduled' },
  { id: 'e9',  title: 'Shot 14 due', type: 'shot', projectId: 'p1', date: iso(YEAR, MONTH, 13, 11), owner: 'Kael Rivers', status: 'scheduled' },
  { id: 'e10', title: 'Animatic lock', type: 'milestone', projectId: 'p2', date: iso(YEAR, MONTH, 14, 10), owner: 'Morath Vale', status: 'scheduled', description: 'Locked animatic ready for production handoff.' },
  { id: 'e11', title: 'Client review', type: 'review', projectId: 'p2', date: iso(YEAR, MONTH, 16, 14), startHour: 14, durationHours: 2, owner: 'Sarah Chen', status: 'scheduled' },
  { id: 'e12', title: 'Shot 17 due', type: 'shot', projectId: 'p3', date: iso(YEAR, MONTH, 17, 15), owner: 'Aria Chen', status: 'scheduled' },
  { id: 'e13', title: 'Production kickoff', type: 'milestone', projectId: 'p3', date: iso(YEAR, MONTH, 20, 9), owner: 'Director', status: 'scheduled' },
  { id: 'e14', title: 'Color pass review', type: 'review', projectId: 'p1', date: iso(YEAR, MONTH, 22, 13), owner: 'Jordan Lee', status: 'scheduled' },
  { id: 'e15', title: 'Shot 21 due', type: 'shot', projectId: 'p2', date: iso(YEAR, MONTH, 28, 12), owner: 'Mika Tanaka', status: 'scheduled' },
];

const MOCK_LIST_EVENTS: CalendarEvent[] = [
  ...MOCK_EVENTS,
  { id: 'l1', title: 'VO session',       type: 'meeting',   projectId: 'p1', date: iso(YEAR, MONTH, 4, 10), owner: 'Aria Chen',   status: 'complete' },
  { id: 'l2', title: 'Shot 4 due',       type: 'shot',      projectId: 'p1', date: iso(YEAR, MONTH, 5, 12), owner: 'Kael Rivers', status: 'complete' },
  { id: 'l3', title: 'Style review',     type: 'review',    projectId: 'p3', date: iso(YEAR, MONTH, 12, 14), owner: 'Sarah Chen', status: 'scheduled' },
  { id: 'l4', title: 'Shot 9 due',       type: 'shot',      projectId: 'p3', date: iso(YEAR, MONTH, 15, 11), owner: 'Morath Vale', status: 'scheduled' },
  { id: 'l5', title: 'Final delivery',   type: 'milestone', projectId: 'p2', date: iso(YEAR, MONTH, 30, 17), owner: 'Director',    status: 'scheduled' },
];

const GANTT_TASKS: GanttTask[] = [
  { id: 't1', name: 'Script lock',        projectId: 'p1', startDay: 0,  duration: 5,  phase: 'pre-prod' },
  { id: 't2', name: 'Storyboards',        projectId: 'p1', startDay: 4,  duration: 7,  phase: 'pre-prod', dependencies: ['t1'] },
  { id: 't3', name: 'Animatic',           projectId: 'p1', startDay: 10, duration: 5,  phase: 'pre-prod', dependencies: ['t2'] },
  { id: 't4', name: 'Shot generation',    projectId: 'p1', startDay: 14, duration: 12, phase: 'production', dependencies: ['t3'] },
  { id: 't5', name: 'Character animation', projectId: 'p2', startDay: 6, duration: 10, phase: 'production' },
  { id: 't6', name: 'VFX integration',    projectId: 'p2', startDay: 15, duration: 8,  phase: 'production', dependencies: ['t5'] },
  { id: 't7', name: 'Color grading',      projectId: 'p3', startDay: 20, duration: 6,  phase: 'post' },
  { id: 't8', name: 'Final mix + deliver', projectId: 'p3', startDay: 24, duration: 4,  phase: 'post', dependencies: ['t7'] },
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: 'm1', name: 'Aria Chen',    role: 'Director',      workload: 85, color: '#7c3aed' },
  { id: 'm2', name: 'Kael Rivers',  role: 'Lead Animator', workload: 92, color: '#3b82f6' },
  { id: 'm3', name: 'Mika Tanaka',  role: 'VFX Artist',    workload: 64, color: '#22c55e' },
  { id: 'm4', name: 'Morath Vale',  role: 'Storyboard',    workload: 45, color: '#fbbf24' },
  { id: 'm5', name: 'Sarah Chen',   role: 'Reviewer',      workload: 30, color: '#f472b6' },
];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function formatDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const today = new Date(YEAR, MONTH, 9); // pinned "today" matches mock data
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [cursor, setCursor] = useState<Date>(new Date(YEAR, MONTH, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const visibleEvents = useMemo(() => {
    return MOCK_EVENTS.filter(e => projectFilter === 'all' || e.projectId === projectFilter);
  }, [projectFilter]);

  const visibleListEvents = useMemo(() => {
    const filtered = MOCK_LIST_EVENTS.filter(e => {
      if (projectFilter !== 'all' && e.projectId !== projectFilter) return false;
      if (listFilter === 'shots' && e.type !== 'shot') return false;
      if (listFilter === 'milestones' && e.type !== 'milestone') return false;
      if (listFilter === 'reviews' && e.type !== 'review') return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date':    cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
        case 'event':   cmp = a.title.localeCompare(b.title); break;
        case 'project': cmp = a.projectId.localeCompare(b.projectId); break;
        case 'type':    cmp = a.type.localeCompare(b.type); break;
        case 'owner':   cmp = a.owner.localeCompare(b.owner); break;
        case 'status':  cmp = a.status.localeCompare(b.status); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [projectFilter, listFilter, sortKey, sortAsc]);

  const upcomingThisWeek = useMemo(() => {
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 7);
    return visibleEvents
      .filter(e => {
        const d = new Date(e.date);
        return d >= weekStart && d < weekEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [visibleEvents]);

  const stats = useMemo(() => {
    const shots = visibleEvents.filter(e => e.type === 'shot').length;
    const milestones = visibleEvents.filter(e => e.type === 'milestone').length;
    return { shots, milestones, teamAssigned: TEAM_MEMBERS.length };
  }, [visibleEvents]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const navigatePrev = () => {
    if (viewMode === 'week') setCursor(addDays(cursor, -7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  };
  const navigateNext = () => {
    if (viewMode === 'week') setCursor(addDays(cursor, 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  };
  const navigateToday = () => setCursor(new Date(today));

  /* ---------------- Month view grid ---------------- */
  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor.getFullYear(), cursor.getMonth());
    const startOffset = first.getDay();
    const total = daysInMonth(cursor.getFullYear(), cursor.getMonth());
    const cells: { date: Date; inMonth: boolean }[] = [];
    // Leading
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: addDays(first, i - startOffset), inMonth: false });
    }
    // Month days
    for (let d = 1; d <= total; d++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), inMonth: true });
    }
    // Trailing to fill 6 rows (42)
    while (cells.length < 42) {
      cells.push({ date: addDays(cells[cells.length - 1].date, 1), inMonth: false });
    }
    return cells;
  }, [cursor]);

  const eventsForDay = (d: Date) => visibleEvents.filter(e => sameDay(new Date(e.date), d));

  /* ---------------- Render ---------------- */

  return (
    <div style={{ display: 'flex', minHeight: '100%', background: 'var(--bg-base)' }}>
      {/* ============== Main column ============== */}
      <div style={{ flex: 1, minWidth: 0, padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Production Calendar
            </h1>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
              style={{
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '6px 10px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {PROJECTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 2 }} role="tablist" aria-label="Calendar view">
              {VIEW_MODES.map(v => {
                const active = viewMode === v.id;
                return (
                  <button
                    key={v.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setViewMode(v.id)}
                    style={{
                      background: active ? 'var(--brand)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--brand)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-sm)', padding: '8px 14px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Add milestone
            </button>
          </div>
        </div>

        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            onClick={navigatePrev}
            aria-label="Previous"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={navigateToday}
            style={{
              background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '6px 14px',
              fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={navigateNext}
            aria-label="Next"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <ChevronRight size={15} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
        </div>

        {/* ============== View body ============== */}
        {viewMode === 'month' && (
          <MonthView
            grid={monthGrid}
            today={today}
            selectedDate={selectedDate}
            eventsForDay={eventsForDay}
            onSelectDate={setSelectedDate}
            onSelectEvent={setSelectedEvent}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            cursor={cursor}
            events={visibleEvents}
            today={today}
            onSelectEvent={setSelectedEvent}
          />
        )}

        {viewMode === 'gantt' && (
          <GanttView tasks={GANTT_TASKS} projects={PROJECTS} />
        )}

        {viewMode === 'list' && (
          <ListView
            events={visibleListEvents}
            filter={listFilter}
            onFilter={setListFilter}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={toggleSort}
            projects={PROJECTS}
            onSelectEvent={setSelectedEvent}
          />
        )}

        {/* Day detail panel (month view only) */}
        {viewMode === 'month' && selectedDate && (
          <div
            style={{
              marginTop: 18,
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {formatDate(selectedDate)}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                aria-label="Close day detail"
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                  cursor: 'pointer', display: 'flex', padding: 4,
                }}
              >
                <X size={14} />
              </button>
            </div>
            {eventsForDay(selectedDate).length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>No events scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {eventsForDay(selectedDate).map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEvent(ev)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg-base)', border: `0.5px solid ${EVENT_COLORS[ev.type].border}`,
                      borderLeft: `3px solid ${EVENT_COLORS[ev.type].border}`,
                      borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{ev.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ev.owner}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============== Sidebar ============== */}
      <aside
        style={{
          width: 280,
          flexShrink: 0,
          borderLeft: '0.5px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '24px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
        aria-label="Calendar sidebar"
      >
        {/* Upcoming this week */}
        <section>
          <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
            Upcoming this week
          </h3>
          <div
            style={{
              background: 'var(--bg-base)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {upcomingThisWeek.length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No upcoming events.</span>
            ) : (
              upcomingThisWeek.slice(0, 5).map(ev => {
                const d = new Date(ev.date);
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 3, height: 26, borderRadius: 2,
                        background: EVENT_COLORS[ev.type].border,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {WEEKDAY_SHORT[d.getDay()]} · {d.getHours()}:{String(d.getMinutes()).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Quick stats */}
        <section>
          <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
            Quick stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <StatRow icon={Calendar} label={`${stats.shots} shots due`} color="#7c3aed" />
            <StatRow icon={AlertCircle} label={`${stats.milestones} milestones`} color="#22c55e" />
            <StatRow icon={Users} label={`${stats.teamAssigned} team members assigned`} color="#3b82f6" />
          </div>
        </section>

        {/* Team assignments */}
        <section>
          <h3 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
            Team workload
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TEAM_MEMBERS.map(m => (
              <div key={m.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: m.color, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600,
                      }}
                    >
                      {m.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{m.role}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{m.workload}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${m.workload}%`, height: '100%',
                      background: m.workload > 80 ? '#f87171' : m.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      {/* ============== Event detail modal ============== */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Month view                                                         */
/* ------------------------------------------------------------------ */

function MonthView({
  grid,
  today,
  selectedDate,
  eventsForDay,
  onSelectDate,
  onSelectEvent,
}: {
  grid: { date: Date; inMonth: boolean }[];
  today: Date;
  selectedDate: Date | null;
  eventsForDay: (d: Date) => CalendarEvent[];
  onSelectDate: (d: Date) => void;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-base)', borderBottom: '0.5px solid var(--border)' }}>
        {WEEKDAY_SHORT.map(w => (
          <div
            key={w}
            style={{
              padding: '10px 12px',
              fontSize: 11, fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(108px, 1fr)' }}>
        {grid.map((cell, i) => {
          const isToday = sameDay(cell.date, today);
          const isSelected = selectedDate && sameDay(cell.date, selectedDate);
          const dayEvents = eventsForDay(cell.date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              style={{
                textAlign: 'left',
                background: isSelected ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                border: 'none',
                borderRight: '0.5px solid var(--border)',
                borderBottom: '0.5px solid var(--border)',
                padding: 8,
                cursor: 'pointer',
                opacity: cell.inMonth ? 1 : 0.35,
                display: 'flex', flexDirection: 'column', gap: 4,
                minHeight: 108,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#fff' : 'var(--text-secondary)',
                    background: isToday ? 'var(--brand)' : 'transparent',
                    borderRadius: '50%',
                    width: 20, height: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                {dayEvents.slice(0, 3).map(ev => (
                  <span
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }}
                    style={{
                      display: 'block',
                      background: EVENT_COLORS[ev.type].bg,
                      color: EVENT_COLORS[ev.type].text,
                      borderLeft: `2px solid ${EVENT_COLORS[ev.type].border}`,
                      borderRadius: 3,
                      padding: '2px 6px',
                      fontSize: 10, fontWeight: 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', paddingLeft: 4 }}>
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Week view                                                          */
/* ------------------------------------------------------------------ */

function WeekView({
  cursor,
  events,
  today,
  onSelectEvent,
}: {
  cursor: Date;
  events: CalendarEvent[];
  today: Date;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const weekStart = startOfWeek(cursor);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am - 7pm

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-base)' }}>
        <div />
        {days.map(d => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              style={{
                padding: '10px 8px',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: isToday ? 'var(--brand)' : 'var(--text-secondary)',
                borderLeft: '0.5px solid var(--border)',
              }}
            >
              <div style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{WEEKDAY_SHORT[d.getDay()]}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Hours grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative' }}>
        {/* Hours column */}
        <div>
          {hours.map(h => (
            <div
              key={h}
              style={{
                height: 48,
                padding: '4px 8px',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                textAlign: 'right',
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              {h}:00
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map(d => (
          <div key={d.toISOString()} style={{ borderLeft: '0.5px solid var(--border)', position: 'relative' }}>
            {hours.map(h => (
              <div key={h} style={{ height: 48, borderBottom: '0.5px solid var(--border)' }} />
            ))}
            {/* Events for the day */}
            {events
              .filter(e => sameDay(new Date(e.date), d) && typeof e.startHour === 'number')
              .map(e => {
                const top = ((e.startHour ?? 8) - 8) * 48;
                const height = Math.max(22, (e.durationHours ?? 1) * 48 - 4);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEvent(e)}
                    style={{
                      position: 'absolute',
                      top,
                      left: 4,
                      right: 4,
                      height,
                      background: EVENT_COLORS[e.type].bg,
                      color: EVENT_COLORS[e.type].text,
                      borderLeft: `3px solid ${EVENT_COLORS[e.type].border}`,
                      borderRadius: 4,
                      padding: '4px 6px',
                      fontSize: 10, fontWeight: 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                    <div style={{ fontSize: 9, opacity: 0.8 }}>{e.owner}</div>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gantt view                                                         */
/* ------------------------------------------------------------------ */

function GanttView({ tasks, projects }: { tasks: GanttTask[]; projects: ProjectOption[] }) {
  const totalDays = 30;
  const colWidth = 26;
  const rowHeight = 36;
  const labelWidth = 180;
  const chartWidth = totalDays * colWidth;

  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? id;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'auto',
      }}
    >
      {/* Header: day numbers */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-base)' }}>
        <div style={{ width: labelWidth, flexShrink: 0, padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Task
        </div>
        <div style={{ display: 'flex', position: 'relative' }}>
          {Array.from({ length: totalDays }, (_, i) => (
            <div
              key={i}
              style={{
                width: colWidth,
                textAlign: 'center',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                padding: '10px 0',
                borderLeft: i === 0 ? 'none' : '0.5px solid var(--border)',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{ position: 'relative' }}>
        {tasks.map((t, idx) => {
          const left = t.startDay * colWidth;
          const width = t.duration * colWidth - 2;
          return (
            <div key={t.id} style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', height: rowHeight }}>
              <div
                style={{
                  width: labelWidth,
                  flexShrink: 0,
                  padding: '0 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{projectName(t.projectId)}</span>
              </div>
              <div style={{ position: 'relative', width: chartWidth, height: rowHeight }}>
                {/* Grid lines */}
                {Array.from({ length: totalDays }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: i * colWidth,
                      top: 0, bottom: 0,
                      width: 1,
                      background: 'var(--border)',
                      opacity: 0.3,
                    }}
                  />
                ))}
                {/* Bar */}
                <div
                  title={`${t.name} (${t.duration}d)`}
                  style={{
                    position: 'absolute',
                    left,
                    top: 8,
                    width,
                    height: rowHeight - 16,
                    background: PHASE_COLORS[t.phase],
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    fontSize: 10,
                    color: '#fff',
                    fontWeight: 500,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.phase}
                </div>
                {/* Dependency arrows (simple right-angle) */}
                {t.dependencies?.map(depId => {
                  const dep = tasks.find(x => x.id === depId);
                  if (!dep) return null;
                  const depIdx = tasks.findIndex(x => x.id === depId);
                  const depEnd = (dep.startDay + dep.duration) * colWidth;
                  const rowDiff = idx - depIdx;
                  const midX = depEnd + 4;
                  const startY = -rowDiff * rowHeight + rowHeight / 2;
                  const endX = left;
                  const endY = rowHeight / 2;
                  return (
                    <svg
                      key={depId}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: chartWidth,
                        height: rowHeight,
                        overflow: 'visible',
                        pointerEvents: 'none',
                      }}
                    >
                      <path
                        d={`M ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
                        stroke="var(--text-tertiary)"
                        strokeWidth="1"
                        fill="none"
                      />
                      <polygon
                        points={`${endX},${endY} ${endX - 5},${endY - 3} ${endX - 5},${endY + 3}`}
                        fill="var(--text-tertiary)"
                      />
                    </svg>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: 12, borderTop: '0.5px solid var(--border)' }}>
        {(Object.keys(PHASE_COLORS) as Phase[]).map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: PHASE_COLORS[p] }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  List view                                                          */
/* ------------------------------------------------------------------ */

function ListView({
  events,
  filter,
  onFilter,
  sortKey,
  sortAsc,
  onSort,
  projects,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  filter: ListFilter;
  onFilter: (f: ListFilter) => void;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  projects: ProjectOption[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? id;

  const columns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'event', label: 'Event' },
    { key: 'project', label: 'Project' },
    { key: 'type', label: 'Type' },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: '0.5px solid var(--border)' }}>
        <Filter size={13} style={{ color: 'var(--text-tertiary)' }} />
        <select
          value={filter}
          onChange={(e) => onFilter(e.target.value as ListFilter)}
          aria-label="Filter events"
          style={{
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '5px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="all">All</option>
          <option value="shots">Shots</option>
          <option value="milestones">Milestones</option>
          <option value="reviews">Reviews</option>
        </select>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              {columns.map(c => (
                <th
                  key={c.key}
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '0.5px solid var(--border)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => onSort(c.key)}
                >
                  {c.label}
                  {sortKey === c.key && (
                    <span style={{ marginLeft: 6, color: 'var(--text-secondary)' }}>
                      {sortAsc ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(ev => {
              const d = new Date(ev.date);
              return (
                <tr
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  style={{ cursor: 'pointer', borderBottom: '0.5px solid var(--border)' }}
                >
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {ev.title}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {projectName(ev.projectId)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>
                    <span
                      style={{
                        background: EVENT_COLORS[ev.type].bg,
                        color: EVENT_COLORS[ev.type].text,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      {EVENT_COLORS[ev.type].label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {ev.owner}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>
                    <span
                      style={{
                        background: STATUS_COLORS[ev.status].bg,
                        color: STATUS_COLORS[ev.status].text,
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                    >
                      {ev.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function StatRow({ icon: Icon, label, color }: { icon: typeof Calendar; label: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--bg-base)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          width: 28, height: 28,
          borderRadius: 'var(--radius-sm)',
          background: `${color}22`,
          color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={14} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const d = new Date(event.date);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${event.title} details`}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: 460,
          padding: 22,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 8, height: 36, borderRadius: 2,
                background: EVENT_COLORS[event.type].border,
              }}
            />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {event.title}
              </h2>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {EVENT_COLORS[event.type].label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
              cursor: 'pointer', padding: 4, display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DetailRow icon={Calendar} label={formatDate(d)} />
          {typeof event.startHour === 'number' && (
            <DetailRow icon={Clock} label={`${event.startHour}:00 · ${event.durationHours ?? 1}h`} />
          )}
          <DetailRow icon={Users} label={event.owner} />
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              background: STATUS_COLORS[event.status].bg,
              color: STATUS_COLORS[event.status].text,
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {event.status.replace('_', ' ')}
          </div>
          {event.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 0' }}>
              {event.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={13} style={{ color: 'var(--text-tertiary)' }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}
