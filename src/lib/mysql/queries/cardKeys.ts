import { executeQuery, executeUpdate } from '../connection';
import { CardKey, CardKeyType, CardKeyStatus } from '../../types';

export interface CardKeyRow {
  id: number;
  key_hash: string;
  plain_key: string;
  key_type: CardKeyType;
  status: CardKeyStatus;
  created_at: Date;
  expires_at: Date;
  bound_to: string | null;
  bound_at: Date | null;
}

export function mapCardKeyRowToCardKey(row: CardKeyRow): CardKey {
  return {
    key: row.plain_key,
    keyHash: row.key_hash,
    keyType: row.key_type,
    status: row.status,
    createdAt: Math.floor(new Date(row.created_at).getTime()),
    expiresAt: Math.floor(new Date(row.expires_at).getTime()),
    boundTo: row.bound_to || undefined,
    boundAt: row.bound_at
      ? Math.floor(new Date(row.bound_at).getTime())
      : undefined,
  };
}

export async function createCardKey(cardKey: CardKey): Promise<number> {
  const result = await executeUpdate(
    `INSERT INTO card_keys (key_hash, plain_key, key_type, status, expires_at, bound_to, bound_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cardKey.keyHash,
      cardKey.key,
      cardKey.keyType,
      cardKey.status,
      new Date(cardKey.expiresAt),
      cardKey.boundTo || null,
      cardKey.boundAt ? new Date(cardKey.boundAt) : null,
    ],
  );
  return result.insertId;
}

export async function getCardKey(keyHash: string): Promise<CardKeyRow | null> {
  const rows = await executeQuery<CardKeyRow>(
    'SELECT * FROM card_keys WHERE key_hash = ?',
    [keyHash],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getAllCardKeys(): Promise<CardKeyRow[]> {
  return executeQuery<CardKeyRow>(
    'SELECT * FROM card_keys ORDER BY created_at DESC',
  );
}

export async function getCardKeysByStatus(
  status: CardKeyStatus,
): Promise<CardKeyRow[]> {
  return executeQuery<CardKeyRow>(
    'SELECT * FROM card_keys WHERE status = ? ORDER BY created_at DESC',
    [status],
  );
}

export async function updateCardKey(
  keyHash: string,
  updates: Partial<CardKey>,
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.boundTo !== undefined) {
    setClauses.push('bound_to = ?');
    values.push(updates.boundTo);
  }
  if (updates.boundAt !== undefined) {
    setClauses.push('bound_at = ?');
    values.push(updates.boundAt ? new Date(updates.boundAt) : null);
  }
  if (updates.expiresAt !== undefined) {
    setClauses.push('expires_at = ?');
    values.push(new Date(updates.expiresAt));
  }

  if (setClauses.length === 0) return false;

  values.push(keyHash);
  const result = await executeUpdate(
    `UPDATE card_keys SET ${setClauses.join(', ')} WHERE key_hash = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function deleteCardKey(keyHash: string): Promise<boolean> {
  const result = await executeUpdate(
    'DELETE FROM card_keys WHERE key_hash = ?',
    [keyHash],
  );
  return result.affectedRows > 0;
}

export async function getCardKeyCount(): Promise<{
  total: number;
  unused: number;
  used: number;
  expired: number;
}> {
  const rows = await executeQuery<{ status: CardKeyStatus; count: number }>(
    'SELECT status, COUNT(*) as count FROM card_keys GROUP BY status',
  );

  const result = { total: 0, unused: 0, used: 0, expired: 0 };
  for (const row of rows) {
    result.total += row.count;
    result[row.status] = row.count;
  }
  return result;
}

export async function bindCardKeyToUser(
  keyHash: string,
  username: string,
): Promise<boolean> {
  const result = await executeUpdate(
    `UPDATE card_keys 
     SET status = 'used', bound_to = ?, bound_at = CURRENT_TIMESTAMP 
     WHERE key_hash = ? AND status = 'unused'`,
    [username, keyHash],
  );
  return result.affectedRows > 0;
}

export async function getCardKeysByUser(
  username: string,
): Promise<CardKeyRow[]> {
  return executeQuery<CardKeyRow>(
    'SELECT * FROM card_keys WHERE bound_to = ? ORDER BY bound_at DESC',
    [username],
  );
}
