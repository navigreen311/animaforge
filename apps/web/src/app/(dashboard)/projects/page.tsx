'use client';

import { useState } from 'react';
import ProjectCard from '@/components/shared/ProjectCard';
import Modal from '@/components/shared/Modal';
import type { BadgeStatus } from '@/components/shared/Badge';

interface Project {
  id: string;
  title: string;
  description: string;
  phase: BadgeStatus;
  shotCount: number;
  lastUpdated: string;
}

// Placeholder data - replace with API calls
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Cyber Samurai: Origin',
    description: 'A cyberpunk short film following a ronin through neon-lit streets of Neo-Tokyo in 2087.',
    phase: 'generating',
    shotCount: 24,
    lastUpdated: '2 hours ago',
  },
  {
    id: '2',
    title: 'The Last Garden',
    description: 'An animated meditation on nature reclaiming a post-industrial landscape.',
    phase: 'review',
    shotCount: 16,
    lastUpdated: '1 day ago',
  },
  {
    id: '3',
    title: 'Echoes of Tomorrow',
    description: 'Sci-fi drama exploring memory transfer technology and its impact on identity.',
    phase: 'draft',
    shotCount: 0,
    lastUpdated: '3 days ago',
  },
];

export default function ProjectsPage() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const projects = mockProjects;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">My Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewProjectOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Project grid or empty state */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              title={project.title}
              description={project.description}
              phase={project.phase}
              shotCount={project.shotCount}
              lastUpdated={project.lastUpdated}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-1">No projects yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Create your first project to start generating AI-powered animated scenes.
          </p>
          <button
            type="button"
            onClick={() => setIsNewProjectOpen(true)}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create First Project
          </button>
        </div>
      )}

      {/* New Project Modal */}
      <Modal isOpen={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} title="New Project">
        <form className="space-y-4">
          <div>
            <label htmlFor="project-title" className="block text-sm font-medium text-gray-300 mb-1.5">
              Project Title
            </label>
            <input
              id="project-title"
              type="text"
              placeholder="Enter project title..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="project-desc" className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              id="project-desc"
              rows={3}
              placeholder="Describe your project..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsNewProjectOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
