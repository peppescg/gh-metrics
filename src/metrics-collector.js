// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class GitHubMetricsCollector {
  constructor() {
    // Get GitHub context from environment variables (provided by GitHub Actions)
    this.token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER;
    this.repo = process.env.GITHUB_REPO;
    this.apiBase = 'https://api.github.com';
    
    if (!this.token || !this.owner || !this.repo) {
      throw new Error('Missing environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO are required');
    }
    
    console.log(`🎯 Target repository: ${this.owner}/${this.repo}`);
  }

  async fetchReleases() {
    try {
      console.log(`📊 Fetching release metrics...`);
      
      const response = await axios.get(`${this.apiBase}/repos/${this.owner}/${this.repo}/releases`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      console.log(`✅ Found ${response.data.length} releases`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching releases:', error.response?.data || error.message);
      throw error;
    }
  }

  async fetchRepositoryInfo() {
    try {
      console.log(`📝 Fetching repository information...`);
      
      const response = await axios.get(`${this.apiBase}/repos/${this.owner}/${this.repo}`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      return {
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        watchers: response.data.watchers_count,
        language: response.data.language,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        defaultBranch: response.data.default_branch,
        isPrivate: response.data.private
      };
    } catch (error) {
      console.error('❌ Error fetching repository info:', error.response?.data || error.message);
      return null;
    }
  }

  processMetrics(releases, repoInfo) {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    
    const metrics = {
      timestamp,
      date,
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
          contentType: asset.content_type,
          browserDownloadUrl: asset.browser_download_url
        }))
      }))
    };

    // Calculate aggregate statistics
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

    // Calculate asset statistics
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

  async saveMetrics(metrics) {
    const date = metrics.date;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Ensure directories exist
    await fs.ensureDir('./data');
    await fs.ensureDir('./logs');

    // Save daily metrics
    const dailyFile = path.join('./data', `metrics-${date}.json`);
    await fs.writeJson(dailyFile, metrics, { spaces: 2 });
    console.log(`💾 Daily metrics saved: ${dailyFile}`);

    // Save latest metrics
    await fs.writeJson('./data/latest.json', metrics, { spaces: 2 });
    console.log(`📄 Latest metrics saved: data/latest.json`);

    // Save historical data (append to array)
    const historyFile = './data/history.json';
    let history = [];
    
    try {
      if (await fs.pathExists(historyFile)) {
        history = await fs.readJson(historyFile);
      }
    } catch (error) {
      console.log('📝 Creating new history file');
    }

    // Remove existing entry for same date if exists
    history = history.filter(entry => entry.date !== date);
    
    // Add current metrics (keep only essential data for history)
    history.push({
      date: metrics.date,
      timestamp: metrics.timestamp,
      totalReleases: metrics.totalReleases,
      totalDownloads: metrics.stats.totalDownloads,
      averageDownloads: metrics.stats.averageDownloadsPerRelease,
      latestRelease: metrics.stats.latestRelease ? {
        name: metrics.stats.latestRelease.name,
        tagName: metrics.stats.latestRelease.tagName,
        downloadCount: metrics.stats.latestRelease.downloadCount
      } : null
    });

    // Keep only last 90 days
    history = history
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 90);

    await fs.writeJson(historyFile, history, { spaces: 2 });
    console.log(`📈 History updated: ${historyFile}`);

    return { dailyFile, historyFile };
  }

  async logExecution(metrics, success = true, error = null) {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    
    const logEntry = {
      timestamp,
      date,
      success,
      repository: `${this.owner}/${this.repo}`,
      totalReleases: metrics?.totalReleases || 0,
      totalDownloads: metrics?.stats?.totalDownloads || 0,
      error: error?.message || null
    };

    // Daily log file
    const logFile = path.join('./logs', `execution-${date}.log`);
    const logLine = `${timestamp} | ${success ? 'SUCCESS' : 'ERROR'} | Releases: ${logEntry.totalReleases} | Downloads: ${logEntry.totalDownloads}${error ? ` | Error: ${error.message}` : ''}\n`;
    
    await fs.appendFile(logFile, logLine);
    
    // JSON log for easier parsing
    const jsonLogFile = './logs/executions.json';
    let executions = [];
    
    try {
      if (await fs.pathExists(jsonLogFile)) {
        executions = await fs.readJson(jsonLogFile);
      }
    } catch (err) {
      console.log('📝 Creating new executions log');
    }

    executions.push(logEntry);
    
    // Keep only last 100 executions
    executions = executions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);

    await fs.writeJson(jsonLogFile, executions, { spaces: 2 });
    
    console.log(`📋 Execution logged: ${logFile}`);
  }

  async generateConsoleReport(metrics) {
    console.log('\n📈 GITHUB RELEASE METRICS REPORT');
    console.log('='.repeat(60));
    console.log(`🏷️  Repository: ${metrics.repository}`);
    console.log(`📅 Timestamp: ${metrics.timestamp}`);
    console.log(`🔢 Total Releases: ${metrics.totalReleases}`);
    console.log(`⬇️  Total Downloads: ${metrics.stats.totalDownloads.toLocaleString()}`);
    console.log(`📊 Average Downloads per Release: ${metrics.stats.averageDownloadsPerRelease.toLocaleString()}`);
    console.log(`📝 Draft Releases: ${metrics.stats.draftReleases}`);
    console.log(`🚧 Pre-releases: ${metrics.stats.prereleases}`);
    
    if (metrics.repositoryInfo) {
      console.log(`⭐ Stars: ${metrics.repositoryInfo.stars.toLocaleString()}`);
      console.log(`🍴 Forks: ${metrics.repositoryInfo.forks.toLocaleString()}`);
      console.log(`👀 Watchers: ${metrics.repositoryInfo.watchers.toLocaleString()}`);
    }
    
    if (metrics.stats.latestRelease) {
      console.log('\n🚀 LATEST RELEASE:');
      const latest = metrics.stats.latestRelease;
      console.log(`   Name: ${latest.name}`);
      console.log(`   Tag: ${latest.tagName}`);
      console.log(`   Date: ${new Date(latest.publishedAt).toLocaleDateString('en-US')}`);
      console.log(`   Downloads: ${latest.downloadCount.toLocaleString()}`);
    }

    if (metrics.stats.topReleases.length > 0) {
      console.log('\n📦 TOP 5 RELEASES BY DOWNLOADS:');
      metrics.stats.topReleases.forEach((release, index) => {
        console.log(`   ${index + 1}. ${release.name} (${release.tagName}) - ${release.downloadCount.toLocaleString()} downloads`);
      });
    }

    if (metrics.stats.topAssets.length > 0) {
      console.log('\n🏆 TOP ASSETS BY TOTAL DOWNLOADS:');
      metrics.stats.topAssets.slice(0, 5).forEach((asset, index) => {
        const sizeMB = (asset.totalSize / (1024 * 1024)).toFixed(2);
        console.log(`   ${index + 1}. ${asset.name}`);
        console.log(`      Total Downloads: ${asset.totalDownloads.toLocaleString()}`);
        console.log(`      Appears in: ${asset.appearances} release(s)`);
        console.log(`      Size: ${sizeMB} MB`);
      });
    }
    
    console.log('='.repeat(60));
  }

  async run() {
    let metrics = null;
    let error = null;
    
    try {
      console.log('🚀 Starting GitHub metrics collection...\n');
      
      const [releases, repoInfo] = await Promise.all([
        this.fetchReleases(),
        this.fetchRepositoryInfo()
      ]);
      
      metrics = this.processMetrics(releases, repoInfo);
      
      await this.saveMetrics(metrics);
      await this.generateConsoleReport(metrics);
      await this.logExecution(metrics, true);
      
      console.log('\n✅ Metrics collection completed successfully!');
      
    } catch (err) {
      error = err;
      console.error('\n❌ Error during metrics collection:', err.message);
      
      await this.logExecution(metrics, false, err);
      process.exit(1);
    }
  }
}

// Execute only if called directly
if (require.main === module) {
  const collector = new GitHubMetricsCollector();
  collector.run();
}

module.exports = GitHubMetricsCollector; 