import { executeQuery, executeUpdate } from '../connection';
import { Invitation, IPRewardRecord, InvitationConfig } from '../../types';

export interface InvitationRow {
  id: string;
  inviter: string;
  invitee: string;
  invitation_code: string;
  ip_address: string;
  rewarded: boolean;
  reward_time: Date | null;
  created_at: Date;
}

export interface IPRewardRecordRow {
  id: string;
  ip_address: string;
  inviter: string;
  invitee: string;
  reward_time: Date;
}

export interface InvitationConfigRow {
  id: number;
  enabled: boolean;
  reward_points: number;
  redeem_threshold: number;
  card_key_type: 'year' | 'quarter' | 'month' | 'week';
  created_at: Date;
  updated_at: Date;
}

export function mapInvitationRowToInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    inviter: row.inviter,
    invitee: row.invitee,
    invitationCode: row.invitation_code,
    ipAddress: row.ip_address,
    rewarded: row.rewarded,
    rewardTime: row.reward_time
      ? Math.floor(new Date(row.reward_time).getTime())
      : undefined,
    createdAt: Math.floor(new Date(row.created_at).getTime()),
  };
}

export function mapIPRewardRecordRowToIPRewardRecord(
  row: IPRewardRecordRow,
): IPRewardRecord {
  return {
    id: row.id,
    ipAddress: row.ip_address,
    inviter: row.inviter,
    invitee: row.invitee,
    rewardTime: Math.floor(new Date(row.reward_time).getTime()),
  };
}

export function mapInvitationConfigRowToInvitationConfig(
  row: InvitationConfigRow,
): InvitationConfig {
  return {
    enabled: row.enabled,
    rewardPoints: row.reward_points,
    redeemThreshold: row.redeem_threshold,
    cardKeyType: row.card_key_type,
    updatedAt: Math.floor(new Date(row.updated_at).getTime()),
  };
}

export async function createInvitation(invitation: Invitation): Promise<void> {
  await executeUpdate(
    `INSERT INTO invitations 
     (id, inviter, invitee, invitation_code, ip_address, rewarded, reward_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      invitation.id,
      invitation.inviter,
      invitation.invitee,
      invitation.invitationCode,
      invitation.ipAddress,
      invitation.rewarded,
      invitation.rewardTime ? new Date(invitation.rewardTime) : null,
    ],
  );
}

export async function getInvitationById(
  id: string,
): Promise<InvitationRow | null> {
  const rows = await executeQuery<InvitationRow>(
    'SELECT * FROM invitations WHERE id = ?',
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getInvitationByInvitee(
  invitee: string,
): Promise<InvitationRow | null> {
  const rows = await executeQuery<InvitationRow>(
    'SELECT * FROM invitations WHERE invitee = ?',
    [invitee],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getInvitationsByInviter(
  inviter: string,
): Promise<InvitationRow[]> {
  return executeQuery<InvitationRow>(
    'SELECT * FROM invitations WHERE inviter = ? ORDER BY created_at DESC',
    [inviter],
  );
}

export async function updateInvitation(
  id: string,
  updates: Partial<Invitation>,
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.rewarded !== undefined) {
    setClauses.push('rewarded = ?');
    values.push(updates.rewarded);
  }
  if (updates.rewardTime !== undefined) {
    setClauses.push('reward_time = ?');
    values.push(updates.rewardTime ? new Date(updates.rewardTime) : null);
  }

  if (setClauses.length === 0) return false;

  values.push(id);
  const result = await executeUpdate(
    `UPDATE invitations SET ${setClauses.join(', ')} WHERE id = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function getInvitationCount(inviter: string): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM invitations WHERE inviter = ?',
    [inviter],
  );
  return rows[0].count;
}

export async function getRewardedInvitationCount(
  inviter: string,
): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM invitations WHERE inviter = ? AND rewarded = ?',
    [inviter, true],
  );
  return rows[0].count;
}

export async function createIPRewardRecord(
  record: IPRewardRecord,
): Promise<void> {
  await executeUpdate(
    `INSERT INTO ip_reward_records (id, ip_address, inviter, invitee, reward_time)
     VALUES (?, ?, ?, ?, ?)`,
    [
      record.id,
      record.ipAddress,
      record.inviter,
      record.invitee,
      new Date(record.rewardTime),
    ],
  );
}

export async function getIPRewardRecord(
  ipAddress: string,
): Promise<IPRewardRecordRow | null> {
  const rows = await executeQuery<IPRewardRecordRow>(
    'SELECT * FROM ip_reward_records WHERE ip_address = ?',
    [ipAddress],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getInvitationConfig(): Promise<InvitationConfigRow | null> {
  const rows = await executeQuery<InvitationConfigRow>(
    'SELECT * FROM invitation_configs WHERE id = 1',
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function setInvitationConfig(
  config: InvitationConfig,
): Promise<boolean> {
  const result = await executeUpdate(
    `UPDATE invitation_configs 
     SET enabled = ?, reward_points = ?, redeem_threshold = ?, card_key_type = ?
     WHERE id = 1`,
    [
      config.enabled,
      config.rewardPoints,
      config.redeemThreshold,
      config.cardKeyType,
    ],
  );
  return result.affectedRows > 0;
}
