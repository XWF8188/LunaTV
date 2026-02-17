import { executeQuery, executeUpdate } from '../connection';
import { PlayRecord } from '../../types';

export interface PlayRecordRow {
  id: number;
  username: string;
  source: string;
  content_id: string;
  title: string;
  source_name: string;
  cover: string | null;
  year: string | null;
  episode_index: number;
  total_episodes: number;
  original_episodes: number | null;
  play_time: number;
  total_time: number;
  search_title: string | null;
  remarks: string | null;
  douban_id: number | null;
  content_type: string | null;
  created_at: Date;
  updated_at: Date;
}

export function mapPlayRecordRowToPlayRecord(row: PlayRecordRow): PlayRecord {
  return {
    title: row.title,
    source_name: row.source_name,
    cover: row.cover || '',
    year: row.year || '',
    index: row.episode_index,
    total_episodes: row.total_episodes,
    original_episodes: row.original_episodes || undefined,
    play_time: row.play_time,
    total_time: row.total_time,
    save_time: Math.floor(new Date(row.updated_at).getTime()),
    search_title: row.search_title || '',
    remarks: row.remarks || undefined,
    douban_id: row.douban_id || undefined,
    type: row.content_type || undefined,
  };
}

export async function getPlayRecord(
  username: string,
  source: string,
  contentId: string,
): Promise<PlayRecordRow | null> {
  const rows = await executeQuery<PlayRecordRow>(
    'SELECT * FROM play_records WHERE username = ? AND source = ? AND content_id = ?',
    [username, source, contentId],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getAllPlayRecords(
  username: string,
): Promise<PlayRecordRow[]> {
  return executeQuery<PlayRecordRow>(
    'SELECT * FROM play_records WHERE username = ? ORDER BY updated_at DESC',
    [username],
  );
}

export async function getRecentPlayRecords(
  username: string,
  limit: number = 10,
): Promise<PlayRecordRow[]> {
  return executeQuery<PlayRecordRow>(
    'SELECT * FROM play_records WHERE username = ? ORDER BY updated_at DESC LIMIT ?',
    [username, limit],
  );
}

export async function upsertPlayRecord(
  username: string,
  source: string,
  contentId: string,
  record: PlayRecord,
): Promise<boolean> {
  const result = await executeUpdate(
    `INSERT INTO play_records 
     (username, source, content_id, title, source_name, cover, year, 
      episode_index, total_episodes, original_episodes, play_time, total_time, 
      search_title, remarks, douban_id, content_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      source_name = VALUES(source_name),
      cover = VALUES(cover),
      year = VALUES(year),
      episode_index = VALUES(episode_index),
      total_episodes = VALUES(total_episodes),
      play_time = VALUES(play_time),
      total_time = VALUES(total_time),
      search_title = VALUES(search_title),
      remarks = VALUES(remarks),
      douban_id = VALUES(douban_id),
      content_type = VALUES(content_type),
      updated_at = CURRENT_TIMESTAMP`,
    [
      username,
      source,
      contentId,
      record.title,
      record.source_name,
      record.cover || null,
      record.year || null,
      record.index,
      record.total_episodes,
      record.original_episodes || null,
      record.play_time,
      record.total_time,
      record.search_title || null,
      record.remarks || null,
      record.douban_id || null,
      record.type || null,
    ],
  );
  return result.affectedRows > 0;
}

export async function deletePlayRecord(
  username: string,
  source: string,
  contentId: string,
): Promise<boolean> {
  const result = await executeUpdate(
    'DELETE FROM play_records WHERE username = ? AND source = ? AND content_id = ?',
    [username, source, contentId],
  );
  return result.affectedRows > 0;
}

export async function deleteAllPlayRecords(username: string): Promise<number> {
  const result = await executeUpdate(
    'DELETE FROM play_records WHERE username = ?',
    [username],
  );
  return result.affectedRows;
}

export async function getPlayRecordCount(username: string): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM play_records WHERE username = ?',
    [username],
  );
  return rows[0].count;
}

export async function getTotalWatchTime(username: string): Promise<number> {
  const rows = await executeQuery<{ total: number }>(
    'SELECT COALESCE(SUM(play_time), 0) as total FROM play_records WHERE username = ?',
    [username],
  );
  return rows[0].total;
}

export async function getMostWatchedSource(
  username: string,
): Promise<string | null> {
  const rows = await executeQuery<{ source_name: string; count: number }>(
    `SELECT source_name, COUNT(*) as count 
     FROM play_records 
     WHERE username = ? 
     GROUP BY source_name 
     ORDER BY count DESC 
     LIMIT 1`,
    [username],
  );
  return rows.length > 0 ? rows[0].source_name : null;
}

export async function getUniqueContentCount(username: string): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    `SELECT COUNT(DISTINCT CONCAT(source, '+', content_id)) as count 
     FROM play_records 
     WHERE username = ?`,
    [username],
  );
  return rows[0].count;
}

export async function getFirstWatchDate(
  username: string,
): Promise<Date | null> {
  const rows = await executeQuery<{ earliest: Date }>(
    'SELECT MIN(created_at) as earliest FROM play_records WHERE username = ?',
    [username],
  );
  return rows[0].earliest || null;
}
