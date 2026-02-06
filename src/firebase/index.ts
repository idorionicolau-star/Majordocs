'use client';

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';

// Re-export the firestore instance as 'db' to match usage in new contexts
import { getFirestore } from 'firebase/firestore';
import { app } from './provider';
export const db = getFirestore(app);
