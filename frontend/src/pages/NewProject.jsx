import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createProjectApi, uploadVendorApi, analyzeProjectApi } from '../api/client';
import { ArrowLeft, Plus, Trash2, Upload, Shield, CheckCircle2, Loader2, DollarSign, Sliders, FileSpreadsheet, FileText } from 'lucide-react';

export default function NewProject() {
  const navigate = useNavigate();

  // Form State
  const [projectName, setProjectName] = useState('');
  const [mustHavesText, setMustHavesText] = useState(
    'Automated Daily Backups & Disaster Recovery\nSOC 2 Type II Compliance\n99.9%+ Uptime Guarantee SLA\nMulti-region Redundancy'
  );
  const [budgetCeiling, setBudgetCeiling] = useState('50000');
  const [notes, setNotes] = useState('Evaluation of cloud infrastructure vendor RFP proposals.');

  // Weight Sliders (must sum to 100%)
  const [weights, setWeights] = useState({
    price: 40,
    sla: 25,
    features: 20,
    support: 15,
  });

  // Vendor Upload Rows (min 2)
  const [vendors, setVendors] = useState([
    { id: '1', name: 'Vendor Proposal 1', file: null },
    { id: '2', name: 'Vendor Proposal 2', file: null },
  ]);

  // Loading & Progress State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const analysisSteps = [
    'Parsing document text (PDF/DOCX)…',
    'Extracting commercial & technical data (Claude Sonnet 4.6)…',
    'Calculating deterministic compliance scores…',
    'Auditing contract risks & generating redlines…',
    'Benchmarking market pricing (Groq Llama 3.3 70B)…',
    'Drafting vendor negotiation emails…',
    'Generating executive procurement summary…',
    'Indexing proposal chunks for Q&A assistant…'
  ];

  // Weight Slider Handlers to visually sum to 100%
  const handleWeightChange = (key, value) => {
    const val = Math.max(0, Math.min(100, Number(value)));
    const oldVal = weights[key];
    const diff = val - oldVal;
    
    const otherKeys = Object.keys(weights).filter(k => k !== key);
    const otherSum = otherKeys.reduce((acc, k) => acc + weights[k], 0);

    let newWeights = { ...weights, [key]: val };

    if (otherSum > 0 && diff !== 0) {
      otherKeys.forEach(k => {
        const ratio = weights[k] / otherSum;
        const adjusted = Math.max(0, Math.round((weights[k] - diff * ratio) * 10) / 10);
        newWeights[k] = adjusted;
      });
    }

    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      newWeights[otherKeys[0]] = Math.round((newWeights[otherKeys[0]] + (100 - total)) * 10) / 10;
    }

    setWeights(newWeights);
  };

  const addVendorRow = () => {
    setVendors([
      ...vendors,
      { id: String(Date.now()), name: `Vendor Proposal ${vendors.length + 1}`, file: null },
    ]);
  };

  const removeVendorRow = (id) => {
    if (vendors.length <= 2) {
      alert('At least 2 vendor proposals are required for comparison.');
      return;
    }
    setVendors(vendors.filter((v) => v.id !== id));
  };

  const updateVendorField = (id, field, value) => {
    setVendors(
      vendors.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValidTotal = Math.round(totalWeight) === 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!projectName.trim()) {
      setErrorMessage('Please enter a project name.');
      return;
    }

    const validVendors = vendors.filter(v => v.name.trim() && v.file);
    if (validVendors.length < 2) {
      setErrorMessage('Please provide vendor names and attach at least 2 PDF/DOCX proposal files.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setCurrentStepIndex(0);

      const interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < analysisSteps.length - 1) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 1200);

      const mustHavesList = mustHavesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const newProj = await createProjectApi({
        name: projectName,
        requirements: {
          mustHaves: mustHavesList,
          weights: weights,
          budgetCeiling: parseFloat(budgetCeiling) || 100000,
          notes: notes,
        },
      });

      for (const v of validVendors) {
        await uploadVendorApi(newProj.id, v.name, v.file);
      }

      await analyzeProjectApi(newProj.id);

      clearInterval(interval);
      navigate(`/project/${newProj.id}/report`);
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during proposal analysis.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-level-1">
        <div className="max-w-[720px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display font-semibold text-lg text-slate-900">Create Sourcing Evaluation</h1>
          </div>
        </div>
      </header>

      {/* Main Form Container - Centered Single Column Max-720px */}
      <main className="max-w-[720px] mx-auto px-4 pt-8">
        {/* Loading Step Overlay Modal */}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-level-3 border border-slate-200 text-center">
              <div className="inline-flex p-4 bg-indigo-50 text-brand-indigo rounded-full mb-4 animate-bounce">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">ProcureIQ Intelligence Engine</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">Running hybrid multi-provider LLM analysis pipeline</p>

              <div className="space-y-2 text-left mb-6">
                {analysisSteps.map((stepText, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : isCurrent
                          ? 'bg-indigo-50 border-indigo-200 text-brand-indigo shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-brand-indigo animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Project Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-level-1 space-y-5">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-indigo" />
              1. Project Information & Requirement Brief
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Project Title *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Cloud Hosting Infrastructure RFP 2026"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Must-Have Requirements (One per line)
                </label>
                <textarea
                  rows={4}
                  value={mustHavesText}
                  onChange={(e) => setMustHavesText(e.target.value)}
                  placeholder="Enter must-have requirements..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">Vendors will be penalized in compliance scoring for missing any must-have feature.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Budget Ceiling ($ USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="number"
                      value={budgetCeiling}
                      onChange={(e) => setBudgetCeiling(e.target.value)}
                      placeholder="50000"
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 text-sm font-mono text-slate-900 focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Evaluation Context Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Context notes..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Priority Weight Sliders */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-level-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-indigo" />
                2. Priority Evaluation Weights
              </h2>
              <span className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border transition-all ${
                isValidTotal
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                Total: {Math.round(totalWeight)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Price Competitiveness</span>
                  <span className="font-mono font-semibold text-brand-indigo">{weights.price}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.price}
                  onChange={(e) => handleWeightChange('price', e.target.value)}
                  className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>SLA & Uptime Reliability</span>
                  <span className="font-mono font-semibold text-brand-indigo">{weights.sla}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.sla}
                  onChange={(e) => handleWeightChange('sla', e.target.value)}
                  className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Feature Coverage</span>
                  <span className="font-mono font-semibold text-brand-indigo">{weights.features}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.features}
                  onChange={(e) => handleWeightChange('features', e.target.value)}
                  className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Support Responsiveness</span>
                  <span className="font-mono font-semibold text-brand-indigo">{weights.support}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.support}
                  onChange={(e) => handleWeightChange('support', e.target.value)}
                  className="w-full accent-brand-indigo cursor-pointer bg-slate-200 h-2 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vendor Proposal File Uploads */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-level-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-brand-indigo" />
                  3. Upload Vendor Proposals (Min. 2 Vendors)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Attach PDF or DOCX proposal documents.</p>
              </div>

              <button
                type="button"
                onClick={addVendorRow}
                className="text-xs font-medium text-brand-indigo hover:text-brand-indigoHover bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Vendor
              </button>
            </div>

            <div className="space-y-4">
              {vendors.map((vendor, idx) => (
                <div
                  key={vendor.id}
                  className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <input
                        type="text"
                        value={vendor.name}
                        onChange={(e) => updateVendorField(vendor.id, 'name', e.target.value)}
                        placeholder="Vendor Name (e.g. CloudHosting Pro)"
                        className="flex-1 max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-indigo"
                        required
                      />
                    </div>
                    {vendors.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVendorRow(vendor.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Drag-and-drop file upload zone */}
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-brand-indigo bg-white hover:bg-indigo-50/30 rounded-lg cursor-pointer transition-all">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <FileText className="w-4 h-4 text-brand-indigo shrink-0" />
                      <span className="font-medium">
                        {vendor.file ? vendor.file.name : 'Click to browse or drop PDF/DOCX proposal file'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => updateVendorField(vendor.id, 'file', e.target.files[0])}
                      className="hidden"
                      required={!vendor.file}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-level-1"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="bg-brand-indigo hover:bg-brand-indigoHover text-white text-xs font-medium px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Analyze Proposals & Generate Report
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
