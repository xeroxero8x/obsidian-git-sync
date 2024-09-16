import { App, Plugin, PluginSettingTab, Setting, TFile, Notice } from 'obsidian';
import { GitAPI } from './src/api';
import { startAutoSync, syncChanges } from './src/sync';
import { GitSettings } from './src/settings';

export default class ObsidianGitPlugin extends Plugin {
  settings: GitSettings;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon('github', 'Sync to Git', async () => {
      const isAuthenticated = await GitAPI.authenticate(this.settings);
      if (!isAuthenticated) {
        new Notice('Authentication failed. Check your token and try again.');
      } else {
        await syncChanges(this);
        new Notice('Changes synced successfully.');
      }
    });

    this.addSettingTab(new GitSettingTab(this.app, this));

    if (this.settings.autoSync) {
      startAutoSync(this);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, new GitSettings(), await this.loadData());
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

    // Git provider selector
    new Setting(containerEl)
      .setName('Git Provider')
      .setDesc('Select Git provider (GitHub or GitLab).')
      .addDropdown(dropdown => dropdown
        .addOption('github', 'GitHub')
        .addOption('gitlab', 'GitLab')
        .setValue(this.plugin.settings.gitProvider)
        .onChange(async (value: string) => {
          this.plugin.settings.gitProvider = value;
          await this.plugin.saveSettings();
        })
      );

    // Personal access token
    new Setting(containerEl)
      .setName('Personal Access Token')
      .setDesc('Enter your personal access token for GitHub or GitLab.')
      .addText(text => text
        .setPlaceholder('********')
        .setValue(this.plugin.settings.token)
        .onChange(async (value: string) => {
          this.plugin.settings.token = value;
          await this.plugin.saveSettings();
        })
      )
      .addButton(button => button
        .setButtonText('Authenticate')
        .setIcon('key')
        .onClick(async () => {
          const isAuthenticated = await GitAPI.authenticate(this.plugin.settings);
          if (isAuthenticated) {
            new Notice('Authentication successful.');
            button.setIcon('checkmark').setCta(true);
          } else {
            new Notice('Authentication failed.');
            button.setIcon('cross').setCta(false);
          }
        })
      );

    // Repository selector
    const repoDropdown = new Setting(containerEl)
      .setName('Repository')
      .setDesc('Select the repository to push to.')
      .addDropdown(dropdown => {
        if (!this.plugin.settings.token) return;

        GitAPI.fetchRepos(this.plugin.settings).then(repos => {
          repos.forEach(repo => dropdown.addOption(repo.name, repo.name));
          dropdown.setValue(this.plugin.settings.selectedRepo);
        });

        dropdown.onChange(async (value: string) => {
          this.plugin.settings.selectedRepo = value;
          await this.plugin.saveSettings();
        });
      });

    // Branch selector
    new Setting(containerEl)
      .setName('Branch')
      .setDesc('Select the branch to push to.')
      .addDropdown(dropdown => dropdown
        .addOption('main', 'Main')
        .addOption('develop', 'Develop')
        .setValue(this.plugin.settings.selectedBranch)
        .onChange(async (value: string) => {
          this.plugin.settings.selectedBranch = value;
          await this.plugin.saveSettings();
        })
      );

    // Auto sync toggle
    new Setting(containerEl)
      .setName('Auto Sync')
      .setDesc('Enable automatic syncing.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value: boolean) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
        })
      );

    // Sync interval setting
    new Setting(containerEl)
      .setName('Sync Interval (minutes)')
      .setDesc('Time interval for automatic git sync.')
      .addText(text => text
        .setPlaceholder('5')
        .setValue(this.plugin.settings.syncInterval.toString())
        .onChange(async (value: string) => {
          this.plugin.settings.syncInterval = parseInt(value);
          await this.plugin.saveSettings();
        })
      );
  }
}
