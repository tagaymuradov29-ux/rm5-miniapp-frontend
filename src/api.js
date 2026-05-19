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
};

/**
 * Telegram WebApp dan HAQIQIY foydalanuvchini olish
 * Test rejimi olib tashlandi!
 */
export function getTelegramUser() {
  if (typeof window === 'undefined') return null;
  
  const tg = window.Telegram?.WebApp;
  
  if (!tg) {
    // Brauzer'da to'g'ridan-to'g'ri ochish - ruxsat berilmaydi
    console.error('❌ Telegram WebApp yo\'q');
    return null;
  }

  // Real Telegram'dan kelgan ma'lumot
  const user = tg.initDataUnsafe?.user;
  
  if (!user || !user.id) {
    console.error('❌ Telegram user ma\'lumotlari yo\'q');
    return null;
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
