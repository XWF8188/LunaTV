import { executeQuery, executeUpdate } from '../connection';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: 'owner' | 'admin' | 'user';
  banned: boolean;
  tags: string | null;
  enabled_apis: string | null;
  oidc_sub: string | null;
  tvbox_token: string | null;
  show_adult_content: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function createUser(
  username: string,
  passwordHash: string,
  role: 'owner' | 'admin' | 'user' = 'user',
  tags?: string[],
  oidcSub?: string,
  enabledApis?: string[],
): Promise<number> {
  const result = await executeUpdate(
    `INSERT INTO users (username, password_hash, role, tags, oidc_sub, enabled_apis)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      username,
      passwordHash,
      role,
      tags ? JSON.stringify(tags) : null,
      oidcSub || null,
      enabledApis ? JSON.stringify(enabledApis) : null,
    ],
  );
  return result.insertId;
}

export async function getUserByUsername(
  username: string,
): Promise<UserRow | null> {
  const rows = await executeQuery<UserRow>(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getUserByOidcSub(
  oidcSub: string,
): Promise<UserRow | null> {
  const rows = await executeQuery<UserRow>(
    'SELECT * FROM users WHERE oidc_sub = ?',
    [oidcSub],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateUserPassword(
  username: string,
  passwordHash: string,
): Promise<boolean> {
  const result = await executeUpdate(
    'UPDATE users SET password_hash = ? WHERE username = ?',
    [passwordHash, username],
  );
  return result.affectedRows > 0;
}

export async function updateUserRole(
  username: string,
  role: 'owner' | 'admin' | 'user',
): Promise<boolean> {
  const result = await executeUpdate(
    'UPDATE users SET role = ? WHERE username = ?',
    [role, username],
  );
  return result.affectedRows > 0;
}

export async function updateUserBanned(
  username: string,
  banned: boolean,
): Promise<boolean> {
  const result = await executeUpdate(
    'UPDATE users SET banned = ? WHERE username = ?',
    [banned, username],
  );
  return result.affectedRows > 0;
}

export async function updateUserTags(
  username: string,
  tags: string[],
): Promise<boolean> {
  const result = await executeUpdate(
    'UPDATE users SET tags = ? WHERE username = ?',
    [JSON.stringify(tags), username],
  );
  return result.affectedRows > 0;
}

export async function updateUserEnabledApis(
  username: string,
  enabledApis: string[],
): Promise<boolean> {
  const result = await executeUpdate(
    'UPDATE users SET enabled_apis = ? WHERE username = ?',
    [JSON.stringify(enabledApis), username],
  );
  return result.affectedRows > 0;
}

export async function updateUserTvboxToken(
  username: string,
  token: string | null,
): Promise<boolean> {
  const result = await executeUpdate(
    'UPDATE users SET tvbox_token = ? WHERE username = ?',
    [token, username],
  );
  return result.affectedRows > 0;
}

export async function deleteUser(username: string): Promise<boolean> {
  const result = await executeUpdate('DELETE FROM users WHERE username = ?', [
    username,
  ]);
  return result.affectedRows > 0;
}

export async function getAllUsers(): Promise<UserRow[]> {
  return executeQuery<UserRow>(
    'SELECT * FROM users ORDER BY created_at DESC',
  );
}

export async function getUserCount(): Promise<number> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM users',
  );
  return rows[0].count;
}

export async function checkUserExists(username: string): Promise<boolean> {
  const rows = await executeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM users WHERE username = ?',
    [username],
  );
  return rows[0].count > 0;
}
