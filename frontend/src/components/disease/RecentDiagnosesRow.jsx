import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, ArrowRight } from 'lucide-react';
import { getStoredDiagnoses } from '../../services/diagnosticStorage';

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

export default function RecentDiagnosesRow({ onSelectRecent, onViewHistory, items: propItems }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (propItems && propItems.length > 0) {
      setItems(propItems.slice(0, 4));
    } else {
      const stored = getStoredDiagnoses();
      setItems(stored.slice(0, 4));
    }
  }, [propItems]);

  if (!items || items.length === 0) {
    return (
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-slate-700" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Recent Diagnoses
            </h3>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
          No diagnostic scans recorded yet. Upload a leaf image to run your first diagnosis!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-slate-700" />
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Recent Diagnoses
          </h3>
        </div>

        <button
          onClick={onViewHistory}
          className="text-xs sm:text-sm font-semibold text-[#193B2B] hover:text-[#2E7D32] inline-flex items-center space-x-1.5 transition-colors group cursor-pointer"
        >
          <span>View History</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Dynamic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectRecent(item)}
            className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-400/80 hover:shadow-md p-2.5 flex items-center justify-between cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = '/images/leaf_dropzone.jpg'; }}
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#2E7D32] transition-colors">
                  {item.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {formatDate(item.date)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getSeverityBadge(item.severity)}`}>
                {item.severity || 'Diagnosed'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
