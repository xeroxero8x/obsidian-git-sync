import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import { GitAPI } from 'src/api';
import { GitSettings, DEFAULT_SETTINGS } from 'src/settings';
import { startAutoSync, syncChanges } from 'src/sync';

export default class ObsidianGitPlugin extends Plugin {
  settings: GitSettings;

  async onload() {
    await this.loadSettings();
    
    this.addSettingTab(new GitSettingTab(this.app, this));

    const ribbonIconEl = this.addRibbonIcon('github', 'Push Changes', async (evt: MouseEvent) => {
      if (!this.settings.authenticated) {
        new Notice('Please authenticate with your Personal Access Token.');
      } else if (!this.settings.selectedRepo) {
        new Notice('Please select a repository.');
      } else if (!this.settings.selectedBranch) {
        new Notice('Please select a branch.');
      } else {
        await syncChanges(this);
        new Notice('Changes pushed successfully.');
      }
    });

    // Start auto sync if enabled
    if (this.settings.autoSync) {
      startAutoSync(this);
    }
  }

  onunload() {
    // Cleanup if necessary
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class GitSettingTab extends PluginSettingTab {
  plugin: ObsidianGitPlugin;

  constructor(app: App, plugin: ObsidianGitPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Obsidian Git Settings' });

    // Git Provider Selector
    new Setting(containerEl)
      .setName('Git Provider')
      .setDesc('Select the Git provider.')
      .addDropdown(dropdown => dropdown
        .addOption('github', 'GitHub')
        .addOption('gitlab', 'GitLab')
        .setValue(this.plugin.settings.gitProvider)
        .onChange(async (value) => {
          this.plugin.settings.gitProvider = value;
          await this.plugin.saveSettings();
        }));

    // Personal Access Token
    new Setting(containerEl)
      .setName('Personal Access Token')
      .setDesc('Enter your personal access token.')
      .addText(text => text
        .setPlaceholder('Enter your token')
        .setValue(this.plugin.settings.token)
        .onChange(async (value) => {
          this.plugin.settings.token = value;
          await this.plugin.saveSettings();
        })
        .inputEl.type = 'password')  // Mask token

      .addButton(button => {
        button.setButtonText('Authenticate').setIcon('key')
          .onClick(async () => {
            const success = await GitAPI.authenticate(this.plugin.settings);
            if (success) {
              button.setIcon('check-circle').setTooltip('Authenticated');
              this.plugin.settings.authenticated = true;
            } else {
              button.setIcon('cross').setTooltip('Failed Authentication');
            }
            await this.plugin.saveSettings();
          });
      });

    // Repository Selection
    const repoSetting = new Setting(containerEl)
      .setName('Repository')
      .setDesc('Select the repository to push to.')
      .addDropdown(dropdown => dropdown.setDisabled(!this.plugin.settings.authenticated));

    if (this.plugin.settings.authenticated) {
      GitAPI.fetchRepos(this.plugin.settings).then(repos => {
        repos.forEach(repo => dropdown.addOption(repo.name, repo.name));
        dropdown.setValue(this.plugin.settings.selectedRepo);
      });
    }

    // Branch Selection
    new Setting(containerEl)
      .setName('Branch')
      .setDesc('Select the branch to push to.')
      .addDropdown(dropdown => dropdown.setDisabled(!this.plugin.settings.selectedRepo))
      .setValue(this.plugin.settings.selectedBranch)
      .onChange(async (value) => {
        this.plugin.settings.selectedBranch = value;
        await this.plugin.saveSettings();
      });

    // Git Sync Interval
    new Setting(containerEl)
      .setName('Git Sync Interval')
      .setDesc('Time interval for Git auto-sync (in minutes).')
      .addText(text => text
        .setPlaceholder('Enter minutes')
        .setValue(this.plugin.settings.syncInterval.toString())
        .onChange(async (value) => {
          const interval = Number(value);
          if (!isNaN(interval)) {
            this.plugin.settings.syncInterval = interval;
            await this.plugin.saveSettings();
          }
        }));

    // Auto Sync
    new Setting(containerEl)
      .setName('Auto Sync')
      .setDesc('Automatically sync changes at intervals.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
        }));

    // Refresh Repos
    new Setting(containerEl)
      .setName('Refresh Repos')
      .setDesc('Click to refresh the repository and branch list.')
      .addButton(button => {
        button.setButtonText('Refresh').setIcon('refresh-ccw')
          .onClick(async () => {
            const repos = await GitAPI.fetchRepos(this.plugin.settings);
            // Update the UI with the new repos
          });
      });
  }
}
