import { ObsidianGitPlugin } from '../main';

export function startAutoSync(plugin: ObsidianGitPlugin) {
  setInterval(async () => {
    await syncChanges(plugin);
  }, plugin.settings.syncInterval * 60000);
}

export async function syncChanges(plugin: ObsidianGitPlugin) {
  // Logic to detect file changes and commit them
  // File creation, deletion, move with specific commit messages
}
