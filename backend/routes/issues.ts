import express, { Request, Response } from 'express';
import { Report, IReport } from '../models/Report.js';
import { GoogleGenAI, Type } from '@google/genai';
import { applicationDefault, initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin for FCM
if (!getApps().length) {
  try {
    initializeApp({
      credential: applicationDefault()
    });
    console.log('Firebase Admin initialized for FCM');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
  }
}

// In-memory token store (In a real app, this should be in Firestore under a users collection)
export const userTokens: Record<string, string> = {};

const router = express.Router();

// Initialize Gemini SDK lazily to avoid crashing if GEMINI_API_KEY is not defined yet
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Gemini features will be mocked.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. GET /api/issues - Return all genuine issues sorted by createdAt descending
router.get('/', async (req: Request, res: Response) => {
  try {
    const issues = await Report.find({ isGenuine: true });
    res.json(issues);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch issues: ' + error.message });
  }
});

// 2. POST /api/issues - Create a report and analyze using Gemini
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, category, latitude, longitude, location, state, imageBase64, videoBase64 } = req.body;

    if (!title || !description || (!latitude && !location)) {
      res.status(400).json({ error: 'Missing required fields: title, description, or location coordinates are required.' });
      return;
    }

    // Determine latitude and longitude
    let latStr = latitude ? String(latitude) : '20.5937';
    let lngStr = longitude ? String(longitude) : '78.9629';
    if (location && typeof location === 'object') {
      latStr = String(location.lat || location.latitude || latStr);
      lngStr = String(location.lng || location.longitude || lngStr);
    }

    // Prepare default mockup/fallback values in case Gemini fails or is missing key
    let isGenuine = true;
    let issueType = category || 'General Hazard';
    let severity: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    let targetDepartment = 'Municipal General Division';
    let recommendedAction = 'Dispatch municipal inspect team to evaluate on-site.';
    let aiSummary = description;

    const ai = getAiClient();
    
    const mediaBase64 = imageBase64 || videoBase64;
    const isVideoMedia = videoBase64 || (imageBase64 && imageBase64.startsWith('data:video/'));

    if (ai && mediaBase64) {
      try {
        let rawBase64 = mediaBase64;
        let mimeType = isVideoMedia ? 'video/mp4' : 'image/jpeg';
        
        // Strip data:image/... or data:video/... prefix if present
        if (mediaBase64.includes(';base64,')) {
          const parts = mediaBase64.split(';base64,');
          mimeType = parts[0].replace('data:', '');
          rawBase64 = parts[1];
        }

        const prompt = `Analyze this citizen-reported ${isVideoMedia ? 'video' : 'image'} and description of a municipal issue in India.
Title: ${title}
Description: ${description}
Category: ${category}

Verify if this represents a genuine civic infrastructure damage, sanitation, public hazard, or municipal issue. If it is a completely unrelated media file (e.g. animal, random indoor object, screenshot, selfie, spam), set isGenuine to false.
Provide high-quality Indian municipal dispatch actions.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                mimeType,
                data: rawBase64,
              }
            },
            {
              text: prompt
            }
          ],
          config: {
            systemInstruction: 'You are Community Hero AI, an automated Indian municipal civic triage and dispatch inspector. You analyze civic complaint photos or videos for authenticity and classify them.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isGenuine: { type: Type.BOOLEAN, description: 'True if media shows an actual municipal issue like pothole, broken streetlight, trash pile, water pipe leak, open manhole.' },
                issueType: { type: Type.STRING, description: 'Short technical term for the issue (e.g. Clogged Storm Drain, Broken Transformer).' },
                severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
                targetDepartment: { type: Type.STRING, description: 'Best Indian municipal department (e.g. NDMC Roads Dept, BBMP Waste Management, MCGM Water Board).' },
                recommendedAction: { type: Type.STRING, description: 'Official action item for municipal crew.' },
                aiSummary: { type: Type.STRING, description: '1-2 sentence technical overview of the damage.' }
              },
              required: ['isGenuine', 'issueType', 'severity', 'targetDepartment', 'recommendedAction', 'aiSummary']
            }
          }
        });

        const resultText = response.text;
        if (resultText) {
          const aiData = JSON.parse(resultText);
          isGenuine = aiData.isGenuine;
          issueType = aiData.issueType || issueType;
          severity = aiData.severity || severity;
          targetDepartment = aiData.targetDepartment || targetDepartment;
          recommendedAction = aiData.recommendedAction || recommendedAction;
          aiSummary = aiData.aiSummary || aiSummary;
        }
      } catch (geminiErr: any) {
        console.error("Gemini analysis error:", geminiErr);
        // Fallback to reasonable classifications based on description keywords
        const descLower = description.toLowerCase();
        if (descLower.includes('pothole') || descLower.includes('road')) {
          issueType = 'Pothole';
          severity = 'High';
          targetDepartment = 'Public Works Department (PWD)';
          recommendedAction = 'Dispatch quick-asphalt patching crew.';
        } else if (descLower.includes('garbage') || descLower.includes('trash') || descLower.includes('dump')) {
          issueType = 'Illegal Dump / Garbage Pile';
          severity = 'Medium';
          targetDepartment = 'Solid Waste Management Dept';
          recommendedAction = 'Send sanitation dumper truck and crew.';
        } else if (descLower.includes('light') || descLower.includes('dark') || descLower.includes('bulb')) {
          issueType = 'Broken Streetlight';
          severity = 'Low';
          targetDepartment = 'Electricity Department';
          recommendedAction = 'Send electrical repair truck with replacement LED unit.';
        }
      }
    } else if (!mediaBase64) {
      // If no image, analyze based on text keywords
      const descLower = description.toLowerCase();
      if (descLower.includes('pothole') || descLower.includes('road')) {
        issueType = 'Road Pothole';
        severity = 'High';
        targetDepartment = 'Municipal Corporation Road Works';
        recommendedAction = 'Fill pothole using cold asphalt mix.';
      } else if (descLower.includes('garbage') || descLower.includes('waste') || descLower.includes('dump')) {
        issueType = 'Accumulated Street Garbage';
        severity = 'Medium';
        targetDepartment = 'Sanitation & Solid Waste Division';
        recommendedAction = 'Clear garbage heap and disinfect the spot.';
      }
    }

    // If AI explicitly declares it not genuine, reject with 400 Bad Request
    if (!isGenuine) {
      res.status(400).json({
        error: 'AI Triage Rejected',
        message: 'The submitted evidence photo could not be verified as a genuine public infrastructure issue or civic hazard. Please upload a clear photo or video of the municipal issue.'
      });
      return;
    }

    // Default image if none provided
    const imageUrl = imageBase64 ? 'verified_evidence_' + Date.now() + '.jpg' : 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800';
    const videoUrl = videoBase64 ? 'verified_evidence_' + Date.now() + '.mp4' : '';

    // Create report document
    const newReport = await Report.create({
      title,
      description,
      category: category || 'Civic Infrastructure',
      latitude: latStr,
      longitude: lngStr,
      state: state || 'Unknown',
      imageUrl,
      imageBase64: imageBase64 || '',
      videoUrl,
      videoBase64: videoBase64 || '',
      isGenuine: true,
      severity,
      issueType,
      recommendedAction,
      targetDepartment,
      status: 'Open',
      upvotes: 0,
      peerVerifications: 0,
      verifiedByCitizens: false,
      aiSummary,
      reporter: req.body.reporter,
      createdAt: new Date().toISOString()
    });

    res.status(201).json(newReport);
  } catch (error: any) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// 3. POST /api/issues/:id/upvote - Upvote an issue
router.post('/:id/upvote', async (req: Request, res: Response) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    const updated = await Report.findByIdAndUpdate(req.params.id, {
      upvotes: (report.upvotes || 0) + 1
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to upvote: ' + error.message });
  }
});

// 4. PATCH /api/issues/:id/status - Update issue status or dispatch
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['Open', 'Verifying', 'Resolved'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be Open, Verifying, or Resolved' });
      return;
    }
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    
    // Dynamic status timeline update
    let timeline = report.statusTimeline || [
      { status: 'Open', label: 'Citizen Reported', timestamp: report.createdAt || new Date().toISOString(), active: true },
      { status: 'Triage', label: 'AI Authenticated & Classified', timestamp: report.createdAt || new Date().toISOString(), active: true },
      { status: 'Verifying', label: 'Ward Supervisor Dispatched', timestamp: '', active: false },
      { status: 'Resolved', label: 'Infrastructure Repaired & Closed', timestamp: '', active: false }
    ];
    const nowStr = new Date().toISOString();
    timeline = timeline.map(t => {
      if (t.status === status) {
        return { ...t, active: true, timestamp: nowStr };
      }
      if (status === 'Resolved' && t.status === 'Verifying') {
        return { ...t, active: true, timestamp: t.timestamp || nowStr };
      }
      return t;
    });

    const updated = await Report.findByIdAndUpdate(req.params.id, { 
      status,
      statusTimeline: timeline
    });

    // Push notification if resolved
    if (status === 'Resolved' && report.status !== 'Resolved') {
      const email = 'rajujetti777@gmail.com'; // Hardcoded for this prototype based on App.tsx
      const token = userTokens[email];
      if (token && getApps().length > 0) {
        try {
          await getMessaging().send({
            token,
            notification: {
              title: 'Issue Resolved!',
              body: `Your reported issue "${report.title}" has been successfully resolved by the municipal team. Thank you for your civic contribution!`,
            },
            data: {
              issueId: report._id
            }
          });
          console.log(`FCM sent to ${email} for issue ${report._id}`);
        } catch (e) {
          console.error('Failed to send FCM:', e);
        }
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update status: ' + error.message });
  }
});

// 4b. POST /api/issues/:id/verify - Citizen peer-verification (Community Verification)
router.post('/:id/verify', async (req: Request, res: Response) => {
  console.log(`[VERIFY ROUTE] Hit with id: ${req.params.id}, body:`, req.body);
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    
    const { userId, lat, lng } = req.body;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ error: 'Location coordinates (lat, lng) are required for geometric verification' });
      return;
    }

    // Geometric Verification (approx 5km = 0.05 degrees)
    const issueLat = report.location?.lat || parseFloat(report.latitude) || 0;
    const issueLng = report.location?.lng || parseFloat(report.longitude) || 0;
    
    const dLat = Math.abs(lat - issueLat);
    const dLng = Math.abs(lng - issueLng);

    if (dLat > 0.05 || dLng > 0.05) {
      res.status(403).json({ error: 'You must be physically closer to the issue location to verify it.' });
      return;
    }

    // Check if user already verified
    const verifierIds = report.verifierIds || [];
    if (verifierIds.includes(userId)) {
      res.status(400).json({ error: 'You have already verified this issue.' });
      return;
    }

    const nextVerifications = (report.peerVerifications || 0) + 1;
    const verifiedByCitizens = nextVerifications >= 3;

    const updated = await Report.findByIdAndUpdate(req.params.id, {
      peerVerifications: nextVerifications,
      verifierIds: [...verifierIds, userId],
      verifiedByCitizens
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to verify issue: ' + error.message });
  }
});

// 5. DELETE /api/issues/:id - Ignore or delete an issue
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await Report.deleteOne(req.params.id);
    res.json({ success: true, message: 'Issue ignored and deleted successfully.', result });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete issue: ' + error.message });
  }
});

// 6. POST /api/issues/advisor-chat - Municipal AI Advisor multi-turn chat
router.post('/advisor-chat', async (req: Request, res: Response) => {
  try {
    const { prompt, chatHistory } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Missing required prompt field.' });
      return;
    }

    const client = getAiClient();
    if (!client) {
      const mockAnswers = [
        "The Municipality is actively prioritizing pothole repairs in Gajuwaka Ward 65. If you've reported this, AI Autopilot has dispatched a work order to the road works division.",
        "Regarding water supply scheduling: the reservoir pipeline in Seethammadhara division is undergoing sanitation maintenance. Normal pressure will resume by tomorrow morning.",
        "To increase your Citizen Civic Score, continue uploading geotagged reports of hazards and voting on local issues in your municipal ward.",
        "The Solid Waste Management department has deployed extra collection vans along the routes during the tourist season. Thank you for keeping our city clean!"
      ];
      const randomAnswer = mockAnswers[Math.floor(Math.random() * mockAnswers.length)];
      res.json({ response: `[SIMULATED ADVISOR] ${randomAnswer}` });
      return;
    }

    const contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: "You are the AI Civic Advisor and Municipal Planner for the city. Assist citizens and municipal staff with planning, ward complaints, regulations, and community impact. Be helpful, concise, positive, and construct suggestions.",
      }
    });

    res.json({ response: response.text });
  } catch (error: any) {
    res.status(500).json({ error: 'Advisor Chat failed: ' + error.message });
  }
});

export default router;
