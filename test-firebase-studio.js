
// test-firebase-studio.js
const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
const path = require('path'); // To correctly locate service-account-key.json

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🔍 FIREBASE STUDIO CONNECTION DIAGNOSTICS${colors.reset}\n`);
console.log('=' .repeat(50));

let testResults = [];
let serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
let serviceAccountProjectId = 'unknown';

async function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await fn();
    console.log(`${colors.green}✅ PASSED${colors.reset}`);
    testResults.push({ name, status: 'PASS' });
  } catch (error) {
    console.log(`${colors.red}❌ FAILED${colors.reset}`);
    console.log(`${colors.yellow}  └─ ${error.message.split('\n')[0]}${colors.reset}`); // Show only first line of error for brevity
    testResults.push({ name, status: 'FAIL', error: error.message });
  }
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => { // Added timeout
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { // More flexible success status
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data.substring(0,100)}...`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after 5s`));
    });
  });
}

async function runDiagnostics() {
  // Test 1: Service Account Key
  await test('Service Account Key File', async () => {
    try {
        const serviceAccount = require(serviceAccountPath);
        if (!serviceAccount.project_id) throw new Error('Missing project_id in service-account-key.json');
        if (!serviceAccount.private_key) throw new Error('Missing private_key in service-account-key.json');
        if (!serviceAccount.client_email) throw new Error('Missing client_email in service-account-key.json');
        serviceAccountProjectId = serviceAccount.project_id;
        console.log(`\n  └─ Project ID from key: ${colors.blue}${serviceAccount.project_id}${colors.reset}`);
    } catch (e) {
        throw new Error(`Failed to load or parse service-account-key.json from ${serviceAccountPath}. Ensure it exists and is valid JSON. Original error: ${e.message}`);
    }
  });

  // Test 2: Firebase Admin Initialization
  await test('Firebase Admin SDK Init', async () => {
    if (serviceAccountProjectId === 'unknown') {
        throw new Error('Cannot initialize Admin SDK: Project ID not found in service account key.');
    }
    if (admin.apps.length === 0) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    if (!admin.app().options.projectId) {
        throw new Error('Admin SDK initialized but project ID is undefined.');
    }
    console.log(`\n  └─ SDK Initialized for Project: ${colors.blue}${admin.app().options.projectId}${colors.reset}`);
    if (admin.app().options.projectId !== serviceAccountProjectId) {
        console.log(`${colors.yellow}  └─ WARNING: SDK Project ID (${admin.app().options.projectId}) differs from service account file's Project ID (${serviceAccountProjectId}). This might indicate an issue.${colors.reset}`);
    }
  });

  // Test 3: Firestore Connection
  await test('Firestore Basic Connection', async () => {
    if (admin.apps.length === 0) throw new Error('Admin SDK not initialized, skipping Firestore test.');
    const db = admin.firestore();
    const testRef = db.collection('_studio_connection_test').doc(`test_${Date.now()}`);
    await testRef.set({ 
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'Firebase Studio Diagnostic Script'
    });
    const doc = await testRef.get();
    if (!doc.exists) throw new Error('Could not read test document from Firestore');
    await testRef.delete();
  });

  // Test 4: Check Collections
  console.log(`\n${colors.blue}📁 Checking Firestore Collections (expecting seeded data):${colors.reset}`);
  const collectionsToTest = ['companies', 'users', 'products', 'inventory', 'suppliers', 'orders'];
  
  if (admin.apps.length > 0) {
    const db = admin.firestore();
    for (const col of collectionsToTest) {
      await test(`Collection '${col}' has data`, async () => {
        const snapshot = await db.collection(col).limit(1).get();
        if (snapshot.empty) {
          throw new Error(`Collection '${col}' is empty. Please run the seed script: npx tsx scripts/seedData.ts`);
        }
        console.log(`\n  └─ Found ${colors.green}${snapshot.docs.length}+${colors.reset} document(s) in '${col}'`);
      });
    }
  } else {
    console.log(`${colors.yellow}  Skipping Firestore collection checks as Admin SDK is not initialized.${colors.reset}`);
  }


  // Test 5: Local Server APIs
  console.log(`\n${colors.blue}🌐 Testing API Endpoints (running Next.js server):${colors.reset}`);
  
  const MOCK_COMPANY_ID_FOR_API = 'comp_seed_co_001'; // Ensure this matches your admin-auth mock
  const MOCK_USER_ID_FOR_API = 'user_owner_seed_001'; // Ensure this matches

  // Construct a mock token. In a real scenario, this would be more complex.
  // For development with mock auth in `admin-auth.ts`, the actual token content doesn't matter, only its presence.
  const MOCK_AUTH_HEADER = { 'Authorization': 'Bearer mock-dev-token' };


  const baseUrls = [
    'http://localhost:9003', // From your package.json dev script
    'http://127.0.0.1:9003',
    'http://localhost:9002', // A common alternative
    'http://127.0.0.1:9002',
    // The Firebase Studio URL is tricky as it's often proxied or internal.
    // For local testing, focusing on localhost is more reliable.
    // `https://studio-YOUR_PROJECT_ID.firebase.google.com/YOUR_PROJECT_ID` - this format is not standard for API calls.
    // If Firebase Studio exposes your Next.js app on a specific URL, you'd use that.
  ];

  let workingUrl = null;
  for (const url of baseUrls) {
    try {
      process.stdout.write(`  Attempting health check at ${url}/api/health ... `);
      await makeRequest(`${url}/api/health`);
      workingUrl = url;
      console.log(`${colors.green}✅ Success${colors.reset}`);
      console.log(`  └─ Using API Base URL: ${colors.green}${url}${colors.reset}`);
      break;
    } catch (e) {
      console.log(`${colors.red}❌ Failed (${e.message.split('\n')[0]})${colors.reset}`);
    }
  }

  if (workingUrl) {
    await test('Health Check API (/api/health)', async () => {
      const result = await makeRequest(`${workingUrl}/api/health`); // No auth needed
      const data = JSON.parse(result.data);
      if (data.status !== 'ok') throw new Error('Health check status not OK: ' + result.data);
      if (data.firestoreReachable !== true) throw new Error('Health check reports Firestore not reachable: ' + result.data);
    });

    await test('Inventory API (/api/inventory)', async () => {
      const result = await makeRequest(`${workingUrl}/api/inventory`, { headers: MOCK_AUTH_HEADER });
      const data = JSON.parse(result.data);
      if (!Array.isArray(data.data)) throw new Error('Invalid response format for inventory API. Expected { data: [] }. Got: ' + result.data.substring(0,100));
      // The mock auth should return data for comp_seed_co_001. If seeded, this shouldn't be empty.
      if (data.data.length === 0) console.log(`\n  ${colors.yellow}└─ Warning: Inventory API returned 0 items. Ensure data is seeded for company ${MOCK_COMPANY_ID_FOR_API}.${colors.reset}`);
    });

    await test('Dashboard API (/api/analytics/dashboard)', async () => {
        const result = await makeRequest(`${workingUrl}/api/analytics/dashboard`, { headers: MOCK_AUTH_HEADER });
        const data = JSON.parse(result.data);
        if (!data.data || typeof data.data.totalInventoryValue !== 'number') throw new Error('Invalid response format for dashboard API. Expected { data: { totalInventoryValue: number, ... } }. Got: ' + result.data.substring(0,100));
    });

  } else {
    console.log(`${colors.red}  ❌ Could not find a working Next.js API server. Ensure 'npm run dev' is running on a checked port (e.g., 9003).${colors.reset}`);
    // Add fail statuses for API tests if no working URL
    testResults.push({ name: 'Health Check API', status: 'FAIL', error: 'No working API URL found' });
    testResults.push({ name: 'Inventory API', status: 'FAIL', error: 'No working API URL found' });
    testResults.push({ name: 'Dashboard API', status: 'FAIL', error: 'No working API URL found' });
  }

  // Test 6: Environment Check
  console.log(`\n${colors.blue}🔧 Environment Check:${colors.reset}`);
  await test('Node.js Version', async () => {
    const version = process.version;
    console.log(`\n  └─ Version: ${colors.green}${version}${colors.reset}`);
    const major = parseInt(version.split('.')[0].substring(1));
    if (major < 18) throw new Error(`Node.js 18+ recommended. You are using ${major}.`);
  });

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log(`${colors.blue}📊 DIAGNOSTIC SUMMARY:${colors.reset}`);
  const passedCount = testResults.filter(t => t.status === 'PASS').length;
  const failedCount = testResults.filter(t => t.status === 'FAIL').length;
  
  testResults.forEach(res => {
    if (res.status === 'PASS') {
        console.log(`  ${colors.green}✅ ${res.name}${colors.reset}`);
    } else {
        console.log(`  ${colors.red}❌ ${res.name} - Error: ${res.error.split('\n')[0]}${colors.reset}`);
    }
  });

  console.log(`\n  Total Passed: ${colors.green}${passedCount}${colors.reset}`);
  console.log(`  Total Failed: ${colors.red}${failedCount}${colors.reset}`);
  
  if (failedCount > 0) {
    console.log(`\n${colors.yellow}⚠️  Review the FAILED tests above and address the issues.${colors.reset}`);
    console.log(`\n${colors.blue}💡 Common Quick Fixes:${colors.reset}`);
    if (testResults.some(t => t.name === 'Service Account Key File' && t.status === 'FAIL')) {
        console.log(`  - Ensure 'service-account-key.json' is in the project root (${process.cwd()}) and is valid.`);
    }
    if (testResults.some(t => t.name.includes('Collection') && t.error && t.error.includes('empty'))) {
        console.log(`  - Some collections are empty. Run the seed script: ${colors.blue}npx tsx scripts/seedData.ts${colors.reset}`);
    }
    if (testResults.some(t => t.name.includes('API') && t.error && t.error.includes('No working API URL'))) {
        console.log(`  - API tests failed to connect. Ensure your Next.js dev server is running (e.g., 'npm run dev', typically on port 9003).`);
    }
     if (testResults.some(t => t.name === 'Firestore Basic Connection' && t.status === 'FAIL')) {
        console.log(`  - Firestore connection failed. Check Admin SDK initialization and network access to Firestore.`);
    }

  } else {
    console.log(`\n${colors.green}🎉 All critical tests passed! Your Firebase Studio setup appears to be working correctly.${colors.reset}`);
  }

  const needsSeeding = testResults.some(t => 
    t.error && t.error.includes('Collection') && t.error.includes('empty')
  );
  
  if (needsSeeding) {
    console.log(`\n${colors.yellow}📌 RECOMMENDED ACTION:${colors.reset} Some collections are empty.`);
    console.log(`   Run: ${colors.blue}npx tsx scripts/seedData.ts${colors.reset} to populate them.`);
  }
}

// Run the diagnostics
runDiagnostics().catch(error => {
    console.error("\nCRITICAL ERROR DURING DIAGNOSTICS:", error);
});

    