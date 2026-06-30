import { db } from '../firebase.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';

export interface IReport {
  _id: string;
  title: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
  imageUrl: string;
  imageBase64?: string;
  videoUrl?: string;
  videoBase64?: string;
  isGenuine: boolean;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  issueType: string;
  recommendedAction: string;
  targetDepartment: string;
  status: 'Open' | 'Verifying' | 'Resolved';
  upvotes: number;
  peerVerifications?: number;
  verifierIds?: string[];
  verifiedByCitizens?: boolean;
  reporter?: { uid: string; name: string };
  statusTimeline?: { status: string; label: string; timestamp: string; active: boolean }[];
  aiSummary: string;
  location: { lat: number; lng: number };
  state: string;
  createdAt: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const Report = {
  async find(filter: Partial<IReport> = {}) {
    const path = 'reports';
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      const reports: IReport[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reports.push({
          ...data,
          _id: data._id || docSnap.id
        } as IReport);
      });
      
      // Filter & Sort by createdAt descending
      return reports.filter(r => {
        for (const key in filter) {
          if (filter[key as keyof IReport] !== undefined && r[key as keyof IReport] !== filter[key as keyof IReport]) {
            return false;
          }
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return [];
    }
  },

  async findById(id: string) {
    const path = `reports/${id}`;
    try {
      const docRef = doc(db, 'reports', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { ...data, _id: data._id || docSnap.id } as IReport;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return null;
    }
  },

  async create(payload: Partial<IReport>) {
    const id = payload._id || 'issue_' + Math.random().toString(36).substr(2, 9);
    const path = `reports/${id}`;
    try {
      const lat = parseFloat(payload.latitude || '20.5937');
      const lng = parseFloat(payload.longitude || '78.9629');
      
      const createdTime = payload.createdAt || new Date().toISOString();
      const defaultTimeline = [
        { status: 'Open', label: 'Citizen Reported', timestamp: createdTime, active: true },
        { status: 'Triage', label: 'AI Authenticated & Classified', timestamp: createdTime, active: true },
        { status: 'Verifying', label: 'Ward Supervisor Dispatched', timestamp: '', active: false },
        { status: 'Resolved', label: 'Infrastructure Repaired & Closed', timestamp: '', active: false }
      ];

      const newReport: IReport = {
        _id: id,
        title: payload.title || '',
        description: payload.description || '',
        category: payload.category || 'General',
        latitude: payload.latitude || '20.5937',
        longitude: payload.longitude || '78.9629',
        imageUrl: payload.imageUrl || '',
        imageBase64: payload.imageBase64 || '',
        videoUrl: payload.videoUrl || '',
        videoBase64: payload.videoBase64 || '',
        isGenuine: payload.isGenuine !== undefined ? payload.isGenuine : false,
        severity: payload.severity || 'Low',
        issueType: payload.issueType || '',
        recommendedAction: payload.recommendedAction || '',
        targetDepartment: payload.targetDepartment || 'Municipal Administration',
        status: payload.status || 'Open',
        upvotes: payload.upvotes || 0,
        peerVerifications: payload.peerVerifications || 0,
        verifierIds: payload.verifierIds || [],
        verifiedByCitizens: payload.verifiedByCitizens !== undefined ? payload.verifiedByCitizens : false,
        reporter: payload.reporter,
        statusTimeline: payload.statusTimeline || defaultTimeline,
        aiSummary: payload.aiSummary || payload.description || '',
        location: { lat, lng },
        state: payload.state || 'Unknown',
        createdAt: createdTime,
      };

      const docRef = doc(db, 'reports', id);
      await setDoc(docRef, newReport);
      return newReport;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      throw err;
    }
  },

  async findByIdAndUpdate(id: string, update: Partial<IReport>) {
    const path = `reports/${id}`;
    try {
      const docRef = doc(db, 'reports', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      const existing = { ...data, _id: data._id || docSnap.id } as IReport;
      const merged = { ...existing, ...update };

      if (update.latitude || update.longitude) {
        merged.location = {
          lat: parseFloat(merged.latitude),
          lng: parseFloat(merged.longitude)
        };
      }

      await setDoc(docRef, merged);
      return merged;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      throw err;
    }
  },

  async deleteMany() {
    const path = 'reports';
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(docSnap.ref);
      }
      return { deletedCount: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return { deletedCount: false };
    }
  },

  async deleteOne(id: string) {
    const path = `reports/${id}`;
    try {
      const docRef = doc(db, 'reports', id);
      await deleteDoc(docRef);
      return { deletedCount: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return { deletedCount: false };
    }
  }
};
