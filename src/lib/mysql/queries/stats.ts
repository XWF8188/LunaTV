import { executeQuery, executeUpdate } from '../connection';
import { UserCardKey, CardKeyType, CardKeyStatus } from '../../types';

export interface UserCardKeyRow {
  id: string;
  key_hash: string;
  username: string;
  key_type: CardKeyType;
  status: CardKeyStatus;
  source: 'invitation' | 'redeem' | 'manual';
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
  used_by: string | null;
  notes: string | null;
}

export interface UserLoginStatsRow {
  id: number;
  username: string;
  login_count: number;
  first_login_at: Date | null;
  last_login_at: Date | null;
  last_login_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export function mapUserCardKeyRowToUserCardKey(
  row: UserCardKeyRow,
): UserCardKey {
  return {
    id: row.id,
    keyHash: row.key_hash,
    username: row.username,
    type: row.key_type,
    status: row.status,
    source: row.source,
    createdAt: Math.floor(new Date(row.created_at).getTime()),
    expiresAt: Math.floor(new Date(row.expires_at).getTime()),
    usedAt: row.used_at
      ? Math.floor(new Date(row.used_at).getTime())
      : undefined,
    usedBy: row.used_by || undefined,
    notes: row.notes || undefined,
  };
}

export async function createUserCardKey(cardKey: UserCardKey): Promise<void> {
  await executeUpdate(
    `INSERT INTO user_card_keys 
     (id, key_hash, username, key_type, status, source, expires_at, used_at, used_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cardKey.id,
      cardKey.keyHash,
      cardKey.username,
      cardKey.type,
      cardKey.status,
      cardKey.source,
      new Date(cardKey.expiresAt),
      cardKey.usedAt ? new Date(cardKey.usedAt) : null,
      cardKey.usedBy || null,
      cardKey.notes || null,
    ],
  );
}

export async function getUserCardKeys(
  username: string,
): Promise<UserCardKeyRow[]> {
  return executeQuery<UserCardKeyRow>(
    'SELECT * FROM user_card_keys WHERE username = ? ORDER BY created_at DESC',
    [username],
  );
}

export async function getUserCardKeyById(
  id: string,
): Promise<UserCardKeyRow | null> {
  const rows = await executeQuery<UserCardKeyRow>(
    'SELECT * FROM user_card_keys WHERE id = ?',
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateUserCardKey(
  id: string,
  updates: Partial<UserCardKey>,
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.expiresAt !== undefined) {
    setClauses.push('expires_at = ?');
    values.push(new Date(updates.expiresAt));
  }
  if (updates.usedAt !== undefined) {
    setClauses.push('used_at = ?');
    values.push(updates.usedAt ? new Date(updates.usedAt) : null);
  }
  if (updates.usedBy !== undefined) {
    setClauses.push('used_by = ?');
    values.push(updates.usedBy || null);
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes = ?');
    values.push(updates.notes || null);
  }

  if (setClauses.length === 0) return false;

  values.push(id);
  const result = await executeUpdate(
    `UPDATE user_card_keys SET ${setClauses.join(', ')} WHERE id = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function getActiveUserCardKey(
  username: string,
): Promise<UserCardKeyRow | null> {
  const rows = await executeQuery<UserCardKeyRow>(
    `SELECT * FROM user_card_keys 
     WHERE username = ? AND status = 'used' AND expires_at > NOW()
     ORDER BY expires_at DESC LIMIT 1`,
    [username],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getOrCreateUserLoginStats(
  username: string,
): Promise<UserLoginStatsRow> {
  const rows = await executeQuery<UserLoginStatsRow>(
    'SELECT * FROM user_login_stats WHERE username = ?',
    [username],
  );

  if (rows.length > 0) {
    return rows[0];
  }

  await executeUpdate('INSERT INTO user_login_stats (username) VALUES (?)', [
    username,
  ]);

  const newRows = await executeQuery<UserLoginStatsRow>(
    'SELECT * FROM user_login_stats WHERE username = ?',
    [username],
  );
  return newRows[0];
}

export async function updateUserLoginStats(
  username: string,
  loginTime: number,
  isFirstLogin: boolean = false,
): Promise<void> {
  const loginDate = new Date(loginTime);
  const dateOnly = loginDate.toISOString().split('T')[0];

  await executeUpdate(
    `INSERT INTO user_login_stats (username, login_count, first_login_at, last_login_at, last_login_date)
     VALUES (?, 1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       login_count = login_count + 1,
       first_login_at = COALESCE(first_login_at, ?),
       last_login_at = ?,
       last_login_date = ?`,
    [username, loginDate, loginDate, dateOnly, loginDate, loginDate, dateOnly],
  );
}

export async function getUserLoginStats(
  username: string,
): Promise<UserLoginStatsRow | null> {
  const rows = await executeQuery<UserLoginStatsRow>(
    'SELECT * FROM user_login_stats WHERE username = ?',
    [username],
  );
  return rows.length > 0 ? rows[0] : null;
}
