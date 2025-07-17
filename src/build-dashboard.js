const fs = require('fs-extra');
const path = require('path');

const DASHBOARD_REFRESH_MINUTES = 30;

class DashboardBuilder {
  constructor() {
    this.dataDir = './data';
    this.docsDir = './docs';
    this.templateDir = './src/templates';
  }

  async loadData() {
    try {
      // Load latest metrics
      const latest = await fs.readJson(path.join(this.dataDir, 'latest.json'));
      
      // Load history if available
      let history = [];
      const historyPath = path.join(this.dataDir, 'history.json');
      if (await fs.pathExists(historyPath)) {
        history = await fs.readJson(historyPath);
      }

      // Load execution logs
      let executions = [];
      const executionsPath = path.join('./logs', 'executions.json');
      if (await fs.pathExists(executionsPath)) {
        executions = await fs.readJson(executionsPath);
      }

      return { latest, history, executions };
    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      throw error;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateChartsData(history) {
    // Prepare data for charts
    const chartData = {
      dates: history.map(h => h.date).reverse(),
      downloads: history.map(h => h.totalDownloads).reverse(),
      releases: history.map(h => h.totalReleases).reverse()
    };

    return `
      const chartData = ${JSON.stringify(chartData, null, 2)};
      
      // Downloads trend chart
      const downloadsCtx = document.getElementById('downloadsChart');
      if (downloadsCtx && chartData.dates.length > 1) {
        new Chart(downloadsCtx, {
          type: 'line',
          data: {
            labels: chartData.dates,
            datasets: [{
              label: 'Total Downloads',
              data: chartData.downloads,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Downloads Trend (Last 90 days)'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }

      // Releases trend chart
      const releasesCtx = document.getElementById('releasesChart');
      if (releasesCtx && chartData.dates.length > 1) {
        new Chart(releasesCtx, {
          type: 'line',
          data: {
            labels: chartData.dates,
            datasets: [{
              label: 'Total Releases',
              data: chartData.releases,
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Releases Count Trend (Last 90 days)'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    `;
  }

  generateHTML(data) {
    const { latest, history, executions } = data;
    const lastUpdate = new Date(latest.timestamp).toLocaleString('en-US');
    const nextUpdate = new Date(Date.now() + DASHBOARD_REFRESH_MINUTES * 60 * 1000).toLocaleString('en-US');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Metrics Dashboard - ${latest.repository}</title>
    <meta http-equiv="refresh" content="${DASHBOARD_REFRESH_MINUTES * 60}">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'><path d='M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z'/></svg>">
    <style>
        .metric-card {
            transition: transform 0.2s ease-in-out;
        }
        .metric-card:hover {
            transform: translateY(-2px);
        }
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .status-success { color: #059669; }
        .status-error { color: #dc2626; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header class="gradient-bg text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold">📊 GitHub Metrics Dashboard</h1>
                    <p class="text-blue-100 mt-1">Repository: <span class="font-semibold">${latest.repository}</span></p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-blue-100">Last Updated</p>
                    <p class="text-lg font-semibold">${lastUpdate}</p>
                    <p class="text-xs text-blue-200">Next update: ${nextUpdate}</p>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Repository Info -->
        ${latest.repositoryInfo ? `
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">📁 Repository Information</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="text-center">
                    <div class="text-3xl font-bold text-yellow-600">${latest.repositoryInfo.stars.toLocaleString()}</div>
                    <div class="text-gray-600">⭐ Stars</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-blue-600">${latest.repositoryInfo.forks.toLocaleString()}</div>
                    <div class="text-gray-600">🍴 Forks</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-green-600">${latest.repositoryInfo.watchers.toLocaleString()}</div>
                    <div class="text-gray-600">👀 Watchers</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-purple-600">${latest.repositoryInfo.language || 'N/A'}</div>
                    <div class="text-gray-600">💻 Language</div>
                </div>
            </div>
            ${latest.repositoryInfo.description ? `
            <div class="mt-4 p-3 bg-gray-50 rounded">
                <p class="text-gray-700">${latest.repositoryInfo.description}</p>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center">
                    <div class="text-4xl text-blue-600">📦</div>
                    <div class="ml-4">
                        <div class="text-2xl font-bold text-gray-800">${latest.totalReleases}</div>
                        <div class="text-gray-600">Total Releases</div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center">
                    <div class="text-4xl text-green-600">⬇️</div>
                    <div class="ml-4">
                        <div class="text-2xl font-bold text-gray-800">${latest.stats.totalDownloads.toLocaleString()}</div>
                        <div class="text-gray-600">Total Downloads</div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center">
                    <div class="text-4xl text-purple-600">📊</div>
                    <div class="ml-4">
                        <div class="text-2xl font-bold text-gray-800">${latest.stats.averageDownloadsPerRelease.toLocaleString()}</div>
                        <div class="text-gray-600">Avg Downloads</div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center">
                    <div class="text-4xl text-orange-600">🚧</div>
                    <div class="ml-4">
                        <div class="text-2xl font-bold text-gray-800">${latest.stats.prereleases}</div>
                        <div class="text-gray-600">Pre-releases</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        ${history.length > 1 ? `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
                <canvas id="downloadsChart"></canvas>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6">
                <canvas id="releasesChart"></canvas>
            </div>
        </div>
        ` : ''}

        <!-- Latest Release -->
        ${latest.stats.latestRelease ? `
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🚀 Latest Release</h2>
            <div class="bg-blue-50 rounded-lg p-4">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-semibold text-blue-800">${latest.stats.latestRelease.name}</h3>
                        <p class="text-blue-600">Tag: ${latest.stats.latestRelease.tagName}</p>
                        <p class="text-gray-600">Released: ${new Date(latest.stats.latestRelease.publishedAt).toLocaleDateString('en-US')}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-blue-800">${latest.stats.latestRelease.downloadCount.toLocaleString()}</div>
                        <div class="text-blue-600">Downloads</div>
                    </div>
                </div>
                
                ${latest.stats.latestRelease.assets.length > 0 ? `
                <div class="mt-4">
                    <h4 class="font-semibold text-gray-800 mb-2">📎 Assets:</h4>
                    <div class="space-y-2">
                        ${latest.stats.latestRelease.assets.filter(asset => asset.downloadCount > 0).map(asset => `
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
        </div>
        ` : ''}

        <!-- Top Releases -->
        ${latest.stats.topReleases.length > 0 ? `
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🏆 Top Releases by Downloads</h2>
            <div class="space-y-3">
                ${latest.stats.topReleases.map((release, index) => `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                            ${index + 1}
                        </div>
                        <div>
                            <div class="font-semibold">${release.name}</div>
                            <div class="text-sm text-gray-600">${release.tagName} • ${new Date(release.publishedAt).toLocaleDateString('en-US')}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-bold text-blue-600">${release.downloadCount.toLocaleString()}</div>
                        <div class="text-sm text-gray-600">downloads</div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Top Assets -->
        ${latest.stats.topAssets.length > 0 ? `
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">📁 Top Assets by Downloads</h2>
            <div class="space-y-3">
                ${latest.stats.topAssets.slice(0, 5).map((asset, index) => `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
        </div>
        ` : ''}

        <!-- Recent Executions -->
        ${executions.length > 0 ? `
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">🔄 Recent Executions</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Releases</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Downloads</th>
                            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Notes</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${executions.slice(0, 10).map(exec => `
                        <tr>
                            <td class="px-4 py-2">
                                <span class="${exec.success ? 'status-success' : 'status-error'} font-semibold">
                                    ${exec.success ? '✅ Success' : '❌ Error'}
                                </span>
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-600">
                                ${new Date(exec.timestamp).toLocaleDateString('en-US')}
                                <br>
                                <span class="text-xs">${new Date(exec.timestamp).toLocaleTimeString('en-US')}</span>
                            </td>
                            <td class="px-4 py-2 font-medium">${exec.totalReleases}</td>
                            <td class="px-4 py-2 font-medium">${exec.totalDownloads.toLocaleString()}</td>
                            <td class="px-4 py-2 text-sm text-gray-600">${exec.error || '-'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <footer class="text-center text-gray-500 text-sm py-8">
            <p>🔄 Dashboard auto-refreshes every ${DASHBOARD_REFRESH_MINUTES} minutes</p>
            <p class="mt-2">Generated by GitHub Actions • Powered by GitHub Pages</p>
            <p class="mt-1">📊 Data updated: ${lastUpdate}</p>
        </footer>
    </main>

    <script>
        ${this.generateChartsData(history)}
        
        // Auto-refresh warning before page reload
        let refreshWarning = false;
        setTimeout(() => {
            if (!refreshWarning) {
                refreshWarning = true;
                console.log('🔄 Page will refresh in 5 minutes to update metrics...');
            }
        }, (${DASHBOARD_REFRESH_MINUTES} - 5) * 60 * 1000);
    </script>
</body>
</html>`;
  }

  async build() {
    try {
      console.log('🏗️  Building dashboard...');
      
      // Ensure docs directory exists
      await fs.ensureDir(this.docsDir);
      
      // Load data
      const data = await this.loadData();
      
      // Generate HTML
      const html = this.generateHTML(data);
      
      // Save HTML file
      const htmlPath = path.join(this.docsDir, 'index.html');
      await fs.writeFile(htmlPath, html);
      
      console.log(`✅ Dashboard built successfully: ${htmlPath}`);
      console.log(`📊 Repository: ${data.latest.repository}`);
      console.log(`📈 Total Downloads: ${data.latest.stats.totalDownloads.toLocaleString()}`);
      console.log(`📦 Total Releases: ${data.latest.totalReleases}`);
      
    } catch (error) {
      console.error('❌ Error building dashboard:', error.message);
      throw error;
    }
  }
}

// Execute only if called directly
if (require.main === module) {
  const builder = new DashboardBuilder();
  builder.build();
}

module.exports = DashboardBuilder; 