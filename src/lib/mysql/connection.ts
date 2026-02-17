import mysql, { Pool, PoolConnection } from 'mysql2/promise';

interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

const defaultConfig: MySQLConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'moontv',
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '20', 10),
};

let pool: Pool | null = null;

const GLOBAL_POOL_SYMBOL = Symbol.for('__MOONTV_MYSQL_POOL__');

export function getMysqlPool(): Pool {
  if ((global as any)[GLOBAL_POOL_SYMBOL]) {
    return (global as any)[GLOBAL_POOL_SYMBOL];
  }

  if (!pool) {
    pool = mysql.createPool({
      host: defaultConfig.host,
      port: defaultConfig.port,
      user: defaultConfig.user,
      password: defaultConfig.password,
      database: defaultConfig.database,
      waitForConnections: true,
      connectionLimit: defaultConfig.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      charset: 'utf8mb4',
      timezone: '+08:00',
    });

    (global as any)[GLOBAL_POOL_SYMBOL] = pool;
    console.log('[MySQL] Connection pool created');
  }

  return pool;
}

export async function closeMysqlPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    (global as any)[GLOBAL_POOL_SYMBOL] = null;
    console.log('[MySQL] Connection pool closed');
  }
}

export async function testMysqlConnection(): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('[MySQL] Connection test successful');
    return true;
  } catch (error) {
    console.error('[MySQL] Connection test failed:', error);
    return false;
  }
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const pool = getMysqlPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getMysqlPool();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = (await pool.execute(sql, params)) as any;
  return rows as T[];
}

export async function executeUpdate(
  sql: string,
  params?: unknown[],
): Promise<{ affectedRows: number; insertId: number }> {
  const pool = getMysqlPool();
  const [result] = await pool.execute(sql, params);
  return {
    affectedRows: (result as { affectedRows: number }).affectedRows,
    insertId: (result as { insertId: number }).insertId,
  };
}

export type { Pool, PoolConnection };
