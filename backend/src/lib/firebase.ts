import * as admin from 'firebase-admin'

export let firebaseReady = false

try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

    if (projectId && privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
        storageBucket,
      })
      firebaseReady = true
      console.log('✅ Firebase Admin initialized')
    } else {
      // Initialize without credentials — public routes still work,
      // admin/upload routes will return 503 until credentials are set.
      admin.initializeApp({ projectId: projectId ?? 'ar-menu-dev' })
      console.warn('⚠️  Firebase Admin started without service account credentials.')
      console.warn('   Admin login and file uploads will not work.')
      console.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL to enable.')
    }
  } else {
    firebaseReady = true
  }
} catch (err) {
  console.error('❌ Firebase Admin initialization error:', err)
}

export { admin }

export const auth = admin.apps.length ? admin.auth() : null
export const storage = admin.apps.length ? admin.storage() : null
export const bucket = (admin.apps.length && process.env.FIREBASE_STORAGE_BUCKET)
  ? admin.storage().bucket()
  : null
