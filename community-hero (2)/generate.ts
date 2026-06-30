import * as fs from 'fs';

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
  "Kerala", "Madhya Pradesh", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", 
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "Delhi", "Maharashtra", "Karnataka", "West Bengal"
];

const latLongs: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9129, 79.74],
  "Arunachal Pradesh": [28.2180, 94.7278],
  "Assam": [26.2006, 92.9376],
  "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661],
  "Goa": [15.2993, 74.1240],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1665],
  "Jharkhand": [23.6102, 85.2799],
  "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Manipur": [24.6637, 93.9063],
  "Meghalaya": [25.4670, 91.3662],
  "Mizoram": [23.1645, 92.9376],
  "Nagaland": [26.1584, 94.5624],
  "Odisha": [20.9517, 85.0985],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Sikkim": [27.5330, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [18.1124, 79.0193],
  "Tripura": [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Uttarakhand": [30.0668, 79.0193],
  "Delhi": [28.6139, 77.2090],
  "Maharashtra": [19.0760, 72.8777],
  "Karnataka": [12.9716, 77.5946],
  "West Bengal": [22.5726, 88.3639]
};

const templates = [
  {
    title: 'Severe Cracking and Pothole on Main Road',
    description: 'A deep crater-like pothole has formed, causing severe traffic slowing and active swerving hazards.',
    category: 'Roads & Traffic',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800',
    severity: 'Critical',
    issueType: 'Craters & Deep Road Cavity',
    recommendedAction: 'Deploy Quick Asphalt Patching Crew with hot-mix truck. Apply structural grade filling.',
    targetDepartment: 'Roads Department',
    aiSummary: 'A critical asphalt cavity presenting immediate safety hazards to commuter vehicles.'
  },
  {
    title: 'Active Water Pipe Leakage & Street Flooding',
    description: 'A main utility water pipeline has ruptured, spraying fresh water and flooding the sidewalk and parking spots.',
    category: 'Water & Sewerage',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800',
    severity: 'High',
    issueType: 'Ruptured Water Main Pipeline',
    recommendedAction: 'Isolate water sector, dispatch repair technicians, and execute valve replacement.',
    targetDepartment: 'Hydraulics Department',
    aiSummary: 'A major utility line rupture causing flooding and loss of drinking water supply pressure.'
  },
  {
    title: 'Massive Waste Overflow on Public Bin',
    description: 'The community garbage collection bin has fully overflowed. Plastic waste and debris are spilled onto the road.',
    category: 'Solid Waste Management',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800',
    severity: 'Medium',
    issueType: 'Uncontrolled Solid Waste Accumulation',
    recommendedAction: 'Dispatch Sanitation Dumper Truck. Conduct full manual sweep and chemical spot disinfection.',
    targetDepartment: 'Sanitation Division',
    aiSummary: 'Uncollected refuse overflowing in high-traffic zone, creating sanitary hazards and blocking public sidewalks.'
  },
  {
    title: 'Sparking Overhead Electric Wires near Crossing',
    description: 'Overhead power cables are hanging dangerously low from an electric pole. Active sparking observed during light rainfall.',
    category: 'Electricity & Lighting',
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
    severity: 'Critical',
    issueType: 'Hanging Exposed Power Lines',
    recommendedAction: 'Cut electrical loop immediately, send Emergency Cable Crew, and re-tension the overhead pole cables.',
    targetDepartment: 'Engineering Board',
    aiSummary: 'Critical power cable spark and sagging hazards above pedestrian crossing. Requires immediate grid isolation and restructuring.'
  }
];

let issues: string[] = [];
states.forEach((state, idx) => {
  const tmpl = templates[idx % templates.length];
  const loc = latLongs[state];
  issues.push(`
      {
        _id: 'issue_${state.replace(/\s+/g, '_').toLowerCase()}_1',
        title: '${tmpl.title} in ${state}',
        description: '${tmpl.description}',
        category: '${tmpl.category}',
        latitude: '${loc[0]}',
        longitude: '${loc[1]}',
        state: '${state}',
        imageUrl: '${tmpl.imageUrl}',
        isGenuine: true,
        severity: '${tmpl.severity}' as const,
        issueType: '${tmpl.issueType}',
        recommendedAction: '${tmpl.recommendedAction}',
        targetDepartment: '${tmpl.targetDepartment}',
        status: '${idx % 3 === 0 ? "Open" : idx % 3 === 1 ? "Verifying" : "Resolved"}' as const,
        upvotes: ${Math.floor(Math.random() * 100)},
        aiSummary: '${tmpl.aiSummary}',
        createdAt: new Date(Date.now() - 3600000 * ${Math.floor(Math.random() * 72)}).toISOString(),
      }`);
});

const fileContent = `import { Report } from './models/Report.js';

export async function seedData() {
  console.log("Seeding municipal issues data...");
  try {
    await Report.deleteMany();

    const sampleIssues = [${issues.join(',')}
    ];

    for (const issue of sampleIssues) {
      await Report.create(issue);
    }

    console.log("Seeding completed successfully! 29 major Indian municipal reports injected.");
  } catch (error) {
    console.error("Error during seeding:", error);
  }
}

// Run directly if invoked via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedData().then(() => process.exit(0));
}
`;

fs.writeFileSync('backend/seed.ts', fileContent);
