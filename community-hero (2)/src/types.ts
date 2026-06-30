export interface Issue {
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

export type ViewTab = 'citizen-map' | 'command-center' | 'my-profile' | 'ai-advisor' | 'city-health';
