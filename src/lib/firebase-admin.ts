import * as admin from 'firebase-admin';

const firebaseAdminConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export function initializeAdmin() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: firebaseAdminConfig.projectId,
        });
    }
    return admin;
}

export async function verifyIdToken(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const adminApp = initializeAdmin();
        const decodedToken = await adminApp.auth().verifyIdToken(token);

        // Fetch companyId and superAdmin status from the users collection
        const userDoc = await adminApp.firestore().doc(`users/${decodedToken.uid}`).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                ...decodedToken,
                companyId: userData?.companyId || null,
                superAdmin: userData?.superAdmin || false
            };
        }

        return decodedToken;
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return null;
    }
}
