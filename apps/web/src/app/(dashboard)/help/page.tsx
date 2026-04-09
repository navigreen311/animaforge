'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Article {
  id: string;
  title: string;
  category: string;
  readingTime: string;
  content: string;
}

interface Category {
  name: string;
  count: number;
}

const CATEGORIES: Category[] = [
  { name: 'Getting Started', count: 5 },
  { name: 'Projects & Timeline', count: 8 },
  { name: 'Script AI', count: 4 },
  { name: 'Style Studio', count: 6 },
  { name: 'Avatar Studio', count: 7 },
  { name: 'Audio Studio', count: 5 },
  { name: 'Asset Library', count: 4 },
  { name: 'Brand Kit', count: 3 },
  { name: 'Team', count: 5 },
  { name: 'Billing', count: 6 },
  { name: 'API', count: 4 },
  { name: 'Troubleshooting', count: 8 },
];

const ARTICLES: Article[] = [
  {
    id: 'quick-start',
    title: 'Quick start: your first animation in 10 minutes',
    category: 'Getting Started',
    readingTime: '4 min',
    content: `Welcome to AnimaForge! This guide walks you through creating your very first animation from scratch.\n\n**Step 1 — Create a project**\nClick the "+ New Project" button in the dashboard. Give it a name (e.g., "My First Animation") and select a resolution. We recommend starting with 1080p.\n\n**Step 2 — Write a script**\nHead to the Script AI tab. Describe what you want your animation to show — for example: "A friendly robot waves hello in a sunny park." The AI will generate a structured script with scenes, dialogue, and camera directions. Review it, tweak anything you like, then confirm.\n\n**Step 3 — Generate characters**\nOpen Avatar Studio. You can create a character from a text description or upload reference images. For our robot example, type "cute friendly robot, rounded body, blue eyes" and hit Generate. Pick your favorite variant.\n\n**Step 4 — Build the timeline**\nSwitch to the Timeline view. Drag your script scenes onto the timeline. Each scene block shows its duration and assigned characters. You can adjust timing by dragging edges.\n\n**Step 5 — Add audio**\nOpen Audio Studio to generate a voiceover for any dialogue. You can also add background music from the built-in library or generate a custom track.\n\n**Step 6 — Preview & render**\nHit the Preview button to see a low-res draft. Happy with it? Click Render and choose your output format (MP4, GIF, or WebM). Your finished animation will appear in the project's Exports tab.\n\nCongratulations — you just made your first animation with AnimaForge!`,
  },
  {
    id: 'understanding-credits',
    title: 'Understanding credits',
    category: 'Billing',
    readingTime: '3 min',
    content: `AnimaForge uses a credit system to track usage of AI-powered features.\n\n**What costs credits?**\n- Script AI generation: 1 credit per script generation or revision\n- Avatar creation: 2 credits per character variant\n- Style transfer: 3 credits per style application\n- Audio generation: 1 credit per voiceover or music track\n- Final render: 5 credits for 720p, 10 credits for 1080p, 20 credits for 4K\n\n**What is free?**\nTimeline editing, asset browsing, project management, team collaboration features, and previews do not cost credits.\n\n**How do I check my balance?**\nYour credit balance is always visible in the top-right corner of the dashboard. Click it to see a detailed usage breakdown by day, week, or month.\n\n**Buying more credits**\nGo to Settings > Billing > Buy Credits. Credits are available in packs: 50 ($9), 200 ($29), 500 ($59), or 1,200 ($99). Unused credits roll over month to month and never expire.\n\n**Team plans**\nOn team plans, credits are shared across all members. The team owner can set per-member monthly limits under Team > Usage Limits.\n\n**Pro tip:** Use previews liberally before rendering. Previews are free and help you catch issues before spending render credits.`,
  },
  {
    id: 'generation-failed',
    title: 'Generation failed -- what to do',
    category: 'Troubleshooting',
    readingTime: '3 min',
    content: `If you see a "Generation Failed" error, don't worry — here are the most common causes and how to fix them.\n\n**1. Content policy filter**\nAnimaForge has content safety filters. If your prompt was flagged, you'll see a specific message. Try rephrasing your description to be more specific and less ambiguous. Avoid terms that could be interpreted as violent or inappropriate.\n\n**2. Timeout on complex scenes**\nScenes with more than 5 characters or very long durations (over 60 seconds) may time out. Split them into shorter scenes on the timeline — this also gives you better creative control.\n\n**3. Insufficient credits**\nCheck your credit balance. If you are at zero, the generation will fail with a "No credits remaining" message. Purchase more credits under Settings > Billing.\n\n**4. Server load**\nDuring peak hours, generation queues may be full. You will see a "Queue full, please retry" message. Wait 2-3 minutes and try again. You can also schedule renders for off-peak hours (typically 2-6 AM UTC).\n\n**5. Browser issues**\nSome ad blockers or privacy extensions can interfere with our API calls. Try disabling extensions or using an incognito window.\n\n**If nothing works:**\n- Check our status page at status.animaforge.io\n- Open a support ticket via the feedback widget (bottom-right corner)\n- Include your project ID (found in Settings > Project Info) so we can investigate faster\n\nWe aim to respond to all support requests within 4 hours during business days.`,
  },
  {
    id: 'getting-started-overview',
    title: 'Platform overview',
    category: 'Getting Started',
    readingTime: '2 min',
    content: 'AnimaForge is an AI-powered animation platform that lets you go from idea to finished animation in minutes. Explore the dashboard to discover Script AI, Avatar Studio, Style Studio, Audio Studio, and more.',
  },
  {
    id: 'timeline-basics',
    title: 'Timeline basics: tracks, clips, and keyframes',
    category: 'Projects & Timeline',
    readingTime: '5 min',
    content: 'The timeline is where you arrange your animation. Each row is a track (video, audio, effects). Drag clips to reorder, resize edges to trim, and double-click to add keyframes for position, opacity, and scale.',
  },
  {
    id: 'script-ai-tips',
    title: 'Writing effective prompts for Script AI',
    category: 'Script AI',
    readingTime: '3 min',
    content: 'Be specific about mood, setting, and character actions. Use short paragraphs for each scene. Include camera directions like "close-up" or "wide shot" for better results.',
  },
  {
    id: 'style-transfer',
    title: 'Applying style transfer to your project',
    category: 'Style Studio',
    readingTime: '4 min',
    content: 'Style Studio lets you apply a consistent visual look across all scenes. Upload a reference image or choose from built-in styles. The AI will adapt colors, textures, and lighting to match.',
  },
  {
    id: 'avatar-customization',
    title: 'Customizing avatars with expressions and poses',
    category: 'Avatar Studio',
    readingTime: '5 min',
    content: 'After generating a base avatar, use the expression editor to create smile, surprise, and talk variants. The pose library lets you set standing, sitting, walking, and custom poses.',
  },
  {
    id: 'audio-voiceover',
    title: 'Generating voiceovers and sound effects',
    category: 'Audio Studio',
    readingTime: '3 min',
    content: 'Paste your dialogue text, choose a voice profile, and adjust speed and pitch. For sound effects, describe what you need ("footsteps on gravel") and the AI will generate matching audio.',
  },
  {
    id: 'asset-library-usage',
    title: 'Browsing and importing assets',
    category: 'Asset Library',
    readingTime: '2 min',
    content: 'The Asset Library contains backgrounds, props, and UI elements. Use search or browse by category. Drag any asset directly onto the timeline or canvas.',
  },
  {
    id: 'brand-kit-setup',
    title: 'Setting up your Brand Kit',
    category: 'Brand Kit',
    readingTime: '3 min',
    content: 'Upload your logo, define brand colors, and select fonts. These are automatically available across all projects so every animation stays on-brand.',
  },
  {
    id: 'team-collaboration',
    title: 'Inviting team members and managing roles',
    category: 'Team',
    readingTime: '3 min',
    content: 'Go to Team settings to invite members by email. Assign roles: Viewer (read-only), Editor (can edit projects), or Admin (full access including billing).',
  },
  {
    id: 'api-getting-started',
    title: 'API quickstart',
    category: 'API',
    readingTime: '5 min',
    content: 'Generate an API key under Settings > API. Use our REST endpoints to create projects, trigger renders, and fetch results programmatically. See the full API reference at docs.animaforge.io.',
  },
  {
    id: 'troubleshooting-slow',
    title: 'Renders are slow — how to speed them up',
    category: 'Troubleshooting',
    readingTime: '2 min',
    content: 'Reduce resolution during drafts, limit scenes to under 30 seconds each, and close unused browser tabs. Batch rendering during off-peak hours also helps.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, 'up' | 'down'>>({});

  const filteredArticles = useMemo(() => {
    let results = ARTICLES;
    if (selectedCategory) {
      results = results.filter((a) => a.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((a) => a.title.toLowerCase().includes(q));
    }
    return results;
  }, [search, selectedCategory]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left sidebar ──────────────────────────────── */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: '0.5px solid var(--border)',
          padding: '24px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-overlay)',
            border: '0.5px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: selectedCategory === null ? 'var(--bg-active)' : 'transparent',
              color: selectedCategory === null ? 'var(--text-brand)' : 'var(--text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span>All articles</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ARTICLES.length}</span>
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: selectedCategory === cat.name ? 'var(--bg-active)' : 'transparent',
                color: selectedCategory === cat.name ? 'var(--text-brand)' : 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span>{cat.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{cat.count}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Help Center
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-secondary)' }}>
          {selectedCategory ? selectedCategory : 'All articles'} &middot; {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
        </p>

        {filteredArticles.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 40, textAlign: 'center' }}>
            No articles found. Try a different search term.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredArticles.map((article) => {
            const isExpanded = expandedArticle === article.id;
            return (
              <div
                key={article.id}
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '0.5px solid var(--border)',
                  background: isExpanded ? 'var(--bg-overlay)' : 'var(--bg-surface)',
                  overflow: 'hidden',
                }}
              >
                {/* Article header */}
                <button
                  type="button"
                  onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {article.title}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--brand-dim)',
                      color: 'var(--brand-light)',
                    }}
                  >
                    {article.category}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {article.readingTime}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 20px 40px' }}>
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {article.content}
                    </div>

                    {/* Helpful? */}
                    <div
                      style={{
                        marginTop: 20,
                        paddingTop: 16,
                        borderTop: '0.5px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          Was this helpful?
                        </span>
                        <button
                          type="button"
                          onClick={() => setHelpfulVotes((v) => ({ ...v, [article.id]: 'up' }))}
                          style={{
                            background: helpfulVotes[article.id] === 'up' ? 'var(--status-complete-bg)' : 'transparent',
                            border: '0.5px solid var(--border-strong)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: helpfulVotes[article.id] === 'up' ? 'var(--status-complete-text)' : 'var(--text-tertiary)',
                          }}
                          aria-label="Helpful"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHelpfulVotes((v) => ({ ...v, [article.id]: 'down' }))}
                          style={{
                            background: helpfulVotes[article.id] === 'down' ? 'rgba(239,68,68,0.12)' : 'transparent',
                            border: '0.5px solid var(--border-strong)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: helpfulVotes[article.id] === 'down' ? '#f87171' : 'var(--text-tertiary)',
                          }}
                          aria-label="Not helpful"
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </div>

                      <a
                        href="mailto:support@animaforge.io"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: 'var(--text-brand)',
                          textDecoration: 'none',
                        }}
                      >
                        Still need help? Contact support <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
