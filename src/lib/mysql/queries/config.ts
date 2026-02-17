import { executeQuery, executeUpdate } from '../connection';
import { AdminConfig } from '../../admin.types';

export interface AdminConfigRow {
  id: number;
  config_key: string;
  config_value: string;
  created_at: Date;
  updated_at: Date;
}

export async function getAdminConfig(): Promise<AdminConfig | null> {
  const rows = await executeQuery<AdminConfigRow>(
    'SELECT * FROM admin_configs WHERE config_key = ?',
    ['main_config'],
  );

  if (rows.length === 0) return null;

  try {
    return JSON.parse(rows[0].config_value) as AdminConfig;
  } catch (error) {
    console.error('[MySQL] Failed to parse admin config:', error);
    return null;
  }
}

export async function setAdminConfig(config: AdminConfig): Promise<boolean> {
  const configValue = JSON.stringify(config);
  const result = await executeUpdate(
    `INSERT INTO admin_configs (id, config_key, config_value) 
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    ['main_config', configValue],
  );
  return result.affectedRows > 0;
}

export async function updateAdminConfigPartial(
  updates: Partial<AdminConfig>,
): Promise<boolean> {
  const currentConfig = await getAdminConfig();
  if (!currentConfig) {
    return false;
  }

  const newConfig = { ...currentConfig, ...updates };
  return setAdminConfig(newConfig);
}

export async function getSiteConfig(): Promise<
  AdminConfig['SiteConfig'] | null
> {
  const config = await getAdminConfig();
  return config?.SiteConfig || null;
}

export async function setSiteConfig(
  siteConfig: AdminConfig['SiteConfig'],
): Promise<boolean> {
  return updateAdminConfigPartial({ SiteConfig: siteConfig });
}

export async function getUserConfig(): Promise<
  AdminConfig['UserConfig'] | null
> {
  const config = await getAdminConfig();
  return config?.UserConfig || null;
}

export async function setUserConfig(
  userConfig: AdminConfig['UserConfig'],
): Promise<boolean> {
  return updateAdminConfigPartial({ UserConfig: userConfig });
}

export async function getSourceConfig(): Promise<
  AdminConfig['SourceConfig'] | null
> {
  const config = await getAdminConfig();
  return config?.SourceConfig || null;
}

export async function setSourceConfig(
  sourceConfig: AdminConfig['SourceConfig'],
): Promise<boolean> {
  return updateAdminConfigPartial({ SourceConfig: sourceConfig });
}
