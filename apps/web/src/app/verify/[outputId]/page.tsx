import VerificationBadge from '@/components/verify/VerificationBadge';
import ManifestViewer from '@/components/verify/ManifestViewer';
import ProvenanceTimeline from '@/components/verify/ProvenanceTimeline';

interface VerifyPageProps {
  params: Promise<{ outputId: string }>;
}

const mockVerification = {
  verified: true,
  outputId: 'out_abc123def456',
  generator: 'AnimaForge v2.1',
  createdAt: 'March 25, 2026 at 8:35 AM UTC',
  model: 'animaforge-v2',
  projectInfo: 'Animation Project #4821',
  inputHash: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  consentStatus: 'All likenesses approved',
  watermarkDetected: true,
};

const mockManifest = [
  {
    label: 'Claim Generator',
    value: 'AnimaForge/2.1.0',
  },
  {
    label: 'Signature',
    children: [
      { label: 'Algorithm', value: 'ES256' },
      { label: 'Issuer', value: 'AnimaForge Inc.' },
      { label: 'Certificate', value: 'CN=animaforge.ai, O=AnimaForge Inc.' },
    ],
  },
  {
    label: 'Actions',
    children: [
      { label: 'Action', value: 'c2pa.created' },
      { label: 'Software Agent', value: 'AnimaForge Generation Engine v2.1' },
      { label: 'Digital Source Type', value: 'trainedAlgorithmicMedia' },
    ],
  },
  {
    label: 'Assertions',
    children: [
      { label: 'AI Generated', value: 'true' },
      { label: 'Model', value: 'animaforge-v2' },
      { label: 'Training Data', value: 'Licensed + Synthetic' },
      {
        label: 'Consent Records',
        children: [
          { label: 'Likeness: Kira', value: 'Approved (perpetual)' },
        ],
      },
    ],
  },
];

const mockTimeline = [
  {
    label: 'Project Created',
    timestamp: 'Mar 20, 2026 - 2:00 PM',
    description: 'Animation project initialized with script and storyboard.',
    status: 'completed' as const,
  },
  {
    label: 'Character Consent Verified',
    timestamp: 'Mar 21, 2026 - 10:30 AM',
    description: 'Likeness consent confirmed for all referenced characters.',
    status: 'completed' as const,
  },
  {
    label: 'Generation Submitted',
    timestamp: 'Mar 25, 2026 - 8:30 AM',
    description: 'Shot generation job submitted to AnimaForge engine.',
    status: 'completed' as const,
  },
  {
    label: 'Content Generated',
    timestamp: 'Mar 25, 2026 - 8:35 AM',
    description: 'AI-generated content produced with C2PA manifest attached.',
    status: 'completed' as const,
  },
  {
    label: 'Watermark Embedded',
    timestamp: 'Mar 25, 2026 - 8:35 AM',
    description: 'Invisible watermark embedded for provenance tracking.',
    status: 'completed' as const,
  },
  {
    label: 'Public Verification Available',
    timestamp: 'Mar 25, 2026 - 8:36 AM',
    description: 'Verification page published for public access.',
    status: 'current' as const,
  },
];

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { outputId } = await params;
  const verification = { ...mockVerification, outputId };

  return (
    <html lang="en" className="light">
      <body className="bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xl font-bold text-gray-900">AnimaForge</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Content Verification</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Output ID: <code className="text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded text-xs font-mono">{verification.outputId}</code>
            </p>
          </div>

          {/* Verification Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 text-center">
            <div className="flex justify-center mb-3">
              <VerificationBadge verified={verification.verified} size="lg" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {verification.verified ? 'Content Verified' : 'Content Unverified'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {verification.verified
                ? 'This content has a valid C2PA manifest and passes all integrity checks.'
                : 'This content could not be verified. The manifest may be missing or tampered with.'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* C2PA Manifest Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Generation Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Generator</dt>
                  <dd className="text-sm font-medium text-gray-900">{verification.generator}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Created</dt>
                  <dd className="text-sm font-medium text-gray-900">{verification.createdAt}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Model</dt>
                  <dd className="text-sm font-medium text-gray-900">{verification.model}</dd>
                </div>
              </dl>
            </div>

            {/* Content Metadata */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Content Metadata</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Project</dt>
                  <dd className="text-sm font-medium text-gray-900">{verification.projectInfo}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Input Hash</dt>
                  <dd className="text-xs font-mono text-gray-600 break-all">{verification.inputHash}</dd>
                </div>
              </dl>
            </div>

            {/* Consent Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Consent Status</h3>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-gray-900">{verification.consentStatus}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                All individuals whose likeness appears in this content have given explicit consent.
              </p>
            </div>

            {/* Watermark Detection */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Watermark Detection</h3>
              <div className="flex items-center gap-2">
                {verification.watermarkDetected ? (
                  <>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Watermark Detected</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">No Watermark Found</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Invisible watermark used for tracking provenance across distribution channels.
              </p>
            </div>
          </div>

          {/* C2PA Manifest Tree */}
          <div className="mb-6">
            <ManifestViewer manifest={mockManifest} />
          </div>

          {/* Provenance Timeline */}
          <div className="mb-8">
            <ProvenanceTimeline steps={mockTimeline} />
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-amber-800">
              This content was AI-generated by AnimaForge.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              AnimaForge attaches C2PA manifests and invisible watermarks to all generated content for transparency and provenance verification.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              AnimaForge Content Verification System &middot; Powered by C2PA
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
