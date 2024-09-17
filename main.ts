import { Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import { GitAPI } from './src/api';
import { startAutoSync, syncChanges } from './src/sync';
import { GitSettings } from './src/settings';

export default class ObsidianGitPlugin extends Plugin {
  settings: GitSettings;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon('github', 'Sync to Git', async () => {
      if (!this.settings.token) {
        new Notice('Please authenticate using your personal access token.');
        return;
      }
      try {
        await syncChanges(this);
        new Notice('Changes synced successfully.');
      } catch (error) {
        new Notice(error.message);
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

  constructor(app: any, plugin: ObsidianGitPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
  const { containerEl } = this;
  containerEl.empty();

  containerEl.createEl('h2', { text: 'Obsidian Git Settings' });

  new Setting(containerEl)
    .setName('GitHub Personal Access Token')
    .setDesc('Enter your GitHub token to authenticate.')
    .addText(text => text
      .setValue(this.plugin.settings.token)
      .onChange(async (value) => {
        this.plugin.settings.token = value;
        await this.plugin.saveSettings();
      })
    )
    .addButton(button => {
      const keyIcon = button.setIcon('key');
      keyIcon.onClick(async () => {
        try {
          const user = await GitAPI.authenticate(this.plugin.settings);
          this.plugin.settings.username = user.login;
          await this.plugin.saveSettings();
          keyIcon.setIcon('checkmark').setCta();  // Set green checkmark on success
          new Notice('Authentication successful');
        } catch (error) {
          keyIcon.setIcon('cross').setCta();  // Set red cross on failure
          new Notice('Authentication failed');
        }
      });
    });

  if (this.plugin.settings.username) {
    containerEl.createEl('div', { text: `Authenticated as: ${this.plugin.settings.username}` });
  }

  new Setting(containerEl)
  .setName('Repository')
  .setDesc('Select repository to push to.')
  .addDropdown(dropdown => {
    GitAPI.fetchRepos(this.plugin.settings).then(repos => {
      repos.forEach(repo => dropdown.addOption(repo.name, repo.name));
      dropdown.setValue(this.plugin.settings.selectedRepo);
    });
    dropdown.onChange(async (value: string) => {
      this.plugin.settings.selectedRepo = value;
      await this.plugin.saveSettings();
      this.loadBranchDropdown(containerEl); // Load branch after repo changes
    });
  })
  .settingEl.addClass('repo-setting');  // Add class for targeting


  // Add Device Name input field
  new Setting(containerEl)
    .setName('Device Name')
    .setDesc('Enter a name to identify this device.')
    .addText(text => text
      .setValue(this.plugin.settings.deviceName)
      .onChange(async (value) => {
        this.plugin.settings.deviceName = value;
        await this.plugin.saveSettings();
      })
    );

  // Load branches
  this.loadBranchDropdown(containerEl);

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

  new Setting(containerEl)
    .setName('Sync Interval (minutes)')
    .setDesc('Set the sync interval.')
    .addText(text => text
      .setPlaceholder('5')
      .setValue(this.plugin.settings.syncInterval.toString())
      .onChange(async (value) => {
        this.plugin.settings.syncInterval = parseInt(value);
        await this.plugin.saveSettings();
      })
    );
}


loadBranchDropdown(containerEl: HTMLElement) {
  // Remove any existing branch dropdown settings before creating a new one
  const existingBranchDropdown = containerEl.querySelector('.branch-setting');
  if (existingBranchDropdown) {
    existingBranchDropdown.remove(); // This clears the old dropdown
  }

  const repo = this.plugin.settings.selectedRepo;
  if (repo) {
    // Find the repository setting element using the class 'repo-setting'
    const repoSetting = containerEl.querySelector('.repo-setting');

    const branchSetting = new Setting(containerEl)
      .setName('Branch')
      .setDesc('Select branch to push to.')
      .addDropdown(dropdown => {
        GitAPI.fetchBranches(this.plugin.settings, repo).then(branches => {
          branches.forEach(branch => dropdown.addOption(branch.name, branch.name));
          dropdown.setValue(this.plugin.settings.selectedBranch);
        });
        dropdown.onChange(async (value: string) => {
          this.plugin.settings.selectedBranch = value;
          await this.plugin.saveSettings();
        });
      });

    // Add a unique class to the branch setting for easy removal in the future
    branchSetting.settingEl.addClass('branch-setting');

    // Ensure the branch dropdown appears right below the repository section
    if (repoSetting) {
      containerEl.insertBefore(branchSetting.settingEl, repoSetting.nextSibling);
    } else {
      containerEl.appendChild(branchSetting.settingEl); // Fallback in case repoSetting isn't found
    }
  }
}

}
