export interface GitSettings {
  gitProvider: string;
  token: string;
  authenticated: boolean;
  selectedRepo: string;
  selectedBranch: string;
  syncInterval: number;
  autoSync: boolean;
}

export const DEFAULT_SETTINGS: GitSettings = {
  gitProvider: 'github',
  token: '',
  authenticated: false,
  selectedRepo: '',
  selectedBranch: '',
  syncInterval: 15,
  autoSync: false
};
