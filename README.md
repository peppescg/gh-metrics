# 📊 GitHub Metrics Dashboard

Automated GitHub release metrics collection and visualization using GitHub Actions and GitHub Pages.

## 🌟 Features

- ✅ **Automated Data Collection**: Daily metrics collection via GitHub Actions cron job
- 📊 **Beautiful Dashboard**: Modern, responsive web dashboard with charts and analytics
- 📈 **Historical Tracking**: Track metrics over time with trend charts
- 🔄 **Real-time Updates**: Dashboard auto-refreshes and data updates automatically
- 📱 **Mobile Friendly**: Responsive design works on all devices
- 🚀 **Zero Maintenance**: Completely automated - set it and forget it
- 📋 **Comprehensive Logs**: Track execution history and troubleshoot issues
- 🎨 **GitHub Pages Integration**: Hosted directly on GitHub for free

## 📷 Dashboard Preview

The dashboard displays:

- Repository overview (stars, forks, watchers)
- Release metrics (total downloads, averages)
- Interactive trend charts
- Top releases and assets by downloads
- Latest release details with asset breakdown
- Execution logs and status

## 🚀 Quick Start

### 1. Fork or Clone This Repository

```bash
git clone https://github.com/your-username/github-metrics-dashboard.git
cd github-metrics-dashboard
```

### 2. Configure Environment Variables

The GitHub Action automatically uses the repository's context, but you can also monitor external repositories by setting:

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `GITHUB_OWNER`: Auto-detected from repository context
- `GITHUB_REPO`: Auto-detected from repository context

To monitor a different repository, you can modify the workflow file.

### 3. Enable GitHub Pages

1. Go to your repository **Settings**
2. Navigate to **Pages** section
3. Set **Source** to "GitHub Actions"
4. Save the configuration

### 4. Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. Enable workflows if prompted
3. The workflow will run automatically every day at 10:00 UTC
4. You can also trigger it manually using "Run workflow"

### 5. View Your Dashboard

After the first run, your dashboard will be available at:

```
https://your-username.github.io/your-repository-name/
```

## ⚙️ Configuration

### Monitoring Different Repository

To monitor a different repository, edit `.github/workflows/collect-metrics.yml`:

```yaml
- name: Collect metrics
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_OWNER: "target-owner" # Change this
    GITHUB_REPO: "target-repository" # Change this
  run: npm run collect
```

### Change Schedule

Modify the cron schedule in the workflow file:

```yaml
on:
  schedule:
    - cron: "0 10 * * *" # Daily at 10:00 UTC
    # Examples:
    # - cron: '0 */6 * * *'   # Every 6 hours
    # - cron: '0 10 * * 1'    # Weekly on Monday
```

### Dashboard Refresh Rate

Edit `src/build-dashboard.js` to change auto-refresh interval:

```javascript
const DASHBOARD_REFRESH_MINUTES = 30; // Change this value
```

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- GitHub personal access token

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token and target repository
   ```

3. **Test locally**

   ```bash
   npm test
   ```

4. **View dashboard locally**
   ```bash
   # After running tests, serve the dashboard
   python3 -m http.server 8000 --directory docs
   # Visit http://localhost:8000
   ```

### Available Scripts

```bash
npm run collect       # Collect metrics
npm run build-dashboard # Build HTML dashboard
npm run test         # Run full test suite
npm run dev          # Development mode with auto-restart
```

## 📁 Project Structure

```
github-metrics-dashboard/
├── .github/workflows/
│   └── collect-metrics.yml    # GitHub Actions workflow
├── src/
│   ├── metrics-collector.js   # Main metrics collection logic
│   ├── build-dashboard.js     # Dashboard HTML generator
│   └── test-local.js         # Local testing script
├── data/                     # Generated metrics data (committed by Actions)
│   ├── latest.json          # Latest metrics
│   ├── history.json         # Historical data (90 days)
│   └── metrics-YYYY-MM-DD.json # Daily snapshots
├── docs/                    # Generated dashboard (GitHub Pages)
│   └── index.html          # Dashboard HTML
├── logs/                   # Execution logs (committed by Actions)
│   ├── executions.json     # Structured execution history
│   └── execution-YYYY-MM-DD.log # Daily logs
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md            # This documentation
```

## 📊 Data Structure

### Metrics Data Format

```json
{
  "timestamp": "2024-01-15T10:00:00.000Z",
  "date": "2024-01-15",
  "repository": "owner/repo",
  "repositoryInfo": {
    "stars": 1234,
    "forks": 567,
    "watchers": 89,
    "language": "JavaScript"
  },
  "totalReleases": 25,
  "releases": [...],
  "stats": {
    "totalDownloads": 15847,
    "averageDownloadsPerRelease": 634,
    "latestRelease": {...},
    "topReleases": [...],
    "topAssets": [...]
  }
}
```

### Historical Data

The system maintains:

- **Daily snapshots**: Individual files for each day
- **Latest data**: Always current metrics
- **History summary**: 90 days of key metrics for charts
- **Execution logs**: Success/failure tracking

## 🔧 Troubleshooting

### Common Issues

1. **Workflow not running**

   - Check if GitHub Actions are enabled
   - Verify the workflow file syntax
   - Check repository permissions

2. **GitHub Pages not updating**

   - Ensure Pages is set to "GitHub Actions" source
   - Check Actions tab for deployment status
   - Verify `docs/` directory is being created

3. **No data in dashboard**

   - Check if target repository has releases
   - Verify GitHub token permissions
   - Review Actions logs for errors

4. **Permission errors**
   - Ensure workflow has `contents: write` permission
   - Check if repository settings allow Actions to write

### Debug Logs

View execution details in:

- **GitHub Actions logs**: Actions tab → Latest workflow run
- **Dashboard execution table**: Shows recent run status
- **JSON logs**: `logs/executions.json` for structured data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **GitHub API**: For providing comprehensive release data
- **Chart.js**: For beautiful, responsive charts
- **Tailwind CSS**: For modern, utility-first styling
- **GitHub Actions**: For free, reliable automation
- **GitHub Pages**: For free static site hosting

## 📈 Example Repositories Using This

- [Example 1](https://github.com/example/repo1) - VS Code Extension
- [Example 2](https://github.com/example/repo2) - CLI Tool
- [Example 3](https://github.com/example/repo3) - Library Package

---

⭐ **Star this repository** if you find it useful!

🐛 **Found a bug** or have a feature request? [Open an issue](https://github.com/your-username/github-metrics-dashboard/issues)

💬 **Questions?** Start a [discussion](https://github.com/your-username/github-metrics-dashboard/discussions)
