/**
 * API Client v2 - Backend bilan ulanish
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

// ============== STUDENT API ==============

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
};

export const statsAPI = {
  async getOverall() {
    return apiFetch('/api/stats');
  },
};

export const healthAPI = {
  async check() {
    return apiFetch('/');
  },
};

// ============== TELEGRAM WEBAPP ==============

export function getTelegramUser() {
  if (typeof window === 'undefined') return null;
  
  const tg = window.Telegram?.WebApp;
  
  if (!tg) {
    // Test rejimida Asadulloh sifatida
    console.warn('⚠️ Telegram WebApp topilmadi, test rejimi');
    return {
      id: 1797037742,
      first_name: 'Asadulloh',
      last_name: 'Ahmad',
      username: 'asadulloh0408',
    };
  }

  return tg.initDataUnsafe?.user || null;
}

export function initTelegramWebApp() {
  if (typeof window === 'undefined') return;
  
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }
}
