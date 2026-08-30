const API_BASE = import.meta.env.VITE_API_URL || '';

export async function loginApi(passcode) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProjectApi(data) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function uploadVendorApi(projectId, vendorName, file) {
  const formData = new FormData();
  formData.append('vendor_name', vendorName);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/projects/${projectId}/vendors`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
  return res.json();
}

export async function analyzeProjectApi(projectId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/analyze`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }
  return res.json();
}

export async function fetchProjectDetails(projectId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch project report');
  return res.json();
}

export async function sendChatQuestion(projectId, question) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error('Failed to send question');
  return res.json();
}

export async function approveProjectApi(projectId, approvedBy) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  });
  if (!res.ok) throw new Error('Failed to approve project');
  return res.json();
}

export async function saveVendorNoteApi(vendorId, notes) {
  const res = await fetch(`${API_BASE}/api/vendors/${vendorId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Failed to save vendor note');
  return res.json();
}

export function getExportUrl(projectId, format) {
  return `${API_BASE}/api/projects/${projectId}/export?format=${format}`;
}
