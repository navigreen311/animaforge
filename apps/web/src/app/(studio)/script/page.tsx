'use client';

import { useState, useCallback } from 'react';
import { ScriptInput } from '@/components/script/ScriptInput';
import { ScriptOutput } from '@/components/script/ScriptOutput';
import { ShotBreakdown, type Shot } from '@/components/script/ShotBreakdown';
import { ScriptChat } from '@/components/script/ScriptChat';
import type { SceneGraph } from '@/components/script/SceneGraphPreview';

/* ------------------------------------------------------------------ */
/*  Mock data generators (to be replaced with real API calls)         */
/* ------------------------------------------------------------------ */

type ScriptLine = {
  type: 'character' | 'dialogue' | 'action' | 'direction';
  text: string;
};

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const MOCK_PROJECTS = [
  { id: 'proj-1', name: 'Neon Dreams' },
  { id: 'proj-2', name: 'Forest Spirit' },
  { id: 'proj-3', name: 'Cyberpunk Tales' },
];

function generateMockScript(): ScriptLine[] {
  return [
    { type: 'direction', text: 'INT. ROOFTOP - NIGHT' },
    { type: 'action', text: 'The city skyline glitters below. Wind tousles Maya\'s hair as she leans against the railing.' },
    { type: 'character', text: 'MAYA' },
    { type: 'dialogue', text: 'I never thought I\'d see this place again.' },
    { type: 'action', text: 'Kai steps out from the stairwell, hesitant.' },
    { type: 'character', text: 'KAI' },
    { type: 'dialogue', text: 'Some things don\'t change. The view is still the same.' },
    { type: 'action', text: 'Maya turns, surprise flickering across her face before settling into a guarded smile.' },
    { type: 'character', text: 'MAYA' },
    { type: 'dialogue', text: 'The view, maybe. Everything else...' },
    { type: 'action', text: 'She trails off, looking back at the skyline. A long beat of silence.' },
    { type: 'character', text: 'KAI' },
    { type: 'dialogue', text: 'I know. That\'s why I came back.' },
    { type: 'direction', text: 'SLOW PUSH IN on both characters standing side by side.' },
  ];
}

function generateMockShots(): Shot[] {
  return [
    {
      id: 'shot-1',
      number: 1,
      description: 'Establishing shot of the rooftop with city skyline',
      duration: '3s',
      cameraAngle: 'Wide',
      cameraMovement: 'Slow Pan Right',
      sceneGraph: {
        subject: 'City skyline at night',
        cameraAngle: 'Wide establishing',
        cameraMovement: 'Slow pan right',
        action: 'Ambient city movement',
        emotion: 'Contemplative, melancholic',
        timing: '0:00 - 0:03',
        dialogue: '',
      },
    },
    {
      id: 'shot-2',
      number: 2,
      description: 'Maya at the railing, wind in her hair',
      duration: '4s',
      cameraAngle: 'Medium Close-up',
      cameraMovement: 'Static',
      sceneGraph: {
        subject: 'Maya',
        cameraAngle: 'Medium close-up',
        cameraMovement: 'Static',
        action: 'Leaning on railing, gazing at skyline',
        emotion: 'Nostalgic, guarded',
        timing: '0:03 - 0:07',
        dialogue: 'I never thought I\'d see this place again.',
      },
    },
    {
      id: 'shot-3',
      number: 3,
      description: 'Kai emerges from stairwell',
      duration: '3s',
      cameraAngle: 'Over-the-shoulder',
      cameraMovement: 'Dolly Forward',
      sceneGraph: {
        subject: 'Kai',
        cameraAngle: 'Over-the-shoulder (from Maya)',
        cameraMovement: 'Dolly forward',
        action: 'Stepping out hesitantly',
        emotion: 'Uncertain, hopeful',
        timing: '0:07 - 0:10',
        dialogue: 'Some things don\'t change.',
      },
    },
    {
      id: 'shot-4',
      number: 4,
      description: 'Two-shot of Maya and Kai at the railing',
      duration: '5s',
      cameraAngle: 'Medium',
      cameraMovement: 'Slow Push In',
      sceneGraph: {
        subject: 'Maya and Kai',
        cameraAngle: 'Medium two-shot',
        cameraMovement: 'Slow push in',
        action: 'Standing side by side, looking at skyline',
        emotion: 'Bittersweet reunion',
        timing: '0:10 - 0:15',
        dialogue: 'I know. That\'s why I came back.',
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ScriptPage() {
  const [selectedProject, setSelectedProject] = useState(MOCK_PROJECTS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleGenerate = useCallback(
    async (_description: string, _characterIds: string[]) => {
      setIsGenerating(true);
      // Simulate AI generation delay
      await new Promise((r) => setTimeout(r, 2000));
      setScriptLines(generateMockScript());
      setShots(generateMockShots());
      setIsGenerating(false);
    },
    []
  );

  const handleRegenerate = useCallback(async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setScriptLines(generateMockScript());
    setShots(generateMockShots());
    setIsGenerating(false);
  }, []);

  const handleSendToTimeline = useCallback((shotId: string) => {
    // TODO: integrate with timeline API
    console.log('Send to timeline:', shotId);
  }, []);

  const handleSendAllToTimeline = useCallback(() => {
    // TODO: integrate with timeline API
    console.log('Send all shots to timeline');
  }, []);

  const handleEditSceneGraph = useCallback(
    (shotId: string, _graph: SceneGraph) => {
      // TODO: open edit modal
      console.log('Edit scene graph for shot:', shotId);
    },
    []
  );

  const handleChatSend = useCallback(async (message: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    // Simulate AI response
    await new Promise((r) => setTimeout(r, 1200));

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'ai',
      content: `I've noted your request to "${message.toLowerCase()}". The script has been updated with those changes. Let me know if you'd like further adjustments.`,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, aiMsg]);
    setIsChatLoading(false);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">
            Script AI Assistant
          </h1>
          <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-400">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="project-selector" className="text-xs text-zinc-500">
            Project
          </label>
          <select
            id="project-selector"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 outline-none transition focus:border-violet-500"
          >
            {MOCK_PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Input + Chat */}
        <div className="flex w-[440px] shrink-0 flex-col border-r border-zinc-800">
          <div className="flex-1 overflow-y-auto p-5">
            <ScriptInput
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Script Output in Left Panel */}
          <div className="border-t border-zinc-800 p-5 overflow-y-auto max-h-[300px]">
            <ScriptOutput
              lines={scriptLines}
              onRegenerate={handleRegenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Chat */}
          <div className="border-t border-zinc-800 p-4">
            <ScriptChat
              messages={chatMessages}
              onSend={handleChatSend}
              isLoading={isChatLoading}
            />
          </div>
        </div>

        {/* Right Panel: Shot Breakdown + Scene Graphs */}
        <div className="flex-1 overflow-y-auto p-6">
          <ShotBreakdown
            shots={shots}
            onSendToTimeline={handleSendToTimeline}
            onSendAllToTimeline={handleSendAllToTimeline}
            onEditSceneGraph={handleEditSceneGraph}
          />
        </div>
      </div>
    </div>
  );
}
