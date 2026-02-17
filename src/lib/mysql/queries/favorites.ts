import { executeQuery, executeUpdate } from '../connection';
import { Favorite } from '../../types';

export interface FavoriteRow {
  id: number;
  username: string;
  source: string;
  content_id: string;
  title: string;
  source_name: string;
  cover: string | null;
  year: string | null;
  total_episodes: number | null;
  search_title: string | null;
  origin: 'vod' | 'live' | 'shortdrama' | null;
  content_type: string | null;
  release_date: Date | null;
  remarks: string | null;
  created_at: Date;
}

export function mapFavoriteRowToFavorite(row: FavoriteRow): Favorite {
  return {
    title: row.title,
    source_name: row.source_name,
    cover: row.cover || '',
    year: row.year || '',
    total_episodes: row.total_episodes || 0,
    save_time: Math.floor(new Date(row.created_at).getTime()),
    search_title: row.search_title || '',
    origin: row.origin || undefined,
    type: row.content_type || undefined,
    releaseDate: row.release_date
      ? new Date(row.release_date).toISOString().split('T')[0]
      : undefined,
    remarks: row.remarks || undefined,
  };
}

export async function getFavorite(
  username: string,
  source: string,
  contentId: string,
): Promise<FavoriteRow | null> {
  const rows = await executeQuery<FavoriteRow>(
    'SELECT * FROM favorites WHERE username = ? AND source = ? AND content_id = ?',
    [username, source, contentId],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getAllFavorites(
  username: string,
): Promise<FavoriteRow[]> {
  return executeQuery<FavoriteRow>(
    'SELECT * FROM favorites WHERE username = ? ORDER BY created_at DESC',
    [username],
  );
}

export async function upsertFavorite(
  username: string,
  source: string,
  contentId: string,
  favorite: Favorite,
): Promise<boolean> {
  const result = await executeUpdate(
    `INSERT INTO favorites 
     (username, source, content_id, title, source_name, cover, year, 
      total_episodes, search_title, origin, content_type, release_date, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      source_name = VALUES(source_name),
      cover = VALUES(cover),
      year = VALUES(year),
      total_episodes = VALUES(total_episodes),
      search_title = VALUES(search_title),
      origin = VALUES(origin),
      content_type = VALUES(content_type),
      release_date = VALUES(release_date),
      remarks = VALUES(remarks)`,
    [
      username,
      source,
      contentId,
      favorite.title,
      favorite.source_name,
      favorite.cover || null,
      favorite.year || null,
      favorite.total_episodes || null,
      favorite.search_title || null,
      favorite.origin || null,
      favorite.type || null,
      favorite.releaseDate || null,
      favorite.remarks || null,
    ],
  );
  return result.affectedRows > 0;
}

export async function deleteFavorite(
  username: string,
  source: string,
  contentId: string,
): Promise<boolean> {
  const result = await executeUpdate(
    'DELETE FROM favorites WHERE username = ? AND source = ? AND content_id = ?',
    [username, source, contentId],
  );
  return result.affectedRows > 0;
}

export async function deleteAllFavorites(username: string): Promise<number> {
  const result = await executeUpdate(
    'DELETE FROM favorites WHERE username = ?',
    [username],
  );
  return result.affectedRows;
}

export async function getFavoriteCount(username: string): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM favorites WHERE username = ?',
    [username],
  );
  return rows[0].count;
}

export async function checkFavoriteExists(
  username: string,
  source: string,
  contentId: string,
): Promise<boolean> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM favorites WHERE username = ? AND source = ? AND content_id = ?',
    [username, source, contentId],
  );
  return rows[0].count > 0;
}
