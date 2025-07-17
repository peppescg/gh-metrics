const GitHubMetricsCollector = require('./metrics-collector');
const DashboardBuilder = require('./build-dashboard');

async function testLocal() {
  console.log('🧪 Testing GitHub Metrics Collection Locally\n');
  
  // Check environment variables
  const requiredVars = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your environment or .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables check passed');
  console.log(`🎯 Target: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}\n`);
  
  try {
    // Test metrics collection
    console.log('1️⃣ Testing metrics collection...');
    const collector = new GitHubMetricsCollector();
    await collector.run();
    
    console.log('\n2️⃣ Testing dashboard generation...');
    const dashboard = new DashboardBuilder();
    await dashboard.build();
    
    console.log('\n✅ All tests passed successfully!');
    console.log('\n📁 Generated files:');
    console.log('   - data/latest.json (latest metrics)');
    console.log('   - data/history.json (historical data)');
    console.log('   - docs/index.html (dashboard)');
    console.log('   - logs/executions.json (execution logs)');
    
    console.log('\n🌐 To view the dashboard locally:');
    console.log('   Open docs/index.html in your browser');
    console.log('   Or run: python3 -m http.server 8000 --directory docs');
    console.log('   Then visit: http://localhost:8000');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testLocal(); 