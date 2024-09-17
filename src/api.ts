export class GitAPI {
  // Authenticate user using GitHub token
  static async authenticate(settings: any): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${settings.token}` }
    });
    if (!response.ok) throw new Error('Authentication failed');
    return response.json();
  }

  // Fetch the list of repositories for the authenticated user
  static async fetchRepos(settings: any): Promise<any[]> {
    const response = await fetch('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${settings.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch repositories');
    return response.json();
  }

  // Fetch the list of branches for the selected repository
  static async fetchBranches(settings: any, repo: string): Promise<any[]> {
    const response = await fetch(`https://api.github.com/repos/${settings.username}/${repo}/branches`, {
      headers: { Authorization: `token ${settings.token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch branches');
    return response.json();
  }

  // Commit changes to the specified file
  static async commitChanges(settings: any, message: string, content: string, path: string): Promise<void> {
    const repo = settings.selectedRepo;
    const branch = settings.selectedBranch;
    const url = `https://api.github.com/repos/${settings.username}/${repo}/contents/${path}`;

// Check if the path starts with .obsidian (for hidden directory)
  if (path.startsWith('.obsidian')) {
    console.log(`Committing hidden file: ${path}`);
  }
    // Fetch the current file's SHA, if it exists
    const shaResponse = await fetch(`${url}?ref=${branch}`, {
      headers: { Authorization: `token ${settings.token}` }
    });

    let sha = '';
    if (shaResponse.ok) {
      const fileData = await shaResponse.json();
      sha = fileData.sha; // Get file SHA for existing file
    }

    // Define the commit data object, with optional 'sha'
    const commitData: {
      message: string;
      content: string;
      branch: string;
      sha?: string; // Optional SHA, only needed if the file exists
    } = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch
    };

    // Attach the SHA if the file already exists
    if (sha) {
      commitData.sha = sha;
    }

    // Make the PUT request to commit the changes
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${settings.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitData)
    });

    if (!response.ok) {
      throw new Error(`Failed to commit changes: ${response.statusText}`);
    }
  }

  // New method to check if the file has changed
  static async checkForChanges(settings: any, content: string, path: string): Promise<boolean> {
    const repo = settings.selectedRepo;
    const branch = settings.selectedBranch;
    const url = `https://api.github.com/repos/${settings.username}/${repo}/contents/${path}?ref=${branch}`;

    const response = await fetch(url, {
      headers: { Authorization: `token ${settings.token}` }
    });

    if (response.ok) {
      const fileData = await response.json();
      const remoteContent = Buffer.from(fileData.content, 'base64').toString();

      // Compare local content with the remote content
      return content !== remoteContent;
    }

    // If the file doesn't exist on remote, it's considered changed (i.e., new)
    return true;
  }
}
