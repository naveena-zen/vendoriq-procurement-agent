/**
 * Deterministic Vendor Scoring Formula (Client-Side JS)
 * Matches backend score_vendor_proposal in backend/main.py
 */

export function calculateVendorScore(vendor, allVendors, weights, mustHaves = []) {
  const ext = vendor.extraction || {};

  // 1. Price Score (inverse normalization)
  const allCosts = allVendors
    .map(v => v.extraction?.pricing?.totalCost)
    .filter(c => c !== null && c !== undefined);

  const currCost = ext.pricing?.totalCost;
  let priceScore = 50.0;

  if (currCost !== null && currCost !== undefined && allCosts.length > 0) {
    const minCost = Math.min(...allCosts);
    const maxCost = Math.max(...allCosts);

    if (minCost === maxCost) {
      priceScore = 100.0;
    } else {
      priceScore = Math.max(0.0, Math.min(100.0, 100.0 - ((currCost - minCost) / (maxCost - minCost)) * 50.0));
    }
  }

  // 2. SLA Uptime Score
  const uptimeStr = String(ext.sla?.uptimeGuarantee || '');
  const uptimeMatch = uptimeStr.match(/(\d{2}(?:\.\d+)?)/);
  let slaScore = 0.0;

  if (uptimeMatch) {
    const slaVal = parseFloat(uptimeMatch[1]);
    if (slaVal >= 99.99) slaScore = 100.0;
    else if (slaVal >= 99.95) slaScore = 96.0;
    else if (slaVal >= 99.9) slaScore = 92.0;
    else if (slaVal >= 99.0) slaScore = 80.0;
    else slaScore = Math.max(0.0, slaVal);
  }

  // 3. Feature Score
  const vFeatures = (ext.features || []).map(f => f.toLowerCase());
  let featureScore = 100.0;

  if (mustHaves && mustHaves.length > 0) {
    let matched = 0;
    mustHaves.forEach(req => {
      const reqLower = req.toLowerCase();
      const words = reqLower.split(/\s+/).filter(w => w.length > 3);
      
      if (vFeatures.some(f => f.includes(reqLower) || (words.length > 0 && words.every(w => f.includes(w))))) {
        matched += 1;
      } else if (words.length > 0 && vFeatures.some(f => f.includes(words[0]))) {
        matched += 0.8;
      } else {
        matched += 0.5; // baseline partial credit if feature list present
      }
    });
    featureScore = Math.min(100.0, (matched / mustHaves.length) * 100.0);
  }

  // 4. Support Score
  const supportStr = String(ext.sla?.supportHours || '').toLowerCase();
  let supportScore = 0.0;

  if (supportStr.includes('24/7') || supportStr.includes('24x7') || supportStr.includes('round the clock')) {
    supportScore = 100.0;
  } else if (supportStr.includes('business') || supportStr.includes('8/5') || supportStr.includes('standard')) {
    supportScore = 60.0;
  } else if (supportStr.length > 0) {
    supportScore = 50.0;
  }

  // Weighted score calculation
  const wPrice = parseFloat(weights.price || 40);
  const wSla = parseFloat(weights.sla || 25);
  const wFeatures = parseFloat(weights.features || 20);
  const wSupport = parseFloat(weights.support || 15);
  const totalWeight = wPrice + wSla + wFeatures + wSupport || 100.0;

  const weighted = (
    (priceScore * wPrice) +
    (slaScore * wSla) +
    (featureScore * wFeatures) +
    (supportScore * wSupport)
  ) / totalWeight;

  return Math.round(weighted * 10) / 10;
}
