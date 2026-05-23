import { useState, useEffect } from 'react';
import { studentAPI, getTelegramUser, initTelegramWebApp } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    initTelegramWebApp();
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      const tgUser = getTelegramUser();
      if (!tgUser || tgUser._error) throw new Error("Telegram foydalanuvchi topilmadi. Debug: " + (tgUser?._debug || "null"));
      setUser(tgUser);

      // 1. Avval auth - role tekshiramiz
      const auth = await studentAPI.getAuthMe(tgUser.id);
      setAuthData(auth);

      // 2. Faqat STUDENT uchun student datalarni yuklaymiz
      if (auth.role === "STUDENT") {
        const [profileData, scoresData, lessonsData, rankingData, dashboardData] = await Promise.all([
          studentAPI.getProfile(tgUser.id),
          studentAPI.getScores(tgUser.id),
          studentAPI.getLessons(tgUser.id),
          studentAPI.getRanking(tgUser.id),
          studentAPI.getDashboard(tgUser.id).catch(() => null),
        ]);

        setProfile(profileData);
        setScores(scoresData);
        setLessons(lessonsData.lessons || []);
        setRanking(rankingData);
        setDashboard(dashboardData);
      }
      // ADMIN/ASSISTANT/CURATOR uchun student data kerak emas
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-secondary">⏳ Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="card text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="font-semibold mb-1">Xato yuz berdi</div>
          <div className="text-sm text-text-secondary">{error}</div>
        </div>
      </div>
    );
  }

  // ============ ROLE ROUTING ============
  // ADMIN va ASSISTANT - Admin Panel koradi
  if (authData?.role === "ADMIN" || authData?.role === "ASSISTANT") {
    return <AdminPanel authData={authData} telegramId={user?.id} />;
  }

  // CURATOR - Tez orada sahifa
  if (authData?.role === "CURATOR") {
    return <CuratorComingSoon authData={authData} />;
  }

  // STUDENT - mavjud UI (quyida)

  // Agar dars tanlangan bolsa - LessonDetail koramiz (toliq ekran)
  if (selectedLessonId) {
    return (
      <LessonDetail 
        telegramId={user?.id} 
        lessonId={selectedLessonId} 
        onBack={() => setSelectedLessonId(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {activeTab === 'home' && <HomeTab profile={profile} scores={scores} ranking={ranking} dashboard={dashboard} onSelectLesson={setSelectedLessonId} />}
      {activeTab === 'lessons' && <LessonsTab lessons={lessons} onSelectLesson={setSelectedLessonId} />}
      {activeTab === 'ranking' && <RankingTab ranking={ranking} />}
      {activeTab === 'profile' && <ProfileTab profile={profile} user={user} />}
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// ============== ADMIN PANEL (with tab navigation) ==============
function AdminPanel({ authData, telegramId }) {
  const [adminTab, setAdminTab] = useState('home');  // home / management / stats / settings
  const [mngSubPage, setMngSubPage] = useState(null); // null / users / lessons / tasks / projects / bonus
  const [usersSubPage, setUsersSubPage] = useState(null); // null / approved / pending / groups / curators / assistants / blocked
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    studentAPI.getAdminDashboard()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="font-inter bg-background min-h-screen flex items-center justify-center">
        <div className="text-on-surface-variant">⏳ Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-inter bg-background min-h-screen p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-4 shadow text-center max-w-sm">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="font-semibold mb-1">Xato</div>
          <div className="text-sm text-on-surface-variant">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      {adminTab === 'home' && <AdminHome authData={authData} data={data} onNavigate={setAdminTab} />}
      {adminTab === 'management' && !mngSubPage && <AdminManagement onNavigate={setAdminTab} onSubPage={setMngSubPage} />}
      {adminTab === 'management' && mngSubPage === 'users' && !usersSubPage && <AdminUsersMenu onBack={() => setMngSubPage(null)} onSubPage={setUsersSubPage} />}
      {adminTab === 'management' && mngSubPage === 'users' && usersSubPage === 'approved' && !selectedStudentId && <AdminStudentsList onBack={() => setUsersSubPage(null)} onSelectStudent={setSelectedStudentId} />}
      {adminTab === 'management' && mngSubPage === 'users' && usersSubPage === 'approved' && selectedStudentId && <AdminStudentDetail userId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />}
      {adminTab === 'management' && mngSubPage === 'users' && usersSubPage === 'groups' && <AdminGroupsList onBack={() => setUsersSubPage(null)} />}
      {adminTab === 'stats' && <AdminStats />}
      {adminTab === 'settings' && <AdminSettings />}
      
      <AdminBottomNav activeTab={adminTab} setActiveTab={setAdminTab} />
    </div>
  );
}

// ============== ADMIN BOTTOM NAV ==============
function AdminBottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Bosh' },
    { id: 'management', icon: 'grid_view', label: 'Boshqaruv' },
    { id: 'stats', icon: 'bar_chart', label: 'Stat' },
    { id: 'settings', icon: 'settings', label: 'Sozl' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white/95 backdrop-blur-md px-2 pb-safe border-t border-outline-variant h-16">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} 
          className={"flex flex-col items-center active:scale-90 transition-transform " + (activeTab === t.id ? "text-primary font-semibold" : "text-on-surface-variant")}>
          <span className="material-symbols-outlined" style={activeTab === t.id ? {fontVariationSettings: "'FILL' 1"} : {}}>{t.icon}</span>
          <span className="text-[10px] font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ============== ADMIN HOME ==============
function AdminHome({ authData, data, onNavigate }) {
  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <h1 className="text-base font-bold text-primary">🏠 Bosh sahifa</h1>
        <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
      </header>

      <main className="pt-20 px-4 space-y-5">
        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" 
          style={{background: 'linear-gradient(135deg, #003b2c 0%, #005440 100%)'}}>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-container rounded-full opacity-20 blur-2xl"></div>
          <div className="relative z-10">
            <p className="text-xs opacity-80 mb-1">Real Marketing 5.0 boshqaruv</p>
            <h2 className="text-xl font-bold mb-4">👋 Salom, {authData?.full_name}!</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-[10px] opacity-80">O\'quvchilar</p>
                <p className="text-lg font-bold">{data?.stats?.total_students || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-[10px] opacity-80">Guruhlar</p>
                <p className="text-lg font-bold">{data?.stats?.total_groups || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                <p className="text-[10px] opacity-80">Darslar</p>
                <p className="text-lg font-bold">{data?.stats?.unlocked_lessons || 0}/{data?.stats?.total_lessons || 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bugungi Holat */}
        <section>
          <h3 className="text-base font-bold mb-2 text-on-surface px-1">Bugungi Holat</h3>
          <div className="space-y-2">
            <button onClick={() => onNavigate('management')} className="w-full flex items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="material-symbols-outlined text-yellow-700">task</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-yellow-900">{data?.pending?.submissions || 0} ta vazifa kutmoqda</p>
                <p className="text-xs text-outline">Tekshirilishi zarur</p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>

            <button onClick={() => onNavigate('management')} className="w-full flex items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="material-symbols-outlined text-blue-700">list_alt</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-blue-900">{data?.pending?.users || 0} ta yangi ro\'yxat</p>
                <p className="text-xs text-outline">Guruh shakllantirish</p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>

            <button onClick={() => onNavigate('settings')} className="w-full flex items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="material-symbols-outlined text-red-700">payments</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-900">{data?.pending?.fines || 0} ta jarima to\'lov</p>
                <p className="text-xs text-outline">Tasdiqlash kutilmoqda</p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Tezkor Harakatlar */}
        <section>
          <h3 className="text-base font-bold mb-2 text-on-surface px-1">Tezkor Harakatlar</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate('settings')} className="flex flex-col items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-container">send</span>
              </div>
              <span className="text-xs font-medium text-on-surface">📤 Massa xabar</span>
            </button>
            <button onClick={() => onNavigate('management')} className="flex flex-col items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-container">featured_seasonal_and_gifts</span>
              </div>
              <span className="text-xs font-medium text-on-surface">🎁 Bonus berish</span>
            </button>
            <button onClick={() => onNavigate('settings')} className="flex flex-col items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-container">description</span>
              </div>
              <span className="text-xs font-medium text-on-surface">📥 Excel eksport</span>
            </button>
            <button onClick={() => onNavigate('settings')} className="flex flex-col items-center p-4 bg-white border border-outline-variant rounded-2xl shadow-sm active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-container">settings</span>
              </div>
              <span className="text-xs font-medium text-on-surface">⚙️ Sozlamalar</span>
            </button>
          </div>
        </section>

        {/* Oxirgi Harakatlar */}
        <section>
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-base font-bold text-on-surface">Oxirgi Harakatlar</h3>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-2 space-y-1">
            {(!data?.recent_activity || data.recent_activity.length === 0) && (
              <div className="text-center py-4 text-sm text-on-surface-variant">Hozircha harakatlar yo\'q</div>
            )}
            {data?.recent_activity?.map((a, i) => {
              const time = a.time ? new Date(a.time).toLocaleTimeString('uz', {hour:'2-digit', minute:'2-digit'}) : '';
              const typeNames = {KONSPEKT:'Konspekt', WORKBOOK:'Workbook', AMALIY:'Amaliy', INSTAGRAM_REELS:'Reels', INSTAGRAM_STORIES:'Stories'};
              let text = '';
              if (a.type === 'submission_approved') {
                const sub = typeNames[a.sub_type] || a.sub_type;
                const lesson = a.lesson_num ? a.lesson_num + '-dars ' : '';
                text = a.user_name + ' — ' + lesson + sub + ' +' + a.score + ' ball';
              } else if (a.type === 'new_user') {
                text = 'Yangi: ' + a.user_name;
              }
              return (
                <div key={i} className="flex items-center p-3 bg-white rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="material-symbols-outlined text-on-secondary-container text-[18px]">
                      {a.type === 'new_user' ? 'person_add' : 'check_circle'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface truncate"><span className="font-bold text-primary">{time}</span> — {text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

// ============== ADMIN MANAGEMENT (Boshqaruv tab) ==============
function AdminManagement({ onNavigate, onSubPage }) {
  const items = [
    { id: 'users', icon: 'pending_actions', emoji: '👤', label: 'Foydalanuvchilar', desc: '46 ta o\'quvchi, 3 guruh, 4 kurator' },
    { id: 'lessons', icon: 'menu_book', emoji: '📚', label: 'Darslar', desc: '16 dars (4 ochiq, 12 yopiq)' },
    { id: 'tasks', icon: 'assignment', emoji: '📝', label: 'Vazifalar', desc: 'PENDING vazifalarni tekshirish' },
    { id: 'projects', icon: 'rocket_launch', emoji: '💼', label: 'Loyihalar', desc: 'O\'quvchilar loyihalari' },
    { id: 'bonus', icon: 'featured_seasonal_and_gifts', emoji: '🎁', label: 'Bonus ball berish', desc: 'Workshop, Stories, Qo\'shimcha' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <h1 className="text-base font-bold text-primary">📋 Boshqaruv</h1>
        <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
      </header>

      <main className="pt-20 px-4 space-y-4">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-primary-container p-5 text-white shadow">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-widest opacity-80">Dashboard</p>
            <h2 className="text-xl font-bold mt-1">Real Marketing 5.0</h2>
            <p className="text-sm mt-2 opacity-90">Kurs bo\'limlarini boshqaring</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]" style={{fontVariationSettings: "'FILL' 1"}}>groups</span>
          </div>
        </section>

        {/* Menu items */}
        <section className="bg-white border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden shadow-sm">
          {items.map(item => (
            <button key={item.id} onClick={() => item.id === 'users' ? onSubPage('users') : alert(item.label + ' sahifasi tez orada qoshiladi')} 
              className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low active:scale-[0.99] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-2xl">
                  {item.emoji}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                  <p className="text-xs text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          ))}
        </section>
      </main>
    </>
  );
}

// ============== ADMIN STATS ==============
function AdminStats() {
  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <h1 className="text-base font-bold text-primary">📊 Statistika</h1>
      </header>
      <main className="pt-20 px-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant text-center">
          <span className="material-symbols-outlined text-5xl text-primary mb-2">construction</span>
          <h3 className="text-lg font-bold text-on-surface mb-2">Statistika sahifasi</h3>
          <p className="text-sm text-on-surface-variant">Tez orada qo\'shiladi</p>
        </div>
      </main>
    </>
  );
}

// ============== ADMIN SETTINGS ==============
function AdminSettings() {
  const items = [
    { emoji: '⚙️', label: 'Sozlamalar', desc: 'Kurs, deadline\'lar, ballar, jarimalar' },
    { emoji: '📤', label: 'Massa xabar', desc: 'Hammaga yoki guruhga xabar yuborish' },
    { emoji: '📥', label: 'Excel eksport', desc: 'Ma\'lumotlarni Excel\'ga yuklash' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <h1 className="text-base font-bold text-primary">⚙️ Sozlamalar</h1>
      </header>
      <main className="pt-20 px-4 space-y-4">
        <section className="bg-white border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden shadow-sm">
          {items.map((item, i) => (
            <button key={i} onClick={() => alert(item.label + ' tez orada')} 
              className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low active:scale-[0.99] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-2xl">
                  {item.emoji}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                  <p className="text-xs text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          ))}
        </section>
      </main>
    </>
  );
}

// ============== ADMIN USERS MENU (Foydalanuvchilar) ==============
function AdminUsersMenu({ onBack, onSubPage }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getAdminUsersStats()
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const items = [
    { id: 'pending', icon: 'pending_actions', color: 'tertiary-fixed', textColor: 'tertiary', emoji: '⏳', label: 'Kutayotganlar', desc: 'Tasdiqlanishi kutilmoqda', count: stats?.pending },
    { id: 'approved', icon: 'school', color: 'secondary-container', textColor: 'on-secondary-container', emoji: '✅', label: "Tasdiqlangan o'quvchilar", desc: "Faol o'quvchilar ro'yxati", count: stats?.approved_students },
    { id: 'groups', icon: 'diversity_3', color: 'primary-fixed-dim', textColor: 'primary', emoji: '👥', label: 'Guruhlar', desc: "O'quv guruhlari boshqaruvi", count: stats?.groups },
    { id: 'curators', icon: 'person_search', color: 'surface-container-high', textColor: 'on-surface-variant', emoji: '🟢', label: 'Kuratorlar', desc: 'Mas\'ul xodimlar', count: stats?.curators },
    { id: 'assistants', icon: 'support_agent', color: 'surface-container-high', textColor: 'on-surface-variant', emoji: '🟠', label: 'Asistentlar', desc: 'Yordamchi kuratorlar', count: stats?.assistants },
    { id: 'blocked', icon: 'block', color: 'surface-container-high', textColor: 'error', emoji: '🚫', label: 'Bloklanganlar', desc: 'Cheklangan foydalanuvchilar', count: stats?.blocked },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">👤 Foydalanuvchilar</h1>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
      </header>

      <main className="pt-20 px-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input className="w-full bg-white border border-outline-variant rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary-container" placeholder="Ism yoki username..." />
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-primary-container p-5 text-white shadow">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-widest opacity-80">Boshqaruv</p>
            <h2 className="text-xl font-bold mt-1">Foydalanuvchilar</h2>
            <p className="text-sm mt-2 opacity-90">Tizim foydalanuvchilarini boshqarish</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]" style={{fontVariationSettings: "'FILL' 1"}}>groups</span>
          </div>
        </section>

        {/* Categories */}
        <section>
          <h3 className="text-xs font-bold tracking-widest text-outline uppercase px-1 mb-2">TURLAR</h3>
          <div className="bg-white border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden shadow-sm">
            {items.map(item => (
              <button key={item.id} onClick={() => (item.id === 'approved' || item.id === 'groups') ? onSubPage(item.id) : alert(item.label + ' tez orada qoshiladi')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low active:scale-[0.99] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-2xl">
                    {item.emoji}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                    {loading ? '...' : (item.count ?? 0)}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Move to Group */}
        <section>
          <button className="w-full flex items-center gap-3 p-4 bg-white border-2 border-dashed border-outline-variant rounded-2xl hover:bg-primary-fixed/30 transition-all active:scale-95">
            <div className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center">
              <span className="material-symbols-outlined">move_up</span>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-primary">Boshqa guruhga ko\'chirish</p>
              <p className="text-xs text-outline">Ommaviy ko\'chirish wizard</p>
            </div>
            <span className="material-symbols-outlined text-primary">auto_fix_high</span>
          </button>
        </section>
      </main>
    </>
  );
}

// ============== ADMIN STUDENTS LIST (46 ta o'quvchi) ==============
function AdminStudentsList({ onBack, onSelectStudent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name / score
  const [filterGroup, setFilterGroup] = useState('all');

  useEffect(() => {
    studentAPI.getAdminStudents()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="font-inter bg-background min-h-screen flex items-center justify-center">
        <div className="text-on-surface-variant">⏳ Yuklanmoqda...</div>
      </div>
    );
  }

  let students = data?.students || [];
  
  // Search
  if (search) {
    const s = search.toLowerCase();
    students = students.filter(st => 
      st.full_name?.toLowerCase().includes(s) || 
      st.username?.toLowerCase().includes(s)
    );
  }
  
  // Filter by group nomi (group_id ishlatmaymiz - DB ID lar tartibsiz)
  if (filterGroup !== 'all') {
    students = students.filter(st => st.group_name && st.group_name.startsWith(filterGroup + '-'));
  }
  
  // Sort
  if (sortBy === 'name') {
    students = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else if (sortBy === 'score') {
    students = [...students].sort((a, b) => b.total_score - a.total_score);
  }

  const groups = [
    { id: 'all', label: 'Hammasi' },
    { id: '1', label: '1-guruh (Azizjon)' },
    { id: '2', label: '2-guruh (Farhod)' },
    { id: '3', label: '3-guruh (Tursunali)' },
  ];

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">✅ O'quvchilar ({students.length})</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-outline-variant rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary-container" 
            placeholder="Qidirish..." />
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <button onClick={() => setSortBy('name')} 
            className={"px-3 py-1.5 rounded-full text-xs font-semibold " + (sortBy === 'name' ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant")}>
            Ism A-Z
          </button>
          <button onClick={() => setSortBy('score')} 
            className={"px-3 py-1.5 rounded-full text-xs font-semibold " + (sortBy === 'score' ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant")}>
            💎 Ball ↓
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map(g => (
            <button key={g.id} onClick={() => setFilterGroup(g.id)}
              className={"px-3 py-1.5 rounded-full text-xs whitespace-nowrap " + (filterGroup === g.id ? "bg-primary text-white font-semibold" : "bg-white border border-outline-variant text-on-surface-variant")}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Students */}
        <div className="space-y-2">
          {students.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl">person_off</span>
              <p className="mt-2 text-sm">Hech narsa topilmadi</p>
            </div>
          ) : (
            students.map(st => {
              const initials = st.full_name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '??';
              const medal = st.rank === 1 ? '🥇' : st.rank === 2 ? '🥈' : st.rank === 3 ? '🥉' : null;
              return (
                <button key={st.id} onClick={() => onSelectStudent(st.id)}
                  className="w-full bg-white rounded-2xl p-3 shadow-sm border border-outline-variant flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {medal || initials}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-on-surface text-sm truncate">{st.full_name}</p>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">
                      {st.username ? '@' + st.username : ''} {st.group_name ? '· ' + st.group_name : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-primary">💎 {st.total_score}</span>
                      <span className="text-xs text-outline">·</span>
                      <span className="text-xs text-outline">🏆 {st.rank}/{data?.students?.length || 0}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

// ============== ADMIN STUDENT DETAIL ==============
function AdminStudentDetail({ userId, onBack }) {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    studentAPI.getAdminStudentDetail(userId)
      .then(d => { setS(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [userId]);

  if (loading) {
    return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;
  }
  if (error || !s) {
    return <div className="font-inter bg-background min-h-screen p-4 flex items-center justify-center"><div className="text-center"><div className="text-4xl">!</div><p>{error || 'Topilmadi'}</p></div></div>;
  }

  const initials = s.full_name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '??';
  const maxScore = 1970;
  const progressPct = Math.min(100, Math.round((s.total_score / maxScore) * 100));
  const regDate = s.registered_at ? new Date(s.registered_at).toLocaleDateString('uz', {day:'numeric', month:'long', year:'numeric'}) : '-';
  
  const scoreCards = [
    { icon: 'description', label: 'Konspekt', value: s.scores.konspekt },
    { icon: 'menu_book', label: 'Workbook', value: s.scores.workbook },
    { icon: 'handyman', label: 'Amaliy', value: s.scores.amaliy },
    { icon: 'quiz', label: 'Test', value: s.scores.test },
    { icon: 'forum', label: 'Workshop', value: s.scores.workshop },
    { icon: 'photo_camera', label: 'Stories', value: s.scores.stories },
    { icon: 'play_circle', label: 'Reels', value: s.scores.reels },
  ];

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary truncate">{s.full_name}</h1>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
      </header>

      <main className="pt-20 px-4 space-y-4">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant flex flex-col items-center text-center">
          <div className="relative w-24 h-24 mb-3">
            <div className="w-full h-full rounded-full bg-primary-fixed border-4 border-primary flex items-center justify-center text-2xl font-bold text-primary">
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-white">
              <span className="material-symbols-outlined text-white text-base" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-on-surface">{s.full_name}</h2>
          {s.username && <p className="text-xs text-outline tracking-wider mb-3">@{s.username}</p>}
          <div className="w-full grid grid-cols-2 gap-3 text-left border-t border-outline-variant pt-3 mt-2">
            <div>
              <p className="text-[10px] text-outline">Telefon</p>
              <p className="text-xs text-on-surface">{s.phone || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-outline">Telegram ID</p>
              <p className="text-xs text-on-surface font-mono">{s.telegram_id}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-outline">Qoshilgan sana</p>
              <p className="text-xs text-on-surface">{regDate}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-on-surface truncate">{s.group_name || 'Guruh yoq'}</h3>
              <p className="text-xs text-outline truncate">{s.curator_name ? 'Kurator: ' + s.curator_name : ''}</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-surface-container-high text-primary rounded-lg text-xs font-medium flex-shrink-0">
            Ozgartirish
          </button>
        </section>

        <section className="bg-primary-container rounded-2xl p-4 text-white shadow">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] opacity-80">Umumiy ball</p>
              <p className="text-2xl font-bold">{s.total_score} <span className="text-xs opacity-60">/{maxScore}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-80">Reyting</p>
              <p className="text-lg font-bold">#{s.rank}</p>
            </div>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary-fixed rounded-full" style={{width: progressPct + '%'}}></div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold tracking-widest text-outline uppercase px-1 mb-2">BALLAR TAHLILI</h3>
          <div className="grid grid-cols-2 gap-2">
            {scoreCards.map((c, i) => (
              <div key={i} className="bg-white p-3 rounded-2xl border border-outline-variant">
                <span className="material-symbols-outlined text-primary text-xl mb-1">{c.icon}</span>
                <p className="text-[10px] text-outline">{c.label}</p>
                <p className="text-base font-bold text-on-surface">{c.value} <span className="text-xs font-normal">b.</span></p>
              </div>
            ))}
            <div className="bg-secondary-container p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-xl" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <span className="text-xs font-bold text-primary">Bonus</span>
              </div>
              <span className="text-base font-bold text-primary">+{s.scores.bonus}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant">
          <h3 className="text-sm font-bold mb-3 text-on-surface">Davomat</h3>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-primary">{s.attendance.present}</p>
              <p className="text-[10px] text-outline">Keldi</p>
            </div>
            <div className="w-px h-8 bg-outline-variant"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-tertiary-container">{s.attendance.late}</p>
              <p className="text-[10px] text-outline">Kechikdi</p>
            </div>
            <div className="w-px h-8 bg-outline-variant"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-error">{s.attendance.absent}</p>
              <p className="text-[10px] text-outline">Kelmadi</p>
            </div>
          </div>
        </section>

        <section className={"rounded-2xl p-4 border flex items-center justify-between " + (s.fines.unpaid_uzs > 0 ? "bg-error-container/20 border-error/20" : "bg-white border-outline-variant")}>
          <div className="flex items-center gap-3">
            <span className={"material-symbols-outlined " + (s.fines.unpaid_uzs > 0 ? "text-error" : "text-primary")}>gavel</span>
            <div>
              <h3 className="text-xs font-bold">Jarima statusi</h3>
              <p className="text-xs text-on-surface-variant">
                {s.fines.unpaid_uzs > 0 ? 'Tolanmagan: ' + s.fines.unpaid_uzs.toLocaleString() + ' som' : 'Faol jarimalar yoq'}
              </p>
            </div>
          </div>
          <span className={"px-2 py-0.5 rounded-full text-[10px] font-medium " + (s.fines.unpaid_uzs > 0 ? "bg-error text-white" : "bg-green-100 text-green-700")}>
            {s.fines.unpaid_uzs > 0 ? 'Bor' : 'Toza'}
          </span>
        </section>

        <section className="space-y-2">
          <button onClick={() => alert('Bonus berish tez orada')} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              <span className="text-sm">Bonus ball berish</span>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </button>
          <button onClick={() => alert('Xabar yuborish tez orada')} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">mail</span>
              <span className="text-sm">Shaxsiy xabar yuborish</span>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </button>
          <button onClick={() => alert('Guruh ozgartirish tez orada')} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">swap_horiz</span>
              <span className="text-sm">Guruhni ozgartirish</span>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </button>
          <button onClick={() => alert('Bloklash tez orada')} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant active:scale-[0.98]">
            <div className="flex items-center gap-3 text-tertiary-container">
              <span className="material-symbols-outlined">block</span>
              <span className="text-sm">Bloklash</span>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </button>
          <button onClick={() => alert('Ochirish tez orada')} className="w-full flex items-center justify-between p-4 bg-error-container/10 rounded-2xl border border-error/20 active:scale-[0.98]">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined">delete</span>
              <span className="text-sm">Ochirish</span>
            </div>
            <span className="material-symbols-outlined text-error/60">chevron_right</span>
          </button>
        </section>
      </main>
    </div>
  );
}

// ============== ADMIN GROUPS LIST ==============
function AdminGroupsList({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getAdminGroups()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;
  }

  const groups = data?.groups || [];

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">👥 Guruhlar ({groups.length})</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-4">
        <section>
          <h2 className="text-xl font-bold text-on-surface mb-1">Guruhlar reytingi</h2>
          <p className="text-xs text-on-surface-variant mb-4">O'rtacha ball bo'yicha tartiblangan</p>
        </section>

        <section className="space-y-3">
          {groups.map((g, idx) => {
            const isFirst = g.rank === 1;
            const medal = g.rank === 1 ? "🥇" : g.rank === 2 ? "🥈" : g.rank === 3 ? "🥉" : "#" + g.rank;
            
            if (isFirst) {
              // Top guruh - katta yashil kartochka
              return (
                <div key={g.id} className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
                  style={{background: "linear-gradient(135deg, #003b2c 0%, #005440 100%)"}}>
                  <div className="absolute -top-4 -right-4 opacity-10">
                    <span className="material-symbols-outlined text-[120px]">workspace_premium</span>
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">🥇</span>
                          <span className="text-lg font-bold">{g.name}</span>
                        </div>
                        <p className="text-xs opacity-80">Kurator: {g.curator_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{g.avg_score}</p>
                        <p className="text-[10px] opacity-80 uppercase">O'rtacha</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs opacity-90">
                      <span><span className="material-symbols-outlined text-[14px] align-middle">group</span> {g.students_count} ta o'quvchi</span>
                    </div>
                  </div>
                </div>
              );
            }
            
            // Boshqa guruhlar - kichik kartochka
            return (
              <div key={g.id} className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-lg flex-shrink-0">
                  {medal}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-sm font-bold text-on-surface truncate">{g.name}</h4>
                    <span className="text-base font-bold text-primary ml-2">{g.avg_score}</span>
                  </div>
                  <p className="text-xs text-outline truncate">Kurator: {g.curator_name}</p>
                  <p className="text-[10px] text-outline mt-0.5">{g.students_count} ta o'quvchi</p>
                </div>
              </div>
            );
          })}
        </section>

        <button onClick={() => alert("Yangi guruh qoshish tez orada")} 
          className="w-full bg-primary-container text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">add</span>
          Yangi guruh qo'shish
        </button>
      </main>
    </div>
  );
}

// ============== CURATOR COMING SOON ==============
function CuratorComingSoon({ authData }) {
  return (
    <div className="font-inter bg-background min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-outline-variant max-w-sm text-center">
        <span className="material-symbols-outlined text-6xl text-primary mb-3">construction</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Kurator paneli qurilmoqda</h2>
        <p className="text-sm text-on-surface-variant mb-4">
          Hurmatli {authData?.full_name}, Sizning paneliningiz tez orada tayyor bo'ladi.
        </p>
        <p className="text-xs text-on-surface-variant">
          Hozircha botdagi kurator menyu orqali ishlashda davom eting.
        </p>
      </div>
    </div>
  );
}

// ============== HOME TAB ==============
function HomeTab({ profile, scores, ranking, dashboard, onSelectLesson }) {
  const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??';
  const percentage = scores?.percentage || 0;

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      {/* Hero Card */}
      <section className="mx-4 mt-4 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #005440 0%, #0F6E56 100%)' }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        
        {/* Avatar + Greeting */}
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold border-2 border-white/20">
            {initials}
          </div>
          <div>
            <p className="text-sm text-white/80">Assalomu alaykum,</p>
            <h2 className="text-xl font-bold">{profile?.full_name}</h2>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <p className="text-xs text-white/70 mb-1">Joriy ball</p>
            <p className="text-lg font-bold">💎 {scores?.total || 0}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <p className="text-xs text-white/70 mb-1">Reyting</p>
            <p className="text-lg font-bold">🏆 {ranking?.group_position || '-'} / {ranking?.group_total || '-'}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-2">
            <p className="text-xs text-white/90">Natijangiz: {percentage}%</p>
            <span className="text-xs font-bold text-secondary-container">{scores?.total || 0} / {scores?.max_total || 1970}</span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-container rounded-full transition-all duration-1000"
              style={{ width: percentage + '%', boxShadow: '0 0 12px rgba(254,174,44,0.4)' }}></div>
          </div>
        </div>
      </section>

      {/* Quick Action Grid */}
      <section className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => window.Telegram?.WebApp?.close()} className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-start gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-lg">description</span>
          <span className="text-sm font-semibold text-on-surface text-left">📒 Konspekt yuborish</span>
        </button>
        <button onClick={() => window.Telegram?.WebApp?.close()} className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-start gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-lg">book</span>
          <span className="text-sm font-semibold text-on-surface text-left">📘 Workbook</span>
        </button>
        <button onClick={() => window.Telegram?.WebApp?.close()} className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-start gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-lg">handyman</span>
          <span className="text-sm font-semibold text-on-surface text-left">🛠 Amaliy</span>
        </button>
        <button onClick={() => window.Telegram?.WebApp?.close()} className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-start gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-lg">movie_filter</span>
          <span className="text-sm font-semibold text-on-surface text-left">🎬 Reels</span>
        </button>
      </section>

      {/* Haftalik faollik */}
      {dashboard?.weekly_activity && (
        <section className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-on-surface">Haftalik faollik</h3>
            <span className="text-xs font-bold text-primary">{dashboard.active_days_count}/7 kun</span>
          </div>
          <div className="flex justify-between px-1">
            {dashboard.weekly_activity.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={'p-0.5 rounded-full border-2 ' + (d.active ? 'border-primary-container' : 'border-outline-variant')}>
                  <div className={'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ' + (d.active ? 'bg-primary-container text-white' : 'bg-surface-container-high text-outline')}>
                    {d.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Davomat + Jarima */}
      {dashboard && (
        <section className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-xl">event_available</span>
              <span className="text-sm font-semibold text-on-surface">Davomat</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-on-surface-variant">Keldi: {dashboard.attendance.present}</span>
              </div>
              <span className="text-xs text-outline ml-3.5">Kechikdi: {dashboard.attendance.late}</span>
              <span className="text-xs text-outline ml-3.5">Kelmadi: {dashboard.attendance.absent}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center gap-2 mb-2">
              <span className={'material-symbols-outlined text-xl ' + (dashboard.fines.unpaid_uzs > 0 ? 'text-error' : 'text-primary')}>payments</span>
              <span className="text-sm font-semibold text-on-surface">Jarimalar</span>
            </div>
            <p className="text-xs font-medium text-outline">Jarima: {(dashboard.fines.unpaid_uzs || 0).toLocaleString()} so'm</p>
            <div className={'mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ' + (dashboard.fines.unpaid_uzs > 0 ? 'bg-error-container text-error' : 'bg-primary/10 text-primary')}>
              {dashboard.fines.unpaid_uzs > 0 ? "To'lash kerak" : 'Toza'}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Lesson */}
      {dashboard?.upcoming_lesson && (
        <section onClick={() => onSelectLesson && onSelectLesson(dashboard.upcoming_lesson.lesson_id)} 
          className="mx-4 mt-4 p-5 rounded-2xl text-white relative overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform"
          style={{background: 'linear-gradient(135deg, #004D76 0%, #00669B 100%)'}}>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start relative z-10 gap-3">
            <div className="flex-1">
              <h3 className="text-base font-bold mb-2">📚 {dashboard.upcoming_lesson.lesson_number}-dars: {dashboard.upcoming_lesson.title}</h3>
              {dashboard.upcoming_lesson.speaker && (
                <p className="text-xs text-white/80 mb-2">👨‍🏫 {dashboard.upcoming_lesson.speaker}</p>
              )}
              <div className="flex items-center gap-2 text-white/90">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <p className="text-xs">{new Date(dashboard.upcoming_lesson.lesson_date).toLocaleString('uz', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {dashboard?.recent_activity?.length > 0 && (
        <section className="mx-4 mt-4 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-on-surface">Oxirgi harakatlar</h3>
          </div>
          <div className="flex flex-col gap-2">
            {dashboard.recent_activity.slice(0, 5).map((a, i) => {
              const typeNames = {KONSPEKT:'Konspekt', WORKBOOK:'Workbook', AMALIY:'Amaliy', INSTAGRAM_REELS:'Reels', INSTAGRAM_STORIES:'Stories'};
              const typeIcons = {KONSPEKT:'description', WORKBOOK:'book', AMALIY:'handyman', INSTAGRAM_REELS:'movie_filter', INSTAGRAM_STORIES:'photo_library'};
              const name = typeNames[a.type] || a.type;
              const icon = typeIcons[a.type] || 'check_circle';
              const title = a.lesson_number ? a.lesson_number + '-dars ' + name : name;
              return (
                <div key={i} className="bg-white px-4 py-3 rounded-xl border border-outline-variant/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{title}</p>
                      <p className="text-xs text-outline">{a.status === 'APPROVED' ? 'Qabul qilindi' : a.status}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary-container">+ {a.score} ball</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

            {/* Course Ranking Card */}
      {ranking && (
        <section className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/30">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-3">🏆 Sizning o'rningiz</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-primary-container/10 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-1">Guruhda</p>
              <p className="text-2xl font-bold text-primary">{ranking.group_position}/{ranking.group_total}</p>
            </div>
            <div className="text-center p-3 bg-secondary-container/20 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-1">Kursda</p>
              <p className="text-2xl font-bold text-secondary">{ranking.course_position}/{ranking.course_total}</p>
            </div>
          </div>
        </section>
      )}

      {/* Group info */}
      <section className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex items-center justify-between">
        <div>
          <p className="text-xs text-on-surface-variant mb-1">Guruh</p>
          <p className="font-semibold text-on-surface">{profile?.group_name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant mb-1">Kurator</p>
          <p className="font-semibold text-on-surface">{profile?.curator_name}</p>
        </div>
      </section>

      {/* Scores breakdown */}
      <section className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/30">
        <h3 className="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">analytics</span>
          Ballar taqsimoti
        </h3>
        <div className="space-y-3">
          <ScoreBar icon="📒" label="Konspekt" earned={scores?.konspekt || 0} max={160} />
          <ScoreBar icon="📘" label="Workbook" earned={scores?.workbook || 0} max={320} />
          <ScoreBar icon="🛠" label="Amaliy" earned={scores?.amaliy || 0} max={400} />
          <ScoreBar icon="🧪" label="Test" earned={scores?.test || 0} max={320} />
          <ScoreBar icon="🏆" label="Workshop" earned={scores?.workshop || 0} max={250} />
          <ScoreBar icon="📸" label="Instagram" earned={scores?.instagram || 0} max={520} />
          {scores?.extra > 0 && (
            <ScoreBar icon="⭐" label="Qo'shimcha" earned={scores.extra} max={scores.extra} />
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreBar({ icon, label, earned, max }) {
  const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-on-surface">{icon} {label}</span>
        <span className="text-on-surface-variant font-medium">{earned} / {max}</span>
      </div>
      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: pct + '%' }}></div>
      </div>
    </div>
  );
}

// ============== LESSON DETAIL (yangi sahifa) ==============
function LessonDetail({ telegramId, lessonId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAccordion, setOpenAccordion] = useState(null);

  useEffect(() => {
    let mounted = true;
    studentAPI.getLessonDetails(telegramId, lessonId)
      .then(d => { if (mounted) { setData(d); setLoading(false); }})
      .catch(e => { if (mounted) { setError(e.message); setLoading(false); }});
    return () => { mounted = false; };
  }, [telegramId, lessonId]);

  if (loading) {
    return (
      <div className="font-inter min-h-screen flex items-center justify-center bg-background">
        <div className="text-on-surface-variant">⏳ Yuklanmoqda...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="font-inter min-h-screen p-4 bg-background">
        <button onClick={onBack} className="text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined">arrow_back</span> Orqaga
        </button>
        <div className="bg-error-container/20 p-4 rounded-xl text-error text-center">
          ⚠️ {error || "Ma'lumot yuklanmadi"}
        </div>
      </div>
    );
  }

  const toggle = (key) => setOpenAccordion(openAccordion === key ? null : key);

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-surface shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-primary active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-semibold">Orqaga</span>
        </button>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Lesson Header Card */}
        <section className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-outline-variant/30">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-primary text-xs font-bold uppercase tracking-wider">Dars {data.lesson_number}</span>
              <h2 className="text-xl font-bold text-on-surface mt-1 leading-tight">{data.title}</h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="bg-primary-container/15 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="text-xs">💎</span>
                <span className="text-xs font-bold text-primary">{data.max_total} Max</span>
              </div>
              <div className="bg-secondary-container/20 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="text-xs">💎</span>
                <span className="text-xs font-bold text-secondary">{data.total_earned} / {data.max_total}</span>
              </div>
            </div>
          </div>
          
          {data.speaker && (
            <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                {data.speaker.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{data.speaker}</p>
                <p className="text-xs text-on-surface-variant">Spiker</p>
              </div>
            </div>
          )}
          
          {data.lesson_date && (
            <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              <span>{new Date(data.lesson_date).toLocaleDateString('uz')}</span>
            </div>
          )}
        </section>

        {/* Tasks Accordion */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-on-surface-variant px-1">Vazifalar va topshiriqlar</h3>
          <div className="space-y-2">
            <TaskAccordion icon="📒" name="Konspekt" maxScore={10} 
              data={data.submissions.konspekt} 
              isOpen={openAccordion === 'konspekt'} 
              onToggle={() => toggle('konspekt')} />
            
            {data.has_workbook && (
              <TaskAccordion icon="📘" name="Workbook" maxScore={20} 
                data={data.submissions.workbook}
                isOpen={openAccordion === 'workbook'} 
                onToggle={() => toggle('workbook')} />
            )}
            
            {data.has_practical && (
              <TaskAccordion icon="🛠" name="Amaliy topshiriq" maxScore={50} 
                data={data.submissions.amaliy}
                isOpen={openAccordion === 'amaliy'} 
                onToggle={() => toggle('amaliy')} />
            )}
            
            <TaskAccordion icon="🧪" name="Test" maxScore={20} 
              data={data.submissions.test ? {status: 'APPROVED', score: data.submissions.test.score} : null}
              isOpen={openAccordion === 'test'} 
              onToggle={() => toggle('test')} />
          </div>
        </section>
      </main>
    </div>
  );
}

function TaskAccordion({ icon, name, maxScore, data, isOpen, onToggle }) {
  let badge = (
    <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded text-xs font-bold">
      Topshirilmagan
    </span>
  );
  
  if (data) {
    if (data.status === 'APPROVED') {
      badge = (
        <span className="bg-primary/15 text-primary px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">check_circle</span> Approved
        </span>
      );
    } else if (data.status === 'PENDING') {
      badge = (
        <span className="bg-secondary-container/30 text-secondary px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">hourglass_empty</span> Pending
        </span>
      );
    } else if (data.status === 'REJECTED') {
      badge = (
        <span className="bg-error-container text-error px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">cancel</span> Rejected
        </span>
      );
    }
  }
  
  return (
    <div className="bg-white rounded-xl border border-outline-variant/30 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left active:bg-surface-container-low transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-semibold text-on-surface">{name}</p>
            <p className="text-xs text-primary font-bold">
              {data && data.status === 'APPROVED' ? (data.score || 0) + ' / ' + maxScore + ' ball' : maxScore + ' ball'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <span className={'material-symbols-outlined text-on-surface-variant transition-transform ' + (isOpen ? 'rotate-180' : '')}>expand_more</span>
        </div>
      </button>
      
      {isOpen && (
        <div className="bg-surface-container-low/30 border-t border-outline-variant/30 p-4 space-y-3">
          {!data && (
            <p className="text-sm text-on-surface-variant text-center py-2">Hali topshirilmagan</p>
          )}
          
          {data && data.status === 'APPROVED' && (
            <>
              {data.reviewer_name && (
                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Kurator: <b className="text-on-surface">{data.reviewer_name}</b></span>
                  {data.reviewed_at && <span>{new Date(data.reviewed_at).toLocaleDateString('uz')}</span>}
                </div>
              )}
              {data.feedback && (
                <div className="bg-white p-3 rounded-lg text-sm italic text-on-surface-variant border border-outline-variant/30">
                  "{data.feedback}"
                </div>
              )}
              {data.is_late && (
                <div className="text-xs text-secondary font-semibold">⏰ Kechikkan</div>
              )}
            </>
          )}
          
          {data && data.status === 'PENDING' && (
            <>
              <p className="text-sm text-on-surface-variant">Vazifa kurator tomonidan tekshirilmoqda.</p>
              {data.submitted_at && (
                <p className="text-xs text-on-surface-variant">
                  Yuborilgan: {new Date(data.submitted_at).toLocaleDateString('uz')}
                </p>
              )}
            </>
          )}
          
          {data && data.status === 'REJECTED' && (
            <>
              {data.feedback && (
                <div className="bg-error-container/10 p-3 border-l-4 border-error rounded-r-lg">
                  <p className="text-xs font-bold text-error uppercase mb-1">Kurator izohi:</p>
                  <p className="text-sm text-on-surface-variant">"{data.feedback}"</p>
                </div>
              )}
              <p className="text-xs text-on-surface-variant text-center pt-2">
                Botda qaytadan yuborishingiz mumkin
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============== LESSONS TAB ==============
function LessonsTab({ lessons, onSelectLesson }) {
  const [filter, setFilter] = useState('all');
  
  const filtered = lessons.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'todo') return l.is_unlocked && !isLessonComplete(l);
    if (filter === 'done') return l.is_unlocked && isLessonComplete(l);
    if (filter === 'late') return l.is_unlocked && isLessonLate(l);
    return true;
  });

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      {/* Sticky tabs */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30">
        <div className="flex items-center px-4 overflow-x-auto gap-2 py-3" style={{scrollbarWidth: 'none'}}>
          <TabBtn active={filter==='all'} onClick={() => setFilter('all')}>Hammasi</TabBtn>
          <TabBtn active={filter==='todo'} onClick={() => setFilter('todo')}>Bajarish kerak</TabBtn>
          <TabBtn active={filter==='done'} onClick={() => setFilter('done')}>Bajarilgan</TabBtn>
          <TabBtn active={filter==='late'} onClick={() => setFilter('late')}>Kechikkan</TabBtn>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        <p className="text-xs text-on-surface-variant">Jami {filtered.length} ta dars</p>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline">inbox</span>
            <p className="mt-2 text-sm">Bu kategoriyada darslar yo'q</p>
          </div>
        ) : (
          filtered.map(lesson => <LessonCard key={lesson.lesson_id} lesson={lesson} onClick={() => onSelectLesson && onSelectLesson(lesson.lesson_id)} />)
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={
      'px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap active:scale-95 transition-all ' +
      (active ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant')
    }>{children}</button>
  );
}

function isLessonComplete(l) {
  const items = [l.konspekt, l.workbook, l.amaliy, l.test].filter(x => x !== null);
  if (items.length === 0) return false;
  return items.every(x => x && x.status === 'APPROVED');
}

function isLessonLate(l) {
  return [l.konspekt, l.workbook, l.amaliy, l.test].some(x => x && x.status === 'REJECTED');
}

function LessonCard({ lesson, onClick }) {
  if (!lesson.is_unlocked) {
    return (
      <article className="bg-surface-container-low rounded-2xl p-4 border border-dashed border-outline-variant/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="bg-white/95 px-4 py-2 rounded-full shadow-sm border border-outline-variant/30 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
            <span className="text-sm font-semibold text-primary">{lesson.lesson_number}-dars yaqinda</span>
          </div>
        </div>
        <div className="blur-[2px]">
          <div className="flex justify-between items-start mb-2">
            <span className="px-2 py-1 bg-surface-variant text-on-surface-variant text-xs rounded-lg">{lesson.lesson_number}-dars</span>
            <span className="text-xs text-on-surface-variant">{new Date(lesson.lesson_date).toLocaleDateString('uz')}</span>
          </div>
          <h2 className="text-base font-semibold text-on-surface mb-2">{lesson.title}</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-surface-container-highest rounded-lg"></div>
            <div className="h-10 bg-surface-container-highest rounded-lg"></div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article onClick={onClick} className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/30 active:scale-[0.98] transition-transform cursor-pointer">
      <div className="flex justify-between items-start mb-2">
        <span className="px-2 py-1 bg-primary-container/20 text-primary text-xs font-semibold rounded-lg">{lesson.lesson_number}-dars</span>
        <div className="flex items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          <span className="text-xs">{new Date(lesson.lesson_date).toLocaleDateString('uz')}</span>
        </div>
      </div>
      
      <h2 className="text-base font-bold text-on-surface mb-2 leading-tight">{lesson.title}</h2>
      
      {lesson.speaker && (
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[16px]">person</span>
          <span className="text-sm text-on-surface-variant">{lesson.speaker}</span>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        <StatusChip icon="📒" type="Konspekt" data={lesson.konspekt} />
        <StatusChip icon="📘" type="Workbook" data={lesson.workbook} />
        <StatusChip icon="🛠" type="Amaliy" data={lesson.amaliy} />
        <StatusChip icon="🧪" type="Test" data={lesson.test} />
      </div>
    </article>
  );
}

function StatusChip({ icon, type, data }) {
  let bg = 'bg-surface-container-low border-outline-variant/10';
  let textColor = 'text-on-surface-variant';
  let label = '— yo\'q';
  
  if (data) {
    if (data.status === 'APPROVED') {
      bg = 'bg-primary-container/15 border-primary/10';
      textColor = 'text-primary font-bold';
      label = '✅ ' + (data.score || 0);
    } else if (data.status === 'PENDING') {
      bg = 'bg-secondary-container/20 border-secondary/10';
      textColor = 'text-secondary font-bold';
      label = '⏳ Pending';
    } else if (data.status === 'REJECTED') {
      bg = 'bg-error-container/20 border-error/10';
      textColor = 'text-error font-bold';
      label = '🔄 Qayta';
    }
  }
  
  return (
    <div className={'flex items-center gap-1 p-2 rounded-lg border ' + bg}>
      <span className="text-xs flex items-center gap-1">
        {icon} {type}: <span className={textColor}>{label}</span>
      </span>
    </div>
  );
}

// ============== RANKING TAB ==============
function RankingTab({ ranking }) {
  if (!ranking) return null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🏆 Reyting</h1>

      {/* Your position */}
      <div className="card bg-gradient-to-br from-primary to-primary-dark text-white mb-4">
        <div className="text-sm opacity-90 mb-1">Sizning o'rningiz</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold">{ranking.group_position}</div>
            <div className="text-sm opacity-90">/ {ranking.group_total} guruhda</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{ranking.course_position}</div>
            <div className="text-sm opacity-90">/ {ranking.course_total} kursda</div>
          </div>
        </div>
      </div>

      {/* TOP 10 */}
      <h2 className="text-lg font-semibold mb-3">⭐ TOP 10</h2>
      <div className="space-y-2">
        {ranking.top10?.map(student => (
          <RankingRow key={student.position} student={student} />
        ))}
      </div>
    </div>
  );
}

function RankingRow({ student }) {
  let badge = student.position;
  if (student.position === 1) badge = '🥇';
  else if (student.position === 2) badge = '🥈';
  else if (student.position === 3) badge = '🥉';

  return (
    <div className={`card flex items-center gap-3 ${student.is_me ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-bg-subtle flex items-center justify-center font-bold text-lg flex-shrink-0">
        {badge}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          {student.full_name}
          {student.is_me && <span className="ml-2 text-xs text-primary">(Siz)</span>}
        </div>
        <div className="text-xs text-text-secondary truncate">{student.group_name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold">{student.total}</div>
        <div className="text-xs text-text-secondary">ball</div>
      </div>
    </div>
  );
}

// ============== PROFILE TAB ==============
function ProfileTab({ profile, user }) {
  const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">👤 Profil</h1>

      <div className="card text-center mb-4">
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center text-3xl font-bold mb-3">
          {initials}
        </div>
        <div className="text-xl font-semibold mb-1">{profile?.full_name}</div>
        {profile?.username && (
          <div className="text-sm text-text-secondary">@{profile.username}</div>
        )}
      </div>

      <div className="card space-y-3">
        <InfoRow label="📱 Telefon" value={profile?.phone || '—'} />
        <InfoRow label="👥 Guruh" value={profile?.group_name || '—'} />
        <InfoRow label="👨‍🏫 Kurator" value={profile?.curator_name || '—'} />
        <InfoRow label="🆔 Telegram ID" value={user?.id || '—'} />
      </div>

      <div className="mt-4 text-center text-xs text-text-muted">
        RM5.0 Mini App v1.0
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-bg-subtle last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ============== BOTTOM NAV ==============
function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Bosh' },
    { id: 'lessons', icon: '📚', label: 'Vazifalar' },
    { id: 'ranking', icon: '🏆', label: 'Reyting' },
    { id: 'profile', icon: '👤', label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-bg-subtle shadow-lg">
      <div className="flex justify-around items-center py-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 py-2 px-3 transition-all ${
              activeTab === tab.id 
                ? 'text-primary scale-110' 
                : 'text-text-secondary'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============== SHARED ==============
function ScoreRow({ icon, label, earned, max }) {
  const percentage = max > 0 ? (earned / max) * 100 : 0;
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold">{earned}</span>
          <span className="text-text-secondary"> / {max}</span>
        </div>
      </div>
      <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
