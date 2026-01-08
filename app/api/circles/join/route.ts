import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };

    const { circleId } = await request.json();
    if (!circleId) {
      return NextResponse.json({ error: 'Circle ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    await client.query('INSERT INTO circle_members (circle_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [circleId, decoded.userId]);
    client.release();

    return NextResponse.json({ message: 'Joined circle successfully' });
  } catch (error) {
    console.error('Join circle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
