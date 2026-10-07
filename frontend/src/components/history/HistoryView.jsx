import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RotateCcw, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  getStoredDiagnoses, 
  clearDiagnosticHistory, 
  resetToDefaultSeed 
} from '../../services/diagnosticStorage';

function getSeverityBadge(severity) {
  const sev = (severity || '').toLowerCase();
  if (sev.includes('severe') || sev.includes('high')) {
    return 'bg-rose-100 text-rose-700 border-rose-200';
  }
  if (sev.includes('mod')) {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (sev.includes('mild')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function formatDate(isoStr) {
  if (!isoStr) return 'Recent';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoStr;
  }
}

export default function HistoryView({ onSelectDiagnosis, onNewDiagnosis }) {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const records = getStoredDiagnoses();
    setHistory(records);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to delete all stored diagnosis logs from browser storage?')) {
      const cleared = clearDiagnosticHistory();
      setHistory(cleared);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset diagnostic scan history to initial benchmark seed data?')) {
      const seeded = resetToDefaultSeed();
      setHistory(seeded);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ricevision_scans_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = history.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.pathogen && item.pathogen.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterClass === 'All' || item.predicted_class === filterClass;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-[#2E7D32]" />
            <span>Persistent Telemetry Log</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Diagnostic Surveillance History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Retained in client browser storage • Zero cost & complete privacy
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportJSON}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Logs</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
            <span>Reset Seed</span>
          </button>

          <button
            onClick={handleClear}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by disease name, pathogen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#2E7D32]"
          >
            <option value="All">All Categories ({history.length})</option>
            <option value="Healthy">Healthy Only</option>
            <option value="Bacterial Blight">Bacterial Blight</option>
            <option value="Brown Spot">Brown Spot</option>
            <option value="Tungro">Tungro</option>
            <option value="Leaf Blast">Leaf Blast</option>
          </select>
        </div>
      </div>

      {/* Scan Log Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No diagnostic records found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {history.length === 0 
                ? 'Your diagnosis history is currently empty. Analyze a rice leaf image to populate live logs.'
                : 'No scans match your current search and filter criteria.'}
            </p>
            {history.length === 0 && (
              <button
                onClick={onNewDiagnosis}
                className="mt-2 px-4 py-2 rounded-xl bg-[#193B2B] text-white text-xs font-bold hover:bg-[#132E20] transition-colors cursor-pointer"
              >
                Perform New Diagnosis
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Sample</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        onError={(e) => { e.target.src = '/images/leaf_dropzone.jpg'; }}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{item.pathogen || 'Crop Pathology'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {typeof item.confidence === 'number' ? `${item.confidence.toFixed(1)}%` : item.confidence}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(item.severity)}`}>
                        {item.severity || 'Diagnosed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectDiagnosis(item)}
                        className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer inline-flex items-center space-x-1 text-xs font-semibold"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
