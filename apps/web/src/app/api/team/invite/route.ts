import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  POST /api/team/invite                                             */
/*  Send team invitations to one or more email addresses              */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails, role, projectIds, creditLimit, message } = body as {
      emails: string[];
      role: string;
      projectIds?: string[];
      creditLimit?: number;
      message?: string;
    };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 },
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const invitations = emails.map((email, index) => ({
      id: `inv_${Date.now()}_${index}`,
      email,
      role,
      status: 'pending' as const,
      sentAt: now,
      ...(projectIds && { projectIds }),
      ...(creditLimit !== undefined && { creditLimit }),
      ...(message && { message }),
    }));

    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
