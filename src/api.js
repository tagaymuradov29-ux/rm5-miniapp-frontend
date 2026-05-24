/**
 * API Client - Production version
 */

const API_BASE_URL = 'https://rm5-miniapp-backend-production.up.railway.app';

async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Xato yuz berdi' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API xato:', error);
    throw error;
  }
}

export const studentAPI = {
  async getProfile(telegramId) {
    return apiFetch(`/api/student/${telegramId}/profile`);
  },
  async getScores(telegramId) {
    return apiFetch(`/api/student/${telegramId}/scores`);
  },
  async getLessons(telegramId) {
    return apiFetch(`/api/student/${telegramId}/lessons`);
  },
  async getRanking(telegramId) {
    return apiFetch(`/api/student/${telegramId}/ranking`);
  },
  async getLessonDetails(telegramId, lessonId) {
    return apiFetch(`/api/student/${telegramId}/lesson/${lessonId}`);
  },
  async getDashboard(telegramId) {
    return apiFetch(`/api/student/${telegramId}/dashboard`);
  },
  async getAuthMe(telegramId) {
    return apiFetch(`/api/auth/me?telegram_id=${telegramId}`);
  },
  async getAdminDashboard() {
    return apiFetch(`/api/admin/dashboard`);
  },
  async getAdminUsersStats() {
    return apiFetch(`/api/admin/users/stats`);
  },
  async getAdminStudents() {
    return apiFetch(`/api/admin/students`);
  },
  async getAdminStudentDetail(userId) {
    return apiFetch(`/api/admin/student/${userId}`);
  },
  async getAdminGroups() {
    return apiFetch(`/api/admin/groups`);
  },
  async getAdminTrend(taskType, groupId) {
    const gid = groupId ? `&group_id=${groupId}` : "";
    return apiFetch(`/api/admin/trend?task_type=${taskType || "all"}${gid}`);
  },
  async getAdminTrendDrilldown(lessonNumber, taskType, drilldownType, groupId) {
    const gid = groupId ? `&group_id=${groupId}` : "";
    return apiFetch(`/api/admin/trend/drilldown?lesson_number=${lessonNumber}&task_type=${taskType || "all"}&drilldown_type=${drilldownType}${gid}`);
  },
  async getAdminStudentTrend(userId, taskType) {
    return apiFetch(`/api/admin/student/${userId}/trend?task_type=${taskType || "all"}`);
  },
  async getAdminPendingSubmissions(taskType, groupId, sort) {
    const gid = groupId ? `&group_id=${groupId}` : "";
    const s = sort ? `&sort=${sort}` : "";
    return apiFetch(`/api/admin/submissions/pending?task_type=${taskType || "all"}${gid}${s}`);
  },
  async getAdminStatsOverview() {
    return apiFetch(`/api/admin/stats/overview`);
  },
  async getAdminLessons() {
    return apiFetch(`/api/admin/lessons`);
  },
  async reviewSubmission(submissionId, payload) {
    return apiFetch(`/api/admin/submission/${submissionId}/review`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });
  },
};

/**
 * Telegram WebApp dan HAQIQIY foydalanuvchini olish
 * Debug ma'lumot bilan
 */
export function getTelegramUser() {
  if (typeof window === 'undefined') return null;
  
  const tg = window.Telegram?.WebApp;
  
  if (!tg) {
    console.error('Telegram WebApp yoq');
    return { _error: true, _debug: 'window.Telegram.WebApp = undefined. Brauzerdan ochilgan boladi.' };
  }

  const user = tg.initDataUnsafe?.user;
  
  if (!user || !user.id) {
    const debugInfo = {
      hasInitData: !!tg.initData,
      initDataLength: tg.initData ? tg.initData.length : 0,
      initDataUnsafe: tg.initDataUnsafe || 'null',
      version: tg.version,
      platform: tg.platform
    };
    console.error('Telegram user yoq:', debugInfo);
    return { 
      _error: true, 
      _debug: JSON.stringify(debugInfo, null, 2)
    };
  }
  
  return user;
}

export function initTelegramWebApp() {
  if (typeof window === 'undefined') return;
  
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }
}
