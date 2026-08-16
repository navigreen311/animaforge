'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '../components/topbar/TopBar';
import StatsRow from '../components/projects/StatsRow';
import ProjectFilterBar from '../components/projects/ProjectFilterBar';
import ProjectGrid from '../components/projects/ProjectGrid';
import ProjectListView from '../components/projects/ProjectListView';
import EmptyProjectsState from '../components/projects/EmptyProjectsState';
import FolderSelector from '../components/projects/FolderSelector';
import ActivityFeed from '../components/panels/ActivityFeed';
import RenderQueuePanel from '../components/panels/RenderQueuePanel';
import NewProjectModal from '../components/projects/NewProjectModal';
import { useUIStore } from '@/store/useUIStore';
import type { Project, RenderJob, ActivityItem, DashboardStats, ProjectFolder } from '@/lib/types';
import { timeAgo } from '@/lib/utils/format';
import { UnavailableButton } from '../components/unavailable/UnavailableButton';
import { authHeaders } from '@/lib/api/useResource';

/* ------------------------------------------------------------------ */
/*  Mock folders                                                       */
/* ------------------------------------------------------------------ */

/** One row of GET /api/projects. */
interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  phase: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * Map a stored project onto the card.
 *
 * The card shows more than the table does. Shot counts come from a separate
 * query the list endpoint does not run, and there is no thumbnail, preview
 * video, per-project credit total, pin flag, folder or member list anywhere in
 * the schema — so those are empty or zero rather than filled in. Grouping into
 * folders needs a folders table before it can mean anything.
 */
function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status as Project['status'],
    projectType: 'short-film' as Project['projectType'],
    totalShots: 0,
    approvedShots: 0,
    teamMembers: [],
    creditsCost: 0,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  } as Project;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectsPage() {
  const statusFilter = useUIStore((s) => s.statusFilter);
  const sortOption = useUIStore((s) => s.sortOption);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const viewMode = useUIStore((s) => s.viewMode);
  const setNewProjectModalOpen = useUIStore((s) => s.setNewProjectModalOpen);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // ── Projects ──────────────────────────────────────────────
  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sortOption) params.set('sort', sortOption);
      if (searchQuery) params.set('search', searchQuery);
      // The request carries the console's bearer token. Without it the proxy
      // route answers 401 and this list stays permanently empty.
      const res = await fetch(`/api/projects?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch projects');
      return ((data.items ?? []) as ProjectRow[]).map(toProject);
    },
    refetchInterval: 30_000,
  });

  // ── Jobs ──────────────────────────────────────────────────
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<RenderJob[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await fetch('/api/jobs', { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch jobs');
      return data.items ?? [];
    },
    refetchInterval: 5_000,
  });

  // ── Activity ──────────────────────────────────────────────
  const { data: activities = [], isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity', { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch activity');
      return data.items ?? [];
    },
  });

  // ── Client-side filtering & sorting ───────────────────────
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }

    // Folder filter
    if (selectedFolderId) {
      result = result.filter((p) => p.folderId === selectedFolderId);
    }

    // Sort
    switch (sortOption) {
      case 'name':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'progress':
        result.sort((a, b) => {
          const pA = a.totalShots > 0 ? a.approvedShots / a.totalShots : 0;
          const pB = b.totalShots > 0 ? b.approvedShots / b.totalShots : 0;
          return pB - pA;
        });
        break;
      case 'shots':
        result.sort((a, b) => b.totalShots - a.totalShots);
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return result;
  }, [projects, statusFilter, sortOption, searchQuery, selectedFolderId]);

  // ── Pinned vs unpinned ────────────────────────────────────
  const pinnedProjects = useMemo(
    () => filteredProjects.filter((p) => p.isPinned),
    [filteredProjects],
  );

  const unpinnedProjects = useMemo(
    () => filteredProjects.filter((p) => !p.isPinned),
    [filteredProjects],
  );

  // ── Derived stats ─────────────────────────────────────────
  const stats: DashboardStats | null = useMemo(() => {
    if (projectsLoading || projects.length === 0) return null;
    return {
      totalProjects: projects.length,
      totalShots: projects.reduce((sum, p) => sum + p.totalShots, 0),
      approvedShots: projects.reduce((sum, p) => sum + p.approvedShots, 0),
      creditsUsed: projects.reduce((sum, p) => sum + p.creditsCost, 0),
      creditsTotal: 10_000, // placeholder — would come from billing API
      activeRenderJobs: jobs.filter((j) => j.status === 'running' || j.status === 'queued').length,
    };
  }, [projects, jobs, projectsLoading]);

  const activeRenderCount = jobs.filter(
    (j) => j.status === 'running' || j.status === 'queued',
  ).length;

  const lastUpdated = useMemo(() => {
    if (projects.length === 0) return null;
    const latest = projects.reduce((a, b) =>
      new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b,
    );
    return timeAgo(latest.updatedAt);
  }, [projects]);

  // ── Folder counts (derived from current projects) ─────────
  // Three folders (Animations, Ads, Shorts) were listed here for every
  // workspace. There is no folders table and no folder column on a project, so
  // there are no folders to count into.
  const foldersWithCounts = useMemo<ProjectFolder[]>(() => [], []);

  // ── Handlers ──────────────────────────────────────────────
  // Import is rendered disabled — see featureStatus['projects.import'].
  // /api/projects now proxies platform-api and persists, but nothing parses an
  // imported project file into one.

  const handleCreateProject = () => {
    setNewProjectModalOpen(true);
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <TopBar />

      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              My Projects
            </h1>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                margin: '4px 0 0',
              }}
            >
              {projects.length} project{projects.length !== 1 ? 's' : ''} &middot;{' '}
              {activeRenderCount} active render{activeRenderCount !== 1 ? 's' : ''} &middot;{' '}
              {lastUpdated ? `Last updated ${lastUpdated}` : 'No updates yet'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <UnavailableButton
              feature="projects.import"
              hideNote
              layout="inline"
              style={{
                background: 'transparent',
                border: '0.5px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Upload size={13} />
              Import
            </UnavailableButton>
            <button
              type="button"
              onClick={() => setNewProjectModalOpen(true)}
              style={{
                background: 'var(--brand)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              }}
            >
              <Plus size={13} />
              New Project
            </button>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────── */}
        <StatsRow stats={stats} loading={projectsLoading} />

        {/* ── Filter Bar ────────────────────────────────── */}
        <ProjectFilterBar />

        {/* ── Folder Selector ─────────────────────────── */}
        <FolderSelector
          folders={foldersWithCounts}
          selectedId={selectedFolderId}
          onChange={setSelectedFolderId}
        />

        {/* ── Project Content ─────────────────────────── */}
        {projectsError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              Could not load projects
            </p>
            <button
              type="button"
              onClick={() => refetchProjects()}
              style={{
                background: 'var(--brand)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : projects.length === 0 && !projectsLoading ? (
          <EmptyProjectsState onCreateProject={handleCreateProject} />
        ) : viewMode === 'list' ? (
          <ProjectListView projects={filteredProjects} />
        ) : (
          <ProjectGrid
            projects={unpinnedProjects}
            pinnedProjects={pinnedProjects}
            loading={projectsLoading}
            viewMode={viewMode}
          />
        )}

        {/* ── Bottom Panels ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: 12,
            marginTop: 4,
          }}
        >
          <ActivityFeed activities={activities} loading={activityLoading} />
          <RenderQueuePanel jobs={jobs} loading={jobsLoading} />
        </div>

        {/* ── New Project Modal ──────────────────────────── */}
        <NewProjectModal />
      </main>
    </div>
  );
}
