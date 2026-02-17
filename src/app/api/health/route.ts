import { NextResponse } from 'next/server';

import { getMysqlPool, testMysqlConnection } from '@/lib/mysql/connection';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    services: {
      mysql: {
        status: 'unknown',
        connected: false,
        latency: null as number | null,
      },
      redis: {
        status: 'unknown',
        connected: false,
        latency: null as number | null,
      },
    },
  };

  if (process.env.NEXT_PUBLIC_STORAGE_TYPE === 'mysql-redis') {
    try {
      const start = Date.now();
      const mysqlOk = await testMysqlConnection();
      const latency = Date.now() - start;

      health.services.mysql = {
        status: mysqlOk ? 'healthy' : 'unhealthy',
        connected: mysqlOk,
        latency,
      };
    } catch (error) {
      health.services.mysql = {
        status: 'error',
        connected: false,
        latency: null,
      };
    }

    try {
      const { createClient } = await import('redis');
      const redisUrl = process.env.REDIS_URL;

      if (redisUrl) {
        const start = Date.now();
        const client = createClient({ url: redisUrl });
        await client.connect();
        await client.ping();
        const latency = Date.now() - start;
        await client.disconnect();

        health.services.redis = {
          status: 'healthy',
          connected: true,
          latency,
        };
      } else {
        health.services.redis = {
          status: 'not_configured',
          connected: false,
          latency: null,
        };
      }
    } catch (error) {
      health.services.redis = {
        status: 'error',
        connected: false,
        latency: null,
      };
    }
  }

  const allHealthy =
    health.storage !== 'mysql-redis' ||
    (health.services.mysql.connected && health.services.redis.connected);

  health.status = allHealthy ? 'ok' : 'degraded';

  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function POST() {
  try {
    if (process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'mysql-redis') {
      return NextResponse.json({
        success: false,
        message: 'Storage type is not mysql-redis',
      });
    }

    const pool = getMysqlPool();

    const [tables] = await pool.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    const tablesArray = (tables as { table_name: string }[]).map(
      (t) => t.table_name,
    );

    const expectedTables = [
      'users',
      'card_keys',
      'user_card_keys',
      'play_records',
      'favorites',
      'episode_skip_configs',
      'user_points',
      'points_records',
      'invitations',
      'ip_reward_records',
      'admin_configs',
      'user_login_stats',
      'content_stats',
      'invitation_configs',
      'content_viewers',
    ];

    const missingTables = expectedTables.filter(
      (t) => !tablesArray.includes(t),
    );

    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Database schema is incomplete',
        existingTables: tablesArray,
        missingTables,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema is complete',
      tablesCount: tablesArray.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Database check failed',
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
