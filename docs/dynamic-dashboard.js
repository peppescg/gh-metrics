// Dynamic GitHub Metrics Dashboard
class DynamicGitHubDashboard {
  constructor() {
    // Default values - change these to match your repository
    this.token = ''; // Token is optional for public repos
    this.owner = 'stacklok'; // Default GitHub owner
    this.repo = 'toolhive-studio'; // Default repository
    this.apiBase = 'https://api.github.com';
  }

  init() {
    this.setupUI();
    this.setupEventListeners();
    // Auto-load metrics on page refresh
    setTimeout(() => this.loadMetricsWithDefaults(), 500);
  }

  setupUI() {
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <header class="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-3xl font-bold">📊 GitHub Metrics Dashboard</h1>
                <p class="text-blue-100 mt-1">Real-time GitHub Release Analytics</p>
              </div>
              <div class="text-right">
                <div class="flex items-center justify-end mb-1">
                  <span class="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  <p class="text-sm text-blue-100">Live Data - Always Fresh</p>
                </div>
                <p class="text-lg font-semibold" id="lastUpdate">Loading...</p>
                <p class="text-xs text-blue-200" id="nextUpdate">Next update: calculating...</p>
                <div class="mt-2 space-x-2">
                  <button id="hardRefreshBtn" class="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-all">
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Loading State -->
        <div id="loadingState" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="bg-white rounded-lg shadow-md p-6 text-center">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p class="mt-4 text-gray-600">Loading GitHub metrics...</p>
          </div>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboardContent" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <!-- Repository Info -->
          <div id="repoInfo" class="bg-white rounded-lg shadow-md p-6 mb-6">
            <!-- Will be populated dynamically -->
          </div>

          <!-- Key Metrics -->
          <div id="keyMetrics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <!-- Will be populated dynamically -->
          </div>

          <!-- Latest Release -->
          <div id="latestRelease" class="bg-white rounded-lg shadow-md p-6 mb-6">
            <!-- Will be populated dynamically -->
          </div>

          <!-- Top Releases -->
          <div id="topReleases" class="bg-white rounded-lg shadow-md p-6 mb-6">
            <!-- Will be populated dynamically -->
          </div>

          <!-- Top Assets -->
          <div id="topAssets" class="bg-white rounded-lg shadow-md p-6">
            <!-- Will be populated dynamically -->
          </div>
        </div>

        <!-- Error State -->
        <div id="errorState" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 class="text-red-800 font-bold">❌ Error Loading Data</h3>
            <p id="errorMessage" class="text-red-600 mt-2"></p>
            <button id="retryBtn" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    document.getElementById('hardRefreshBtn').addEventListener('click', () => this.loadMetricsWithDefaults());
    document.getElementById('retryBtn').addEventListener('click', () => this.loadMetricsWithDefaults());
  }

  async loadMetricsWithDefaults() {
    // Use default values from constructor
    if (!this.owner || !this.repo) {
      this.showError('Repository configuration is missing. Please check default values.');
      return;
    }

    this.showLoading();

    try {
      const [releases, repoInfo] = await Promise.all([
        this.fetchReleases(),
        this.fetchRepositoryInfo()
      ]);

      const metrics = this.processMetrics(releases, repoInfo);
      this.displayMetrics(metrics);

    } catch (error) {
      this.showError(`Failed to load metrics: ${error.message}`);
    }
  }

  async fetchReleases() {
    const headers = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/releases`;
    const response = await fetch(url, {
      headers
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchRepositoryInfo() {
    const headers = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.apiBase}/repos/${this.owner}/${this.repo}`;
    const response = await fetch(url, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Repository not found: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      language: data.language,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isPrivate: data.private
    };
  }

  processMetrics(releases, repoInfo) {
    const metrics = {
      timestamp: new Date().toISOString(),
      repository: `${this.owner}/${this.repo}`,
      repositoryInfo: repoInfo,
      totalReleases: releases.length,
      releases: releases.map(release => ({
        id: release.id,
        name: release.name,
        tagName: release.tag_name,
        publishedAt: release.published_at,
        draft: release.draft,
        prerelease: release.prerelease,
        downloadCount: release.assets.reduce((total, asset) => total + asset.download_count, 0),
        assets: release.assets.map(asset => ({
          name: asset.name,
          downloadCount: asset.download_count,
          size: asset.size,
          contentType: asset.content_type
        }))
      }))
    };

    // Calculate stats
    metrics.stats = {
      totalDownloads: metrics.releases.reduce((total, release) => total + release.downloadCount, 0),
      averageDownloadsPerRelease: metrics.releases.length > 0 
        ? Math.round(metrics.releases.reduce((total, release) => total + release.downloadCount, 0) / metrics.releases.length)
        : 0,
      latestRelease: metrics.releases.length > 0 ? metrics.releases[0] : null,
      draftReleases: metrics.releases.filter(r => r.draft).length,
      prereleases: metrics.releases.filter(r => r.prerelease).length,
      topReleases: [...metrics.releases]
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 5)
    };

    // Calculate asset stats
    const assetSummary = new Map();
    metrics.releases.forEach(release => {
      release.assets.forEach(asset => {
        if (asset.downloadCount > 0) {
          const key = asset.name;
          if (!assetSummary.has(key)) {
            assetSummary.set(key, {
              name: asset.name,
              totalDownloads: 0,
              appearances: 0,
              totalSize: 0,
              contentType: asset.contentType
            });
          }
          const summary = assetSummary.get(key);
          summary.totalDownloads += asset.downloadCount;
          summary.appearances += 1;
          summary.totalSize = asset.size;
        }
      });
    });

    metrics.stats.topAssets = Array.from(assetSummary.values())
      .filter(asset => asset.totalDownloads > 0)
      .sort((a, b) => b.totalDownloads - a.totalDownloads)
      .slice(0, 10);

    return metrics;
  }

  displayMetrics(metrics) {
    this.hideAll();
    document.getElementById('dashboardContent').classList.remove('hidden');
    
    // Update timestamps with local timezone
    this.updateTimestamps(metrics.timestamp);

    this.renderRepositoryInfo(metrics);
    this.renderKeyMetrics(metrics);
    this.renderLatestRelease(metrics);
    this.renderTopReleases(metrics);
    this.renderTopAssets(metrics);
  }

  // Helper function to format dates with client browser locale
  formatDateTime(dateInput, includeTime = true, showTimezone = false) {
    const date = new Date(dateInput);
    
    if (includeTime) {
      // Full date and time format
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      };
      
      if (showTimezone) {
        options.timeZoneName = 'short';
      }
      
      return date.toLocaleString(undefined, options);
    } else {
      // Date only format - show relative time for recent dates
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  }

  updateTimestamps(lastUpdateTime) {
    const lastUpdate = new Date(lastUpdateTime);
    
    // Show timezone for timestamps in header for clarity
    document.getElementById('lastUpdate').textContent = this.formatDateTime(lastUpdate, true, true);
    document.getElementById('nextUpdate').textContent = 'Next update: On page refresh';
  }

  hardRefresh() {
    // Force complete page reload without cache
    window.location.reload(true);
  }

  renderRepositoryInfo(metrics) {
    const { repositoryInfo } = metrics;
    document.getElementById('repoInfo').innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">📁 Repository Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-600">${repositoryInfo.stars.toLocaleString()}</div>
          <div class="text-gray-600">⭐ Stars</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">${repositoryInfo.forks.toLocaleString()}</div>
          <div class="text-gray-600">🍴 Forks</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">${repositoryInfo.watchers.toLocaleString()}</div>
          <div class="text-gray-600">👀 Watchers</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-purple-600">${repositoryInfo.language || 'N/A'}</div>
          <div class="text-gray-600">💻 Language</div>
        </div>
      </div>
      ${repositoryInfo.description ? `
      <div class="mt-4 p-3 bg-gray-50 rounded">
        <p class="text-gray-700">${repositoryInfo.description}</p>
      </div>
      ` : ''}
    `;
  }

  renderKeyMetrics(metrics) {
    document.getElementById('keyMetrics').innerHTML = `
      <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center">
          <div class="text-4xl text-blue-600">📦</div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-800">${metrics.totalReleases}</div>
            <div class="text-gray-600">Total Releases</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center">
          <div class="text-4xl text-green-600">⬇️</div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-800">${metrics.stats.totalDownloads.toLocaleString()}</div>
            <div class="text-gray-600">Total Downloads</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center">
          <div class="text-4xl text-purple-600">📊</div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-800">${metrics.stats.averageDownloadsPerRelease.toLocaleString()}</div>
            <div class="text-gray-600">Avg Downloads</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div class="flex items-center">
          <div class="text-4xl text-orange-600">🚧</div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-gray-800">${metrics.stats.prereleases}</div>
            <div class="text-gray-600">Pre-releases</div>
          </div>
        </div>
      </div>
    `;
  }

  renderLatestRelease(metrics) {
    const latest = metrics.stats.latestRelease;
    if (!latest) {
      document.getElementById('latestRelease').innerHTML = '<p class="text-gray-500">No releases found</p>';
      return;
    }

    document.getElementById('latestRelease').innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">🚀 Latest Release</h2>
      <div class="bg-blue-50 rounded-lg p-4">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-semibold text-blue-800">${latest.name}</h3>
            <p class="text-blue-600">Tag: ${latest.tagName}</p>
                            <p class="text-gray-600">Released: ${this.formatDateTime(latest.publishedAt, false)}</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-blue-800">${latest.downloadCount.toLocaleString()}</div>
            <div class="text-blue-600">Downloads</div>
          </div>
        </div>
        
        ${latest.assets.length > 0 ? `
        <div class="mt-4">
          <h4 class="font-semibold text-gray-800 mb-2">📎 Assets:</h4>
          <div class="space-y-2">
            ${latest.assets
              .filter(asset => asset.downloadCount > 0)
              .sort((a, b) => b.downloadCount - a.downloadCount)
              .map(asset => `
            <div class="flex justify-between items-center bg-white rounded p-3">
              <div>
                <span class="font-medium">${asset.name}</span>
                <span class="text-sm text-gray-500 ml-2">(${this.formatBytes(asset.size)})</span>
              </div>
              <span class="text-blue-600 font-semibold">${asset.downloadCount.toLocaleString()} downloads</span>
            </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  renderTopReleases(metrics) {
    if (metrics.stats.topReleases.length === 0) {
      document.getElementById('topReleases').innerHTML = '<p class="text-gray-500">No releases with downloads found</p>';
      return;
    }

    document.getElementById('topReleases').innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">🏆 Top Releases by Downloads</h2>
      <div class="space-y-3">
        ${metrics.stats.topReleases.map((release, index) => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
              ${index + 1}
            </div>
            <div>
              <div class="font-semibold">${release.name}</div>
                                  <div class="text-sm text-gray-600">${release.tagName} • ${this.formatDateTime(release.publishedAt, false)}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold text-blue-600">${release.downloadCount.toLocaleString()}</div>
            <div class="text-sm text-gray-600">downloads</div>
          </div>
        </div>
        `).join('')}
      </div>
    `;
  }

  renderTopAssets(metrics) {
    if (metrics.stats.topAssets.length === 0) {
      document.getElementById('topAssets').innerHTML = '<p class="text-gray-500">No assets with downloads found</p>';
      return;
    }

    document.getElementById('topAssets').innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-4">📁 Top Assets by Downloads</h2>
      <div class="space-y-3">
        ${metrics.stats.topAssets.slice(0, 5).map((asset, index) => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
              ${index + 1}
            </div>
            <div>
              <div class="font-semibold">${asset.name}</div>
              <div class="text-sm text-gray-600">${this.formatBytes(asset.totalSize)} • Appears in ${asset.appearances} release(s)</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold text-green-600">${asset.totalDownloads.toLocaleString()}</div>
            <div class="text-sm text-gray-600">total downloads</div>
          </div>
        </div>
        `).join('')}
      </div>
    `;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showLoading() {
    this.hideAll();
    document.getElementById('loadingState').classList.remove('hidden');
  }

  showError(message) {
    this.hideAll();
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
  }

  hideAll() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('dashboardContent').classList.add('hidden');
  }


}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new DynamicGitHubDashboard();
  dashboard.init();
});