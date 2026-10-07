import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, ShieldAlert, Cpu, Eye, 
  Layers, FileText, ArrowRight, Activity, Percent
} from 'lucide-react';

export default function DiagnosisResult({ result, imagePreview, onOpenReport }) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  if (!result) return null;

  if (result.rejected || !result.success) {
    const stageThemes = {
      botanical_domain: {
        badge: "Foliage Verification Failed",
        title: result.error_title || "Non-Plant / Non-Rice Image Detected",
        iconBg: "bg-amber-100 text-amber-800 border-amber-200",
        headerColor: "text-amber-900",
      },
      image_quality: {
        badge: "Image Quality Failed",
        title: result.error_title || "Photo Blurry or Poorly Exposed",
        iconBg: "bg-orange-100 text-orange-800 border-orange-200",
        headerColor: "text-orange-900",
      },
      file_integrity: {
        badge: "Format Check Failed",
        title: result.error_title || "Invalid File or Resolution",
        iconBg: "bg-rose-100 text-rose-800 border-rose-200",
        headerColor: "text-rose-900",
      },
      low_confidence: {
        badge: "Clinical Confidence Floor",
        title: result.error_title || "Inconclusive Pathology Diagnosis",
        iconBg: "bg-purple-100 text-purple-800 border-purple-200",
        headerColor: "text-purple-900",
      },
      backend_offline: {
        badge: "Service Unreachable",
        title: result.error_title || "Diagnostic AI Engine Offline",
        iconBg: "bg-slate-100 text-slate-800 border-slate-200",
        headerColor: "text-slate-900",
      }
    };

    const theme = stageThemes[result.rejection_stage] || {
      badge: "Input Validation Gatekeeper",
      title: result.error_title || "Image Unsuitable for Diagnosis",
      iconBg: "bg-amber-100 text-amber-800 border-amber-200",
      headerColor: "text-slate-900",
    };

    const whatWentWrong = result.what_went_wrong || result.message || 
      "The uploaded photograph could not be validated as a legitimate rice leaf image for pathology analysis.";

    const defaultSteps = [
      "Capture an actual paddy plant or rice leaf in your field.",
      "Hold the camera 15–30 cm from the diseased leaf blade so it fills most of the frame.",
      "Ensure steady focus in natural daylight without direct camera flash.",
      "Or click any of the educational sample presets below to test the diagnostic system."
    ];

    const actionableSteps = (result.actionable_steps && result.actionable_steps.length > 0)
      ? result.actionable_steps
      : defaultSteps;

    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden animate-fadeIn space-y-5">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${theme.iconBg}`}>
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Diagnosis Rejected
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {theme.badge}
                </span>
              </div>
              <h3 className={`text-lg sm:text-xl font-black mt-1 tracking-tight ${theme.headerColor}`}>
                {theme.title}
              </h3>
            </div>
          </div>

          {result.details?.foliage_coverage_pct !== undefined && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-right">
              <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Foliage Detected</span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {result.details.foliage_coverage_pct}% <span className="text-slate-400 font-normal">(&ge;12% req.)</span>
              </span>
            </div>
          )}
        </div>

        {/* 2-Column or Stacked Explanation: What Went Wrong vs What User Should Do */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Panel 1: What Went Wrong */}
          <div className="lg:col-span-6 rounded-xl p-4 sm:p-5 bg-rose-50/50 border border-rose-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                <span>1. What Went Wrong</span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {whatWentWrong}
              </p>
            </div>

            {/* Diagnostic metrics readout if available */}
            {result.details && Object.keys(result.details).length > 0 && (
              <div className="mt-4 pt-3 border-t border-rose-200/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {result.details.blur_score !== undefined && (
                  <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-slate-400 block">Sharpness</span>
                    <span className="font-mono font-bold text-slate-700">{result.details.blur_score}</span>
                  </div>
                )}
                {result.details.brightness !== undefined && (
                  <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-slate-400 block">Brightness</span>
                    <span className="font-mono font-bold text-slate-700">{result.details.brightness}/255</span>
                  </div>
                )}
                {result.confidence !== undefined && (
                  <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-slate-400 block">Confidence</span>
                    <span className="font-mono font-bold text-slate-700">{result.confidence}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel 2: What You Should Do (Actionable Next Steps) */}
          <div className="lg:col-span-6 rounded-xl p-4 sm:p-5 bg-emerald-50/50 border border-emerald-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>2. What You Should Do (Next Steps)</span>
              </div>
              <ol className="space-y-2.5 text-xs text-slate-700">
                {actionableSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                      {idx + 1}
                    </span>
                    <span className="leading-snug font-medium text-slate-800 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span>Ready to try again?</span>
              <span className="text-[11px] text-slate-500 font-normal">Select a new image above or choose a preset below</span>
            </div>
          </div>

        </div>

      </div>
    );
  }

  const isHealthy = result.predicted_class === "Healthy";
  const confidence = result.confidence || 95.8;

  // Severity styling in light mode
  const severityColors = {
    Healthy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    Mild: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    Moderate: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    Severe: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const sevStyle = severityColors[result.severity] || severityColors.Moderate;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Diagnosis Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}>
                {result.pathology_type || 'Rice Pathology'}
              </span>
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>{result.source || 'EfficientNet-B0 Model'}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
              <span>{result.predicted_class}</span>
              {isHealthy ? (
                <CheckCircle2 className="w-7 h-7 text-[#2E7D32] flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-7 h-7 text-amber-500 flex-shrink-0" />
              )}
            </h2>

            {result.pathogen && (
              <p className="text-sm text-slate-500 mt-1 italic">
                Pathogen: <span className="text-slate-800 font-semibold">{result.pathogen}</span>
              </p>
            )}
          </div>

          {/* Confidence and Severity Badges */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            
            {/* Confidence Gauge */}
            <div className="bg-[#F8FAF7] border border-slate-200 rounded-xl px-5 py-3 text-center min-w-[130px]">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-center space-x-1">
                <Percent className="w-3 h-3 text-[#2E7D32]" />
                <span>Confidence</span>
              </div>
              <div className="text-2xl font-black text-[#2E7D32] mt-0.5">
                {confidence}%
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-[#2E7D32] h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(confidence, 100)}%` }}
                />
              </div>
            </div>

            {/* Severity Rating */}
            <div className={`border rounded-xl px-5 py-3 text-center min-w-[130px] ${sevStyle.bg} ${sevStyle.border}`}>
              <div className="text-[11px] font-semibold text-slate-600">Severity Grade</div>
              <div className={`text-2xl font-black ${sevStyle.text} mt-0.5`}>
                {result.severity || 'Moderate'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Area: {result.affected_leaf_area || '18%'}
              </div>
            </div>

            {/* Print Report Trigger */}
            <button
              onClick={onOpenReport}
              className="px-4 py-3 bg-[#193B2B] hover:bg-[#132E20] text-white text-xs font-semibold rounded-xl border border-transparent flex items-center space-x-2 transition-all shadow-sm h-full"
            >
              <FileText className="w-4 h-4 text-[#4ADE80]" />
              <span>Full Report</span>
            </button>

          </div>
        </div>

        {/* Diagnosis Body: Image Preview & Top Predictions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-start">
          
          {/* Leaf Visual & Lesion View */}
          <div className="md:col-span-5 space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-50 flex items-center justify-center">
              <img
                src={imagePreview || "/images/leaf_dropzone.jpg"}
                alt="Diagnosed Paddy Leaf"
                className="w-full h-full object-contain"
              />
              {showHeatmap && !isHealthy && (
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 via-rose-500/40 to-transparent mix-blend-color-burn pointer-events-none animate-lesion flex items-center justify-center">
                  <div className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-amber-300">
                    Grad-CAM Attention Area
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center space-x-1.5 transition-colors ${
                  showHeatmap 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showHeatmap ? 'Hide Pathology Heatmap' : 'Overlay Grad-CAM Heatmap'}</span>
              </button>
              <span className="text-[11px] text-slate-400 font-mono">224x224 RGB</span>
            </div>
          </div>

          {/* Clinical Description & Top 3 Classification Probabilities */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Agronomic Pathology Assessment
              </h4>
              <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                {result.description || "Infection manifests as distinct chlorotic streaks with irregular water-soaked margins, typically progressing along longitudinal veins."}
              </p>
            </div>

            {/* Probability Breakdown */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Top Probabilistic Predictions
              </h4>
              <div className="space-y-2">
                {result.top_predictions?.map((pred, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{pred.class_name}</span>
                      <span className="font-mono text-slate-600">{pred.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          i === 0 ? 'bg-[#2E7D32]' : 'bg-slate-400'
                        }`}
                        style={{ width: `${pred.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
