import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id, status: 'verified', sslStatus: 'issued' });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ deleted: true, id: params.id });
}

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id, verified: true, sslStatus: 'issued' });
}
