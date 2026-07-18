// Tiny API client. In dev, Vite proxies /api -> http://localhost:4000.

const TOKEN_KEY = "kala_admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  submitMembership: (body) => request("/membership", { method: "POST", body }),

  login: (username, password) =>
    request("/admin/login", { method: "POST", body: { username, password } }),

  stats: () => request("/admin/stats", { auth: true }),
  listMembers: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return request(`/admin/members${qs ? `?${qs}` : ""}`, { auth: true });
  },
  addMember: (body) => request("/admin/members", { method: "POST", body, auth: true }),
  updateMember: (id, body) =>
    request(`/admin/members/${id}`, { method: "PATCH", body, auth: true }),
  deleteMember: (id) => request(`/admin/members/${id}`, { method: "DELETE", auth: true }),

  getCertificateLayout: () => request("/certificate/layout"),
  updateCertificateLayout: (body) =>
    request("/admin/certificate/layout", { method: "PUT", body, auth: true }),
  lookupCertificate: (ref) =>
    request(`/certificate/lookup?ref=${encodeURIComponent(ref)}`),
};
