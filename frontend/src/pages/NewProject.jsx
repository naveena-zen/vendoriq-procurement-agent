import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { createProjectApi, uploadVendorApi, analyzeProjectApi } from '../api/client';
import { ArrowLeft, Plus, Trash2, Upload, Shield, CheckCircle2, Loader2, DollarSign, Sliders, FileSpreadsheet, FileText } from 'lucide-react';

export default function NewProject() {
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [mustHavesText, setMustHavesText] = useState(
    'Automated Daily Backups & Disaster Recovery\nSOC 2 Type II Compliance\n99.9%+ Uptime Guarantee SLA\nMulti-region Redundancy'
  );
  const [budgetCeiling, setBudgetCeiling] = useState('50000');
  const [notes, setNotes] = useState('Evaluation of cloud infrastructure vendor RFP proposals.');
  const [weights, setWeights] = useState({ price: 40, sla: 25, features: 20, support: 15 });
  const [vendors, setVendors] = useState([
    { id: '1', name: 'Vendor Proposal 1', file: null },
    { id: '2', name: 'Vendor Proposal 2', file: null },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragOver, setDragOver] = useState(null);

  const analysisSteps = [
    'Parsing document text (PDF/DOCX)…',
    'Extracting commercial & technical data (Claude Sonnet 4.6)…',
    'Calculating deterministic compliance scores…',
    'Auditing contract risks & generating redlines…',
    'Benchmarking market pricing (Groq Llama 3.3 70B)…',
    'Drafting vendor negotiation emails…',
    'Generating executive procurement summary…',
    'Indexing proposal chunks for Q&A assistant…',
  ];

  const handleWeightChange = (key, value) => {
    const val = Math.max(0, Math.min(100, Number(value)));
    const diff = val - weights[key];
    const otherKeys = Object.keys(weights).filter(k => k !== key);
    const otherSum = otherKeys.reduce((acc, k) => acc + weights[k], 0);
    let nw = { ...weights, [key]: val };
    if (otherSum > 0 && diff !== 0) {
      otherKeys.forEach(k => {
        nw[k] = Math.max(0, Math.round((weights[k] - diff * (weights[k] / otherSum)) * 10) / 10);
      });
    }
    const total = Object.values(nw).reduce((a, b) => a + b, 0);
    if (total !== 100) nw[otherKeys[0]] = Math.round((nw[otherKeys[0]] + (100 - total)) * 10) / 10;
    setWeights(nw);
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValidTotal = Math.round(totalWeight) === 100;

  const addVendorRow = () => setVendors([...vendors, { id: String(Date.now()), name: `Vendor Proposal ${vendors.length + 1}`, file: null }]);
  const removeVendorRow = (id) => { if (vendors.length <= 2) return; setVendors(vendors.filter(v => v.id !== id)); };
  const updateVendorField = (id, field, value) => setVendors(vendors.map(v => v.id === id ? { ...v, [field]: value } : v));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!projectName.trim()) { setErrorMessage('Please enter a project name.'); return; }
    const validVendors = vendors.filter(v => v.name.trim() && v.file);
    if (validVendors.length < 2) { setErrorMessage('Please provide vendor names and attach at least 2 PDF/DOCX proposal files.'); return; }

    try {
      setIsAnalyzing(true);
      setCurrentStepIndex(0);
      const interval = setInterval(() => {
        setCurrentStepIndex(prev => { if (prev < analysisSteps.length - 1) return prev + 1; clearInterval(interval); return prev; });
      }, 1200);

      const mustHavesList = mustHavesText.split('\n').map(s => s.trim()).filter(Boolean);
      const newProj = await createProjectApi({
        name: projectName,
        requirements: { mustHaves: mustHavesList, weights, budgetCeiling: parseFloat(budgetCeiling) || 100000, notes },
      });
      for (const v of validVendors) await uploadVendorApi(newProj.id, v.name, v.file);
      await analyzeProjectApi(newProj.id);
      clearInterval(interval);
      navigate(`/project/${newProj.id}/report`);
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during proposal analysis.');
      setIsAnalyzing(false);
    }
  };

  const WEIGHT_LABELS = { price: 'Price Competitiveness', sla: 'SLA & Uptime', features: 'Feature Coverage', support: 'Support Quality' };

  return (
    <div className="max-w-[720px] mx-auto space-y-8">
      {/* Analysis overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-surface-bg/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated border border-surface-border rounded-2xl p-8 max-w-lg w-full shadow-card text-center">
            <div className="inline-flex p-4 rounded-full bg-gradient-brand shadow-glow-blue mb-4 animate-bounce">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <h3 className="font-display text-xl font-bold text-text-primary">ProcureIQ Intelligence Engine</h3>
            <p className="text-text-muted text-xs mt-1 mb-6">Running hybrid multi-provider LLM analysis pipeline</p>
            <div className="space-y-2 text-left">
              {analysisSteps.map((step, idx) => {
                const done = idx < currentStepIndex;
                const current = idx === currentStepIndex;
                return (
                  <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    done ? 'bg-success/10 border-success/20 text-success' :
                    current ? 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue shadow-glow-blue/10' :
                    'bg-surface-card border-surface-border text-text-faint'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
                     current ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> :
                     <div className="w-4 h-4 rounded-full border border-surface-border shrink-0" />}
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 text-text-faint hover:text-text-primary hover:bg-surface-card rounded-lg transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Create Sourcing Evaluation</h1>
          <p className="text-text-muted text-xs mt-0.5">Configure requirements and upload vendor proposal documents</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Project Details */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-5">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-accent-blue" />
            1. Project Information & Requirement Brief
          </h2>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Project Title *</label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. Cloud Hosting Infrastructure RFP 2026"
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all placeholder:text-text-faint"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Must-Have Requirements (one per line)
              </label>
              <textarea
                rows={4}
                value={mustHavesText}
                onChange={e => setMustHavesText(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-border rounded-lg p-3 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all placeholder:text-text-faint resize-none"
              />
              <p className="text-[11px] text-text-faint mt-1">Vendors missing requirements are penalized in compliance scoring.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Budget Ceiling ($ USD)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-3 text-text-faint" />
                  <input
                    type="number"
                    value={budgetCeiling}
                    onChange={e => setBudgetCeiling(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg py-2.5 pl-9 pr-4 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Evaluation Context</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all placeholder:text-text-faint"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Weight Sliders */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-violet" />
              2. Priority Evaluation Weights
            </h2>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border transition-all ${
              isValidTotal ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
            }`}>
              Total: {Math.round(totalWeight)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {Object.entries(weights).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs font-medium text-text-muted mb-2">
                  <span>{WEIGHT_LABELS[key]}</span>
                  <span className="font-mono font-bold text-gradient">{val}%</span>
                </div>
                {/* Custom gradient slider */}
                <div className="relative h-2 rounded-full bg-surface-divider cursor-pointer">
                  <div
                    className="absolute left-0 top-0 h-2 rounded-full bg-gradient-brand"
                    style={{ width: `${val}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={val}
                    onChange={e => handleWeightChange(key, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Vendor File Uploads */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
                <Upload className="w-4 h-4 text-accent-blue" />
                3. Upload Vendor Proposal Documents (Min. 2)
              </h2>
              <p className="text-text-faint text-xs mt-0.5">Accepts PDF and DOCX proposal files.</p>
            </div>
            <button
              type="button"
              onClick={addVendorRow}
              className="text-xs font-medium text-accent-blue hover:text-accent-violet bg-accent-blue/10 hover:bg-accent-violet/10 border border-accent-blue/20 px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Vendor
            </button>
          </div>

          <div className="space-y-3">
            {vendors.map((vendor, idx) => (
              <div key={vendor.id} className="p-4 bg-surface-elevated border border-surface-border rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-text-faint">#{idx + 1}</span>
                  <input
                    type="text"
                    value={vendor.name}
                    onChange={e => updateVendorField(vendor.id, 'name', e.target.value)}
                    placeholder="Vendor Name"
                    className="flex-1 max-w-xs bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-accent-blue transition-all placeholder:text-text-faint"
                  />
                  {vendors.length > 2 && (
                    <button type="button" onClick={() => removeVendorRow(vendor.id)} className="p-1.5 text-text-faint hover:text-danger rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* Drag-and-drop file zone */}
                <label
                  className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 ${
                    dragOver === vendor.id
                      ? 'border-accent-blue bg-accent-blue/5 shadow-glow-blue/20'
                      : 'border-surface-borderHover hover:border-accent-blue/40 hover:bg-accent-blue/5'
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOver(vendor.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) updateVendorField(vendor.id, 'file', f); }}
                >
                  <FileText className={`w-5 h-5 mb-1.5 ${vendor.file ? 'text-success' : 'text-text-faint'}`} />
                  <span className="text-xs text-text-muted font-medium">
                    {vendor.file ? vendor.file.name : 'Drop PDF/DOCX here or click to browse'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={e => updateVendorField(vendor.id, 'file', e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pb-8">
          <Link to="/" className="px-5 py-2.5 text-xs font-medium text-text-muted hover:text-text-primary bg-surface-card border border-surface-border rounded-lg hover:bg-surface-cardHover transition-all">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="bg-gradient-brand text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-glow-blue hover:shadow-glow-violet transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            Analyze Proposals & Generate Report
          </button>
        </div>
      </form>
    </div>
  );
}
