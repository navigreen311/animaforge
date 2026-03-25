import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Seeding AnimaForge database…');

  // ── Organizations ──────────────────────────────────────────────────
  const animaForgeOrg = await prisma.organization.create({
    data: {
      name: 'AnimaForge Studio',
      slug: 'animaforge-studio',
      logoUrl: 'https://cdn.animaforge.io/logos/animaforge-studio.png',
      settings: {
        maxProjects: 50,
        ssoEnabled: true,
        allowedDomains: ['animaforge.io'],
      },
    },
  });

  const indieOrg = await prisma.organization.create({
    data: {
      name: 'Indie Creators',
      slug: 'indie-creators',
      logoUrl: 'https://cdn.animaforge.io/logos/indie-creators.png',
      settings: {
        maxProjects: 10,
        ssoEnabled: false,
      },
    },
  });

  // ── Users (5 across tiers & roles) ─────────────────────────────────
  const alice = await prisma.user.create({
    data: {
      email: 'alice.chen@animaforge.io',
      displayName: 'Alice Chen',
      avatarUrl: 'https://cdn.animaforge.io/avatars/alice.png',
      orgId: animaForgeOrg.id,
      role: 'admin',
      tier: 'enterprise',
      genMemory: { preferredModels: ['wan-2.1', 'kling-2.0'] },
      stylePrefs: { defaultAspectRatio: '16:9', motionIntensity: 'medium' },
      consentFlags: { marketingEmails: true, analyticsTracking: true },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob.martinez@example.com',
      displayName: 'Bob Martinez',
      avatarUrl: 'https://cdn.animaforge.io/avatars/bob.png',
      orgId: indieOrg.id,
      role: 'creator',
      tier: 'pro',
      genMemory: { preferredModels: ['wan-2.1'] },
      stylePrefs: { defaultAspectRatio: '9:16' },
      consentFlags: { marketingEmails: false, analyticsTracking: true },
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol.nakamura@animaforge.io',
      displayName: 'Carol Nakamura',
      avatarUrl: 'https://cdn.animaforge.io/avatars/carol.png',
      orgId: animaForgeOrg.id,
      role: 'editor',
      tier: 'studio',
      genMemory: {},
      stylePrefs: { defaultAspectRatio: '16:9', preferredStyleMode: 'anime' },
      consentFlags: { marketingEmails: true, analyticsTracking: false },
    },
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave.okafor@example.com',
      displayName: 'Dave Okafor',
      role: 'creator',
      tier: 'creator',
      genMemory: {},
      stylePrefs: {},
      consentFlags: { marketingEmails: false, analyticsTracking: false },
    },
  });

  const elena = await prisma.user.create({
    data: {
      email: 'elena.volkov@example.com',
      displayName: 'Elena Volkov',
      orgId: indieOrg.id,
      role: 'creator',
      tier: 'free',
      genMemory: {},
      stylePrefs: {},
      consentFlags: { marketingEmails: true, analyticsTracking: true },
    },
  });

  // ── Projects ───────────────────────────────────────────────────────
  const projectNova = await prisma.project.create({
    data: {
      ownerId: alice.id,
      orgId: animaForgeOrg.id,
      title: 'Project Nova',
      description: 'A 12-episode sci-fi series exploring first contact with an alien intelligence orbiting Europa.',
      worldBible: {
        setting: 'Near-future solar system, 2087',
        tone: 'Hard sci-fi with emotional undertones',
        visualStyle: 'Cinematic realism with volumetric lighting',
        keyLocations: ['Europa Station', 'Mission Control Houston', 'The Artifact Chamber'],
      },
      brandKit: {
        primaryColor: '#0A1628',
        accentColor: '#00D4FF',
        fontFamily: 'Inter',
        logoUrl: 'https://cdn.animaforge.io/brands/nova-logo.svg',
      },
      status: 'active',
      phase: 'production',
      modelVersion: 'wan-2.1-i2v-720p',
    },
  });

  const projectFable = await prisma.project.create({
    data: {
      ownerId: bob.id,
      orgId: indieOrg.id,
      title: 'Fable Engine',
      description: 'An interactive storybook series for children aged 5-8, featuring procedurally generated fairy tales.',
      worldBible: {
        setting: 'Enchanted forest kingdom',
        tone: 'Whimsical and warm',
        visualStyle: 'Watercolor illustration with soft edges',
        keyLocations: ['The Whispering Woods', 'Castle Luminara', 'Tinkerer\'s Workshop'],
      },
      brandKit: {
        primaryColor: '#4A2D6B',
        accentColor: '#FFB347',
        fontFamily: 'Quicksand',
        logoUrl: 'https://cdn.animaforge.io/brands/fable-logo.svg',
      },
      status: 'active',
      phase: 'pre_production',
    },
  });

  const projectVoid = await prisma.project.create({
    data: {
      ownerId: carol.id,
      orgId: animaForgeOrg.id,
      title: 'Void Runners',
      description: 'A cyberpunk music-video project blending anime aesthetics with synthwave audio-reactive visuals.',
      worldBible: {
        setting: 'Neo-Tokyo 2199',
        tone: 'Stylized, high energy',
        visualStyle: 'Anime-cel shading with neon glow',
        keyLocations: ['The Neon District', 'Sky Rail Station', 'Underground Arena'],
      },
      brandKit: {
        primaryColor: '#1A0A2E',
        accentColor: '#FF006E',
        fontFamily: 'Rajdhani',
        logoUrl: 'https://cdn.animaforge.io/brands/void-runners-logo.svg',
      },
      status: 'active',
      phase: 'production',
      modelVersion: 'kling-2.0-i2v-1080p',
    },
  });

  // ── Scenes (6 across 3 projects) ──────────────────────────────────
  const novaScene1 = await prisma.scene.create({
    data: { projectId: projectNova.id, title: 'Episode 1: First Light', order: 1 },
  });
  const novaScene2 = await prisma.scene.create({
    data: { projectId: projectNova.id, title: 'Episode 1: The Signal', order: 2 },
  });
  const fableScene1 = await prisma.scene.create({
    data: { projectId: projectFable.id, title: 'Chapter 1: Into the Woods', order: 1 },
  });
  const fableScene2 = await prisma.scene.create({
    data: { projectId: projectFable.id, title: 'Chapter 2: The Riddle Gate', order: 2 },
  });
  const voidScene1 = await prisma.scene.create({
    data: { projectId: projectVoid.id, title: 'Track 1: Ignition', order: 1 },
  });
  const voidScene2 = await prisma.scene.create({
    data: { projectId: projectVoid.id, title: 'Track 2: Overdrive', order: 2 },
  });

  // ── Shots (12 with varied statuses) ────────────────────────────────
  const shotData = [
    // Nova Scene 1
    {
      sceneId: novaScene1.id, projectId: projectNova.id, shotNumber: 1,
      sceneGraph: { camera: { position: [0, 1.8, -5], fov: 35 }, actors: ['commander_shaw'], lighting: 'volumetric_blue', bg: 'europa_surface' },
      prompt: 'Commander Shaw steps onto the ice plain of Europa, helmet visor reflecting distant Jupiter.',
      durationMs: 6000, status: 'approved', approvedBy: alice.id, approvedAt: new Date('2026-03-20'),
    },
    {
      sceneId: novaScene1.id, projectId: projectNova.id, shotNumber: 2,
      sceneGraph: { camera: { position: [2, 1.2, -3], fov: 50 }, actors: ['commander_shaw', 'dr_lin'], lighting: 'interior_warm', bg: 'station_corridor' },
      prompt: 'Shaw and Dr. Lin discuss the anomalous signal in the station corridor.',
      durationMs: 8000, status: 'approved', approvedBy: alice.id, approvedAt: new Date('2026-03-21'),
    },
    // Nova Scene 2
    {
      sceneId: novaScene2.id, projectId: projectNova.id, shotNumber: 3,
      sceneGraph: { camera: { position: [0, 0.5, -8], fov: 24 }, actors: [], lighting: 'bioluminescent', bg: 'artifact_chamber' },
      prompt: 'Wide shot of the alien artifact pulsing with bioluminescent light beneath the ice.',
      durationMs: 5000, status: 'locked',
    },
    {
      sceneId: novaScene2.id, projectId: projectNova.id, shotNumber: 4,
      sceneGraph: { camera: { position: [0, 1.6, -2], fov: 70 }, actors: ['dr_lin'], lighting: 'artifact_glow', bg: 'artifact_chamber' },
      prompt: 'Close-up of Dr. Lin reaching toward the artifact, hand trembling.',
      durationMs: 4000, status: 'draft',
    },
    // Fable Scene 1
    {
      sceneId: fableScene1.id, projectId: projectFable.id, shotNumber: 1,
      sceneGraph: { camera: { position: [0, 2, -6], fov: 40 }, actors: ['rosie_fox'], lighting: 'golden_hour', bg: 'whispering_woods_entrance' },
      prompt: 'Rosie the Fox peers through the mossy archway into the Whispering Woods.',
      durationMs: 5000, status: 'approved', approvedBy: bob.id, approvedAt: new Date('2026-03-18'),
    },
    {
      sceneId: fableScene1.id, projectId: projectFable.id, shotNumber: 2,
      sceneGraph: { camera: { position: [1, 1, -4], fov: 45 }, actors: ['rosie_fox', 'oak_guardian'], lighting: 'dappled_sunlight', bg: 'ancient_oak' },
      prompt: 'Rosie meets the Oak Guardian, who blocks the forest path with tangled roots.',
      durationMs: 7000, status: 'draft',
    },
    // Fable Scene 2
    {
      sceneId: fableScene2.id, projectId: projectFable.id, shotNumber: 3,
      sceneGraph: { camera: { position: [0, 1.5, -5], fov: 35 }, actors: ['rosie_fox'], lighting: 'mystical_fog', bg: 'riddle_gate' },
      prompt: 'The Riddle Gate materializes from swirling fog — ancient runes glow on its stone face.',
      durationMs: 6000, status: 'draft',
    },
    {
      sceneId: fableScene2.id, projectId: projectFable.id, shotNumber: 4,
      sceneGraph: { camera: { position: [0.5, 1, -2], fov: 60 }, actors: ['rosie_fox'], lighting: 'rune_glow', bg: 'riddle_gate' },
      prompt: 'Close-up: Rosie solves the riddle, runes rearranging into a doorway.',
      durationMs: 4500, status: 'locked',
    },
    // Void Scene 1
    {
      sceneId: voidScene1.id, projectId: projectVoid.id, shotNumber: 1,
      sceneGraph: { camera: { position: [0, 3, -10], fov: 28 }, actors: ['kira'], lighting: 'neon_pink_blue', bg: 'neon_district_aerial' },
      prompt: 'Aerial shot descending into the Neon District, holographic ads flickering in the rain.',
      durationMs: 5000, status: 'approved', approvedBy: carol.id, approvedAt: new Date('2026-03-22'),
    },
    {
      sceneId: voidScene1.id, projectId: projectVoid.id, shotNumber: 2,
      sceneGraph: { camera: { position: [1, 1.5, -3], fov: 50 }, actors: ['kira'], lighting: 'strobe_sync', bg: 'underground_arena' },
      prompt: 'Kira drops into the underground arena, synth beat synced to her movement.',
      durationMs: 4000, status: 'draft',
    },
    // Void Scene 2
    {
      sceneId: voidScene2.id, projectId: projectVoid.id, shotNumber: 3,
      sceneGraph: { camera: { position: [-2, 2, -6], fov: 35 }, actors: ['kira', 'ghost_rival'], lighting: 'laser_grid', bg: 'sky_rail_chase' },
      prompt: 'Sky Rail chase sequence — Kira grinds along a rail above the city, rival in pursuit.',
      durationMs: 7000, status: 'approved', approvedBy: alice.id, approvedAt: new Date('2026-03-23'),
    },
    {
      sceneId: voidScene2.id, projectId: projectVoid.id, shotNumber: 4,
      sceneGraph: { camera: { position: [0, 1.8, -1.5], fov: 85 }, actors: ['kira'], lighting: 'sunrise_neon_fade', bg: 'rooftop_vista' },
      prompt: 'Final frame: Kira stands on a rooftop as sunrise bleaches the neon skyline.',
      durationMs: 6000, status: 'locked',
    },
  ];

  for (const shot of shotData) {
    await prisma.shot.create({ data: shot });
  }

  // ── Characters (5 total: 2 digital twins, 3 regular) ──────────────
  await prisma.character.create({
    data: {
      ownerId: alice.id, projectId: projectNova.id,
      name: 'Commander Shaw',
      isDigitalTwin: true,
      faceModelUrl: 'https://cdn.animaforge.io/models/faces/shaw-v3.glb',
      bodyParams: { height: 1.82, build: 'athletic', skinTone: '#C68642' },
      hairParams: { style: 'buzz_cut', color: '#1A1A1A' },
      wardrobe: { default: 'eva_suit_blue', casual: 'station_jumpsuit' },
      voiceId: 'eleven_shaw_v2',
      styleMode: 'realistic',
      facsRigUrl: 'https://cdn.animaforge.io/rigs/shaw-facs-52.json',
      gltfUrl: 'https://cdn.animaforge.io/models/shaw-full.glb',
      rightsStatus: 'licensed',
    },
  });

  await prisma.character.create({
    data: {
      ownerId: alice.id, projectId: projectNova.id,
      name: 'Dr. Lin',
      isDigitalTwin: true,
      faceModelUrl: 'https://cdn.animaforge.io/models/faces/lin-v2.glb',
      bodyParams: { height: 1.65, build: 'slim', skinTone: '#F5D0A9' },
      hairParams: { style: 'shoulder_length', color: '#0D0D0D' },
      wardrobe: { default: 'lab_coat', field: 'arctic_parka' },
      voiceId: 'eleven_lin_v1',
      styleMode: 'realistic',
      facsRigUrl: 'https://cdn.animaforge.io/rigs/lin-facs-52.json',
      gltfUrl: 'https://cdn.animaforge.io/models/lin-full.glb',
      rightsStatus: 'licensed',
    },
  });

  await prisma.character.create({
    data: {
      ownerId: bob.id, projectId: projectFable.id,
      name: 'Rosie the Fox',
      isDigitalTwin: false,
      bodyParams: { height: 0.6, build: 'small_quadruped', furColor: '#D4652F' },
      hairParams: {},
      wardrobe: { default: 'green_scarf' },
      styleMode: 'stylized',
      rightsStatus: 'original',
    },
  });

  await prisma.character.create({
    data: {
      ownerId: bob.id, projectId: projectFable.id,
      name: 'Oak Guardian',
      isDigitalTwin: false,
      bodyParams: { height: 3.5, build: 'massive_tree_form', barkTexture: 'ancient_oak' },
      hairParams: { style: 'leaf_canopy', color: '#2D5A1E' },
      wardrobe: {},
      styleMode: 'stylized',
      rightsStatus: 'original',
    },
  });

  await prisma.character.create({
    data: {
      ownerId: carol.id, projectId: projectVoid.id,
      name: 'Kira',
      isDigitalTwin: false,
      bodyParams: { height: 1.7, build: 'lean', skinTone: '#E8C39E' },
      hairParams: { style: 'asymmetric_bob', color: '#FF006E', glowEffect: true },
      wardrobe: { default: 'cyber_jacket_neon', racing: 'speed_suit_v2' },
      voiceId: 'eleven_kira_v1',
      styleMode: 'anime',
      gltfUrl: 'https://cdn.animaforge.io/models/kira-full.glb',
      rightsStatus: 'original',
    },
  });

  // ── Style Packs ────────────────────────────────────────────────────
  await prisma.stylePack.create({
    data: {
      name: 'Cinematic Realism v2',
      creatorId: alice.id,
      fingerprint: {
        colorPalette: ['#0A1628', '#1C3A5F', '#00D4FF', '#FFFFFF'],
        lighting: 'volumetric',
        grain: 0.15,
        contrast: 'high',
        motionStyle: 'smooth_dolly',
      },
      sourceUrl: 'https://cdn.animaforge.io/styles/cinematic-realism-v2.safetensors',
      sourceType: 'video',
      isPublic: true,
      price: 9.99,
    },
  });

  await prisma.stylePack.create({
    data: {
      name: 'Watercolor Storybook',
      creatorId: bob.id,
      fingerprint: {
        colorPalette: ['#4A2D6B', '#FFB347', '#87CEEB', '#F5F5DC'],
        lighting: 'soft_diffuse',
        grain: 0.0,
        contrast: 'low',
        motionStyle: 'gentle_pan',
        edgeStyle: 'soft_bleed',
      },
      sourceUrl: 'https://cdn.animaforge.io/styles/watercolor-storybook.safetensors',
      sourceType: 'animation',
      isPublic: true,
      price: 4.99,
    },
  });

  await prisma.stylePack.create({
    data: {
      name: 'Neon Anime Cel',
      creatorId: carol.id,
      fingerprint: {
        colorPalette: ['#1A0A2E', '#FF006E', '#00FF9F', '#FFE500'],
        lighting: 'neon_rim',
        grain: 0.05,
        contrast: 'extreme',
        motionStyle: 'snap_cut',
        outlineWeight: 2.5,
      },
      sourceUrl: 'https://cdn.animaforge.io/styles/neon-anime-cel.safetensors',
      sourceType: 'animation',
      isPublic: false,
    },
  });

  // ── Consent Records ────────────────────────────────────────────────
  await prisma.consent.create({
    data: {
      subjectId: alice.id,
      grantedBy: alice.id,
      consentType: 'face',
      scope: 'commercial',
      expiresAt: new Date('2027-12-31'),
    },
  });

  await prisma.consent.create({
    data: {
      subjectId: alice.id,
      grantedBy: alice.id,
      consentType: 'voice',
      scope: 'commercial',
      expiresAt: new Date('2027-12-31'),
    },
  });

  await prisma.consent.create({
    data: {
      subjectId: alice.id,
      grantedBy: alice.id,
      consentType: 'likeness',
      scope: 'personal',
    },
  });

  await prisma.consent.create({
    data: {
      subjectId: bob.id,
      grantedBy: bob.id,
      consentType: 'face',
      scope: 'personal',
    },
  });

  // ── Subscriptions ──────────────────────────────────────────────────
  await prisma.subscription.create({
    data: {
      userId: alice.id,
      stripeId: 'sub_animaforge_alice_enterprise',
      tier: 'enterprise',
      status: 'active',
      currentPeriodEnd: new Date('2026-04-25'),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: bob.id,
      stripeId: 'sub_animaforge_bob_pro',
      tier: 'pro',
      status: 'active',
      currentPeriodEnd: new Date('2026-04-15'),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: carol.id,
      stripeId: 'sub_animaforge_carol_studio',
      tier: 'studio',
      status: 'active',
      currentPeriodEnd: new Date('2026-04-20'),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: dave.id,
      stripeId: 'sub_animaforge_dave_creator',
      tier: 'creator',
      status: 'active',
      currentPeriodEnd: new Date('2026-04-10'),
    },
  });

  // ── Usage Meters ───────────────────────────────────────────────────
  await prisma.usageMeter.create({
    data: { userId: alice.id, period: '2026-03', credits: 1842.5 },
  });

  await prisma.usageMeter.create({
    data: { userId: bob.id, period: '2026-03', credits: 347.0 },
  });

  await prisma.usageMeter.create({
    data: { userId: carol.id, period: '2026-03', credits: 921.75 },
  });

  await prisma.usageMeter.create({
    data: { userId: dave.id, period: '2026-03', credits: 52.0 },
  });

  await prisma.usageMeter.create({
    data: { userId: elena.id, period: '2026-03', credits: 8.5 },
  });

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
