// ============================================================
// Mock Agent Endpoint (Developer Simulation Stub)
// Routes mock resolution requests through the mockAgent engine.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runMockSimulation } from '@/lib/mockAgent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = runMockSimulation(body);

    return NextResponse.json({
      success: true,
      source: 'mock_simulation',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        source: 'mock_simulation',
        error: `Mock agent error: ${err instanceof Error ? err.message : 'Unknown'}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
