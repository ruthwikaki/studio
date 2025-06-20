const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('Initializing with project:', serviceAccount.project_id);

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Admin SDK initialized');
  }
  
  const db = admin.firestore();
  console.log('Firestore instance created:', !!db);
  
  db.collection('test').add({ test: true })
    .then(ref => {
      console.log('Successfully wrote to Firestore, doc ID:', ref.id);
      return ref.delete();
    })
    .then(() => console.log('Cleanup complete'))
    .catch(err => console.error('Firestore error:', err.message));
    
} catch (error) {
  console.error('Init error:', error.message);
}