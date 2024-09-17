import { TFile, Notice } from 'obsidian';
import ObsidianGitPlugin from '../main';
import { GitAPI } from './api';

let autoSyncInterval: number;

export function startAutoSync(plugin: ObsidianGitPlugin) {
  if (autoSyncInterval) clearInterval(autoSyncInterval);

  autoSyncInterval = window.setInterval(async () => {
    await syncChanges(plugin);
  }, plugin.settings.syncInterval * 60000);
}

export async function syncChanges(plugin: ObsidianGitPlugin) {
  const files = plugin.app.vault.getFiles();
  for (const file of files) {
    await handleFileChange(plugin, file);
  }
}

async function handleFileChange(plugin: ObsidianGitPlugin, file: TFile) {
  const content = await plugin.app.vault.read(file);

  // Check if the file has changes
  const changed = await GitAPI.checkForChanges(plugin.settings, content, file.path);
  if (!changed) {
    return; // Skip if no changes
  }

  const message = `${plugin.settings.deviceName}: Updated ${file.name}`;

  try {
    await GitAPI.commitChanges(plugin.settings, message, content, file.path);
    new Notice(`Committed: ${file.name}`);
  } catch (error) {
    new Notice(`Failed to commit ${file.name}: ${error.message}`);
  }
}
