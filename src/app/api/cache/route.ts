import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const data = await db.getCache(key);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Get cache error:', error);
    return NextResponse.json({ error: 'Failed to get cache' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, data, expireSeconds } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    await db.setCache(key, data, expireSeconds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set cache error:', error);
    return NextResponse.json({ error: 'Failed to set cache' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const prefix = searchParams.get('prefix');

    if (prefix) {
      await db.clearExpiredCache(prefix);
    } else if (key) {
      await db.deleteCache(key);
    } else {
      return NextResponse.json({ error: 'Key or prefix is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete cache error:', error);
    return NextResponse.json({ error: 'Failed to delete cache' }, { status: 500 });
  }
}