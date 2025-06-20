
// test-firebase-studio.js
const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
// const path = require('path'); // path module not strictly needed if using env vars

// Load environment variables from .env (or .env.local) if this script is run locally
// In Firebase Studio, environment variables should be set directly in the environment.
require('dotenv').config();


// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🔍 FIREBASE STUDIO CONNECTION DIAGNOSTICS (ENV VAR MODE)${colors.reset}\n`);
console.log('=' .repeat(50));

let testResults = [];
let serviceAccountProjectId = process.env.FIREBASE_PROJECT_ID || 'unknown_from_env';

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

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 5000, ...options }, (res) => { // Added timeout & options
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) { // Allow 3xx for some API structures
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
  // Test 1: Environment Variables for Service Account
  await test('Firebase Admin Env Variables', async () => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId) throw new Error('Missing FIREBASE_PROJECT_ID from environment variables.');
    if (!clientEmail) throw new Error('Missing FIREBASE_CLIENT_EMAIL from environment variables.');
    if (!privateKey) throw new Error('Missing FIREBASE_PRIVATE_KEY from environment variables.');
    
    serviceAccountProjectId = projectId; // Update based on env
    console.log(`\n  └─ Project ID from env: ${colors.blue}${projectId}${colors.reset}`);
    console.log(`  └─ Client Email from env: ${colors.blue}${clientEmail ? 'SET' : 'NOT SET'}${colors.reset}`);
    console.log(`  └─ Private Key from env: ${colors.blue}${privateKey ? 'SET' : 'NOT SET'}${colors.reset}`);
  });

  // Test 2: Firebase Admin Initialization
  await test('Firebase Admin SDK Init (Env Vars)', async () => {
    if (serviceAccountProjectId === 'unknown_from_env' || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('Cannot initialize Admin SDK: Required environment variables not found.');
    }
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // Ensure newlines are handled
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
    if (!admin.app().options.projectId) {
        throw new Error('Admin SDK initialized but project ID is undefined.');
    }
    console.log(`\n  └─ SDK Initialized for Project: ${colors.blue}${admin.app().options.projectId}${colors.reset}`);
  });

  // Test 3: Firestore Connection
  await test('Firestore Basic Connection', async () => {
    if (admin.apps.length === 0) throw new Error('Admin SDK not initialized, skipping Firestore test.');
    const db = admin.firestore();
    const testRef = db.collection('_studio_connection_test').doc(`test_env_${Date.now()}`);
    await testRef.set({ 
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'Firebase Studio Diagnostic Script (Env Var Mode)'
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
  
  const MOCK_COMPANY_ID_FOR_API = process.env.MOCK_COMPANY_ID || 'comp_seed_co_001';
  const MOCK_USER_ID_FOR_API = process.env.MOCK_USER_ID || 'user_owner_seed_001';
  const MOCK_AUTH_HEADER = { 'Authorization': 'Bearer mock-dev-token-env' }; // For dev mock auth

  const PORT = process.env.PORT || 9003;
  const baseUrls = [
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
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
      const result = await makeRequest(`${workingUrl}/api/health`); // No auth needed for this specific test
      const data = JSON.parse(result.data);
      if (!data || data.status !== 'ok' && data.status !== 'ok_minimal_health_check' && data.adminSDK?.isInitialized !== true) {
          // If adminSDK isInitialized is false, it's still a "pass" for the route itself working, but log details.
          if (data.adminSDK?.isInitialized === false) {
              console.log(`\n  ${colors.yellow}└─ Health check reports Admin SDK not initialized. Reason: ${data.adminSDK?.reportedError || 'Unknown'}${colors.reset}`);
          } else {
            throw new Error('Health check status not OK or Admin SDK not initialized: ' + result.data);
          }
      }
    });

    await test('Inventory API (/api/inventory - with mock auth)', async () => {
      const result = await makeRequest(`${workingUrl}/api/inventory`, { headers: MOCK_AUTH_HEADER });
      const data = JSON.parse(result.data);
      if (!Array.isArray(data.data)) throw new Error('Invalid response format for inventory API. Expected { data: [] }. Got: ' + result.data.substring(0,100));
      if (data.data.length === 0) console.log(`\n  ${colors.yellow}└─ Warning: Inventory API returned 0 items. Ensure data is seeded for company ${MOCK_COMPANY_ID_FOR_API}.${colors.reset}`);
    });

    await test('Dashboard API (/api/analytics/dashboard - with mock auth)', async () => {
        const result = await makeRequest(`${workingUrl}/api/analytics/dashboard`, { headers: MOCK_AUTH_HEADER });
        const data = JSON.parse(result.data);
        if (!data.data || typeof data.data.totalInventoryValue !== 'number') throw new Error('Invalid response format for dashboard API. Expected { data: { totalInventoryValue: number, ... } }. Got: ' + result.data.substring(0,100));
    });

  } else {
    console.log(`${colors.red}  ❌ Could not find a working Next.js API server. Ensure 'npm run dev' is running on a checked port (e.g., ${PORT}).${colors.reset}`);
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
    if (testResults.some(t => t.name === 'Firebase Admin Env Variables' && t.status === 'FAIL')) {
        console.log(`  - Ensure 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', and 'FIREBASE_PRIVATE_KEY' are correctly set in your .env or .env.local file.`);
        console.log(`  - For 'FIREBASE_PRIVATE_KEY', ensure newlines are correctly represented (e.g., "\\n" in the .env file).`);
    }
    if (testResults.some(t => t.name.includes('Collection') && t.error && t.error.includes('empty'))) {
        console.log(`  - Some collections are empty. Run the seed script: ${colors.blue}npx tsx scripts/seedData.ts${colors.reset}`);
    }
    if (testResults.some(t => t.name.includes('API') && t.error && t.error.includes('No working API URL'))) {
        console.log(`  - API tests failed to connect. Ensure your Next.js dev server is running (e.g., 'npm run dev', typically on port ${PORT}).`);
    }
     if (testResults.some(t => t.name === 'Firestore Basic Connection' && t.status === 'FAIL')) {
        console.log(`  - Firestore connection failed. Check Admin SDK initialization (using env vars) and network access to Firestore.`);
    }

  } else {
    console.log(`\n${colors.green}🎉 All critical tests passed! Your Firebase Studio setup (using environment variables) appears to be working correctly.${colors.reset}`);
  }

  const needsSeeding = testResults.some(t => 
    t.error && t.error.includes('Collection') && t.error.includes('empty')
  );
  
  if (needsSeeding) {
    console.log(`\n${colors.yellow}📌 RECOMMENDED ACTION:${colors.reset} Some collections are empty.`);
    console.log(`   Run: ${colors.blue}npx tsx scripts/seedData.ts${colors.reset} to populate them.`);
  }
}

runDiagnostics().catch(error => {
    console.error("\nCRITICAL ERROR DURING DIAGNOSTICS:", error);
});
