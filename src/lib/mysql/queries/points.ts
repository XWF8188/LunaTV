import { executeQuery, executeUpdate } from '../connection';
import { UserPoints, PointsRecord, PointsRecordType } from '../../types';

export interface UserPointsRow {
  id: number;
  username: string;
  invitation_code: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  created_at: Date;
  updated_at: Date;
}

export interface PointsRecordRow {
  id: string;
  username: string;
  type: PointsRecordType;
  amount: number;
  reason: string;
  related_user: string | null;
  card_key_id: string | null;
  admin_username: string | null;
  created_at: Date;
}

export function mapUserPointsRowToUserPoints(row: UserPointsRow): UserPoints {
  return {
    username: row.username,
    invitationCode: row.invitation_code,
    balance: row.balance,
    totalEarned: row.total_earned,
    totalRedeemed: row.total_redeemed,
    updatedAt: Math.floor(new Date(row.updated_at).getTime()),
  };
}

export function mapPointsRecordRowToPointsRecord(
  row: PointsRecordRow,
): PointsRecord {
  return {
    id: row.id,
    username: row.username,
    type: row.type,
    amount: row.amount,
    reason: row.reason,
    relatedUser: row.related_user || undefined,
    cardKeyId: row.card_key_id || undefined,
    adminUsername: row.admin_username || undefined,
    createdAt: Math.floor(new Date(row.created_at).getTime()),
  };
}

export async function createUserPoints(
  username: string,
  invitationCode: string,
): Promise<number> {
  const result = await executeUpdate(
    'INSERT INTO user_points (username, invitation_code) VALUES (?, ?)',
    [username, invitationCode],
  );
  return result.insertId;
}

export async function getUserPoints(
  username: string,
): Promise<UserPointsRow | null> {
  const rows = await executeQuery<UserPointsRow>(
    'SELECT * FROM user_points WHERE username = ?',
    [username],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getUserByInvitationCode(
  invitationCode: string,
): Promise<UserPointsRow | null> {
  const rows = await executeQuery<UserPointsRow>(
    'SELECT * FROM user_points WHERE invitation_code = ?',
    [invitationCode],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateUserPoints(
  username: string,
  balanceDelta: number,
  earnedDelta: number = 0,
  redeemedDelta: number = 0,
): Promise<boolean> {
  const result = await executeUpdate(
    `UPDATE user_points 
     SET balance = balance + ?, 
         total_earned = total_earned + ?, 
         total_redeemed = total_redeemed + ?
     WHERE username = ?`,
    [balanceDelta, earnedDelta, redeemedDelta, username],
  );
  return result.affectedRows > 0;
}

export async function setUserPoints(points: UserPoints): Promise<boolean> {
  const result = await executeUpdate(
    `UPDATE user_points 
     SET balance = ?, total_earned = ?, total_redeemed = ?
     WHERE username = ?`,
    [points.balance, points.totalEarned, points.totalRedeemed, points.username],
  );
  return result.affectedRows > 0;
}

export async function addPointsRecord(record: PointsRecord): Promise<void> {
  await executeUpdate(
    `INSERT INTO points_records 
     (id, username, type, amount, reason, related_user, card_key_id, admin_username)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.username,
      record.type,
      record.amount,
      record.reason,
      record.relatedUser || null,
      record.cardKeyId || null,
      record.adminUsername || null,
    ],
  );
}

export async function getPointsHistory(
  username: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<PointsRecordRow[]> {
  const offset = (page - 1) * pageSize;
  return executeQuery<PointsRecordRow>(
    'SELECT * FROM points_records WHERE username = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [username, pageSize, offset],
  );
}

export async function getPointsRecordCount(username: string): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM points_records WHERE username = ?',
    [username],
  );
  return rows[0].count;
}

export async function deletePointsRecord(id: string): Promise<boolean> {
  const result = await executeUpdate(
    'DELETE FROM points_records WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}
