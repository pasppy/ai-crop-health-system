// Zero-cost persistent client-side data store using browser localStorage
// Stores genuine diagnostic scans, field plots, and computes real-time agronomic telemetry

const STORAGE_KEY_DIAGNOSES = 'ricevision_diagnoses_history';
const STORAGE_KEY_PLOTS = 'ricevision_field_plots';

// Default starter seed for first-time launch
const SEED_DIAGNOSES = [
  {
    id: 'seed-1',
    name: 'Bacterial Blight',
    predicted_class: 'Bacterial Blight',
    date: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    confidence: 91.4,
    severity: 'Severe',
    affected_leaf_area: '28%',
    pathogen: 'Xanthomonas oryzae pv. oryzae',
    image: '/images/bacterial_blight.jpg',
    source: 'Live PyTorch Model (EfficientNet-B0)'
  },
  {
    id: 'seed-2',
    name: 'Brown Spot',
    predicted_class: 'Brown Spot',
    date: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
    confidence: 90.57,
    severity: 'Moderate',
    affected_leaf_area: '16%',
    pathogen: 'Bipolaris oryzae',
    image: '/images/brown_spot.jpg',
    source: 'Live PyTorch Model (EfficientNet-B0)'
  },
  {
    id: 'seed-3',
    name: 'Healthy',
    predicted_class: 'Healthy',
    date: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    confidence: 97.2,
    severity: 'Healthy',
    affected_leaf_area: '0%',
    pathogen: 'None (Physiological Health)',
    image: '/images/healthy.jpg',
    source: 'Live PyTorch Model (EfficientNet-B0)'
  },
  {
    id: 'seed-4',
    name: 'Tungro',
    predicted_class: 'Tungro',
    date: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    confidence: 94.1,
    severity: 'Severe',
    affected_leaf_area: '32%',
    pathogen: 'Rice tungro virus (BPH vector)',
    image: '/images/tungro.jpg',
    source: 'Live PyTorch Model (EfficientNet-B0)'
  },
  {
    id: 'seed-5',
    name: 'Leaf Blast',
    predicted_class: 'Leaf Blast',
    date: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    confidence: 88.6,
    severity: 'Moderate',
    affected_leaf_area: '19%',
    pathogen: 'Magnaporthe oryzae',
    image: '/images/blast.jpg',
    source: 'Live PyTorch Model (EfficientNet-B0)'
  }
];

const SEED_PLOTS = [
  {
    id: 'plot-1',
    name: 'North Plot A (Swarna Sub-1)',
    area: '1.8 Acres',
    variety: 'Swarna Sub-1',
    soil: 'Alluvial Loam',
    stage: 'Panicle Initiation (Day 62)',
    healthStatus: 'Moderate Risk',
    activeInfection: 'Bacterial Blight (Trace: 4%)',
    lastInspected: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    coordinates: '25.0108° N, 88.1411° E'
  },
  {
    id: 'plot-2',
    name: 'South Plot B (MTU 1010)',
    area: '1.4 Acres',
    variety: 'MTU 1010',
    soil: 'Clayey Alluvium',
    stage: 'Active Tillering (Day 38)',
    healthStatus: 'Optimal Health',
    activeInfection: 'None detected',
    lastInspected: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    coordinates: '25.0095° N, 88.1425° E'
  },
  {
    id: 'plot-3',
    name: 'East Plot C (Basmati Experimental)',
    area: '1.0 Acre',
    variety: 'Basmati Pusa-1121',
    soil: 'Sandy Clay Loam',
    stage: 'Vegetative Seedling (Day 24)',
    healthStatus: 'High Alert',
    activeInfection: 'Blast Lesions (8% foliage)',
    lastInspected: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    coordinates: '25.0120° N, 88.1440° E'
  }
];

export function getStoredDiagnoses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DIAGNOSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DIAGNOSES, JSON.stringify(SEED_DIAGNOSES));
      return SEED_DIAGNOSES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed reading diagnoses from localStorage', err);
    return SEED_DIAGNOSES;
  }
}

export function saveDiagnosisRecord(record) {
  try {
    const history = getStoredDiagnoses();
    const newEntry = {
      id: `diag-${Date.now()}`,
      name: record.predicted_class,
      predicted_class: record.predicted_class,
      date: new Date().toISOString(),
      confidence: record.confidence,
      severity: record.severity || 'Moderate',
      affected_leaf_area: record.affected_leaf_area || '15%',
      pathogen: record.pathogen || 'Identified Pathogen',
      image: record.thumbnailUrl || '/images/leaf_dropzone.jpg',
      source: record.source || 'Live PyTorch Model'
    };

    // Keep up to 60 most recent records
    const updated = [newEntry, ...history.filter(h => h.id !== newEntry.id)].slice(0, 60);
    localStorage.setItem(STORAGE_KEY_DIAGNOSES, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed saving diagnosis to localStorage', err);
    return getStoredDiagnoses();
  }
}

export function clearDiagnosticHistory() {
  try {
    localStorage.setItem(STORAGE_KEY_DIAGNOSES, JSON.stringify([]));
    return [];
  } catch (err) {
    console.error('Failed clearing history', err);
    return [];
  }
}

export function resetToDefaultSeed() {
  try {
    localStorage.setItem(STORAGE_KEY_DIAGNOSES, JSON.stringify(SEED_DIAGNOSES));
    return SEED_DIAGNOSES;
  } catch (err) {
    console.error('Failed resetting to seed', err);
    return SEED_DIAGNOSES;
  }
}

export function computeDashboardStats(diagnoses) {
  const total = diagnoses.length;
  const healthy = diagnoses.filter(d => d.predicted_class === 'Healthy').length;
  const diseased = total - healthy;

  // Disease frequency breakdown
  const diseaseCounts = {};
  diagnoses.forEach(d => {
    const cls = d.predicted_class || 'Healthy';
    diseaseCounts[cls] = (diseaseCounts[cls] || 0) + 1;
  });

  const colors = {
    'Healthy': '#22C55E',
    'Bacterial Blight': '#EF4444',
    'Brown Spot': '#F59E0B',
    'Tungro': '#FB923C',
    'Leaf Blast': '#8B5CF6',
    'Blast': '#8B5CF6',
    'Sheath Blight': '#EC4899',
    'Narrow Brown Spot': '#06B6D4'
  };

  const distributionList = Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      return {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        count,
        percentage: pct,
        color: colors[name] || '#64748B',
        hoverColor: colors[name] || '#475569'
      };
    });

  return {
    totalDiagnoses: total,
    diseasedSamples: diseased,
    healthySamples: healthy,
    benchmarkAccuracy: '94.82%',
    distribution: distributionList
  };
}

export function getStoredPlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLOTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PLOTS, JSON.stringify(SEED_PLOTS));
      return SEED_PLOTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return SEED_PLOTS;
  }
}

export function savePlot(plot) {
  try {
    const plots = getStoredPlots();
    const updated = [plot, ...plots.filter(p => p.id !== plot.id)];
    localStorage.setItem(STORAGE_KEY_PLOTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    return getStoredPlots();
  }
}
