import { useState, useEffect, useRef } from 'react';
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
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showCourseTrend, setShowCourseTrend] = useState(false);
  const [drilldown, setDrilldown] = useState(null); // {type, lessonNumber, taskType, groupId}
  const [studentTrendId, setStudentTrendId] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
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
      {adminTab === 'management' && mngSubPage === 'users' && usersSubPage === 'groups' && !selectedGroupId && !showCourseTrend && <AdminGroupsList onBack={() => setUsersSubPage(null)} onSelectGroup={setSelectedGroupId} onShowCourseTrend={() => setShowCourseTrend(true)} />}

      {adminTab === 'management' && mngSubPage === 'users' && usersSubPage === 'groups' && showCourseTrend && !drilldown && <AdminCourseTrend onBack={() => setShowCourseTrend(false)} onDrilldown={(d) => setDrilldown(d)} />}
      {adminTab === 'management' && mngSubPage === 'users' && usersSubPage === 'groups' && selectedGroupId && !drilldown && <AdminGroupTrend groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} onDrilldown={(d) => setDrilldown(d)} />}
      {drilldown && !studentTrendId && <DrilldownPage drilldown={drilldown} onBack={() => setDrilldown(null)} onSelectStudent={(uid) => setStudentTrendId(uid)} />}
      {studentTrendId && <StudentTrendPage userId={studentTrendId} initialTaskType={drilldown?.taskType || "all"} onBack={() => setStudentTrendId(null)} />}
      {adminTab === 'management' && mngSubPage === 'pending' && !selectedSubmissionId && <AdminPendingList onBack={() => setMngSubPage(null)} onSelect={setSelectedSubmissionId} />}
      {adminTab === 'management' && mngSubPage === 'pending' && selectedSubmissionId && <AdminReviewPage submissionId={selectedSubmissionId} onBack={() => setSelectedSubmissionId(null)} onDone={() => setSelectedSubmissionId(null)} />}
      {adminTab === 'management' && mngSubPage === 'lessons' && <AdminLessonsList onBack={() => setMngSubPage(null)} />}
      {adminTab === 'stats' && <AdminStats />}
      {adminTab === 'stats' && <AdminStatistics />}
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
    { id: 'tasks', icon: 'assignment', emoji: '📝', label: 'Vazifalar', desc: 'Baholanmagan vazifalarni tekshirish' },
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
            <button key={item.id} onClick={() => item.id === 'users' ? onSubPage('users') : item.id === 'tasks' ? onSubPage('pending') : item.id === 'lessons' ? onSubPage('lessons') : alert(item.label + ' sahifasi tez orada qoshiladi')} 
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
  const handleAlert = (label) => alert(label + " - tez orada qoshiladi");

  const sections = [
    {
      title: "Kurs boshqaruv",
      items: [
        {icon: "school", color: "green", title: "Kurs ma'lumoti", desc: "Real Marketing 5.0 - 16 dars"},
        {icon: "auto_stories", color: "yellow", title: "Darslarni boshqarish", desc: "4 ta ochiq, 12 ta yopiq"},
        {icon: "stars", color: "purple", title: "Ball tizimi", desc: "Konspekt 10, Workbook 20, Amaliy 50"},
      ],
    },
    {
      title: "Foydalanuvchilar boshqaruv",
      items: [
        {icon: "group", color: "green", title: "Kuratorlar", desc: "3 ta faol kurator"},
        {icon: "support_agent", color: "yellow", title: "Asistentlar", desc: "1 ta asistent (max 3)"},
        {icon: "block", color: "red", title: "Bloklanganlar", desc: "Bloklangan foydalanuvchilar"},
      ],
    },
    {
      title: "Xabarlar va eslatmalar",
      items: [
        {icon: "send", color: "purple", title: "Massa xabar yuborish", desc: "46 ta o'quvchiga xabar"},
        {icon: "notifications_active", color: "green", title: "Group Notifier", desc: "12:00, 21:00, 22:00", badge: "FAOL"},
        {icon: "description", color: "purple", title: "Excel eksport", desc: "Barcha ma'lumotlarni yuklab olish"},
      ],
    },
    {
      title: "Tizim",
      items: [
        {icon: "database", color: "blue", title: "Database holati", desc: "46 o'quvchi · 16 dars"},
        {icon: "history", color: "gray", title: "Admin harakatlari log", desc: "Oxirgi 10 ta amal"},
        {icon: "contact_support", color: "green", title: "Yordam va aloqa", desc: "Texnik yordam"},
      ],
    },
    {
      title: "Akkaunt",
      items: [
        {icon: "system_update", color: "green", title: "Mini App ni yangilash", desc: "Cache tozalash"},
        {icon: "info", color: "gray", title: "Mini App versiyasi", desc: "RM 5.0 v1.2.4"},
      ],
    },
  ];

  const colorMap = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <h1 className="text-base font-bold text-primary">⚙️ Sozlamalar</h1>
      </header>

      <main className="pt-20 px-4 pb-24 space-y-6">
        <section className="relative overflow-hidden rounded-2xl p-5 shadow-lg" style={{background: "linear-gradient(135deg, #003b2c 0%, #005440 100%)"}}>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center border-2 border-white/20 flex-shrink-0">
              <span className="text-primary font-bold text-2xl">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-base truncate">Shahzod Tog'aymurodov</h2>
              <p className="text-white/80 text-xs flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Methodologist / Admin
              </p>
            </div>
            <button onClick={() => handleAlert("Profil tahrirlash")} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-white text-xs border border-white/20 flex-shrink-0">
              Tahrirlash
            </button>
          </div>
        </section>

        {sections.map((sec, idx) => (
          <section key={idx} className="space-y-2">
            <h3 className="text-on-surface-variant font-semibold text-[11px] px-1 uppercase tracking-wider">{sec.title}</h3>
            <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
              {sec.items.map((item, i) => (
                <div key={i}>
                  <button onClick={() => handleAlert(item.title)} className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-low active:scale-[0.98] transition-all">
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + colorMap[item.color]}>
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="text-on-surface font-medium text-sm truncate">{item.title}</h4>
                      <p className="text-on-surface-variant text-[11px] truncate">{item.desc}</p>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full flex-shrink-0">{item.badge}</span>
                    )}
                    <span className="material-symbols-outlined text-outline">chevron_right</span>
                  </button>
                  {i < sec.items.length - 1 && <div className="mx-4 border-t border-outline-variant"></div>}
                </div>
              ))}
            </div>
          </section>
        ))}
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
function AdminGroupsList({ onBack, onSelectGroup, onShowCourseTrend }) {
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
                <button key={g.id} onClick={() => onSelectGroup(g.id)} className="w-full text-left rounded-2xl p-5 text-white shadow-lg relative overflow-hidden active:scale-[0.98]"
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
                </button>
              );
            }
            
            // Boshqa guruhlar - kichik kartochka
            return (
              <button key={g.id} onClick={() => onSelectGroup(g.id)} className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-outline-variant flex items-center gap-3 active:scale-[0.98]">
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
              </button>
            );
          })}
        </section>

        <button onClick={onShowCourseTrend} className="w-full bg-white border border-outline-variant text-on-surface h-14 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 mb-3 shadow-sm">
          <span className="material-symbols-outlined text-primary">analytics</span>
          Umumiy kurs trendi
        </button>

        <button onClick={() => alert("Yangi guruh qoshish tez orada")} 
          className="w-full bg-primary-container text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">add</span>
          Yangi guruh qo'shish
        </button>
      </main>
    </div>
  );
}


// === TREND CHART ===
function TrendChart({ lessons }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(0, 59, 44, 0.3)");
    gradient.addColorStop(1, "rgba(0, 59, 44, 0)");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: lessons.map(l => "D" + l.lesson_number),
        datasets: [{
          label: "Avg",
          data: lessons.map(l => l.is_unlocked && l.count > 0 ? l.avg_score : null),
          borderColor: "#003b2c",
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#003b2c",
          pointHoverRadius: 7,
          spanGaps: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#6f7974" } },
          y: { min: 0, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 }, color: "#6f7974" } }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [lessons]);
  return <canvas ref={canvasRef} />;
}

// === TASK FILTER ===
function TaskFilter({ value, onChange }) {
  const tasks = [
    { id: "all", label: "Hammasi" },
    { id: "konspekt", label: "Konspekt" },
    { id: "workbook", label: "Workbook" },
    { id: "amaliy", label: "Amaliy" },
    { id: "test", label: "Test" },
    { id: "workshop", label: "Workshop" },
    { id: "stories", label: "Stories" },
    { id: "reels", label: "Reels" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth: "none"}}>
      {tasks.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={"flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap " + (value === t.id ? "bg-primary text-white" : "bg-white border border-outline-variant text-on-surface-variant")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// === INSIGHTS BENTO ===
function InsightsBento({ insights, onDrilldown, taskType, groupId }) {
  return (
    <section className="grid grid-cols-2 gap-2">
      <button onClick={() => insights?.best_lesson && onDrilldown && onDrilldown({type: "best", lessonNumber: insights.best_lesson.lesson_number, taskType, groupId})} className="bg-primary/5 border border-primary/10 p-4 rounded-2xl text-left active:scale-95 transition-transform">
        <p className="text-[10px] font-bold text-primary tracking-widest">ENG YAXSHI</p>
        <h4 className="text-lg font-bold text-primary mt-1">{insights?.best_lesson ? insights.best_lesson.lesson_number + "-dars" : "-"}</h4>
        <p className="text-xs font-semibold text-primary mt-2">{insights?.best_lesson?.avg_score?.toFixed(1) || "0"} avg</p>
      </button>
      <button onClick={() => insights?.worst_lesson && onDrilldown && onDrilldown({type: "worst", lessonNumber: insights.worst_lesson.lesson_number, taskType, groupId})} className="bg-error/5 border border-error/10 p-4 rounded-2xl text-left active:scale-95 transition-transform">
        <p className="text-[10px] font-bold text-error tracking-widest">ENG ZAIF</p>
        <h4 className="text-lg font-bold text-error mt-1">{insights?.worst_lesson ? insights.worst_lesson.lesson_number + "-dars" : "-"}</h4>
        <p className="text-xs font-semibold text-error mt-2">{insights?.worst_lesson?.avg_score?.toFixed(1) || "0"} avg</p>
      </button>
      <button onClick={() => insights?.biggest_rise && onDrilldown && onDrilldown({type: "rise", lessonNumber: insights.biggest_rise.to, taskType, groupId})} className="bg-white border border-outline-variant p-4 rounded-2xl text-left active:scale-95 transition-transform">
        <p className="text-[10px] font-bold text-on-surface-variant tracking-widest">KOTARILISH</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h4 className="text-base font-bold">{insights?.biggest_rise ? insights.biggest_rise.from + " -> " + insights.biggest_rise.to : "-"}</h4>
          {insights?.biggest_rise && <span className="text-primary font-bold text-sm">+{insights.biggest_rise.percent}%</span>}
        </div>
      </button>
      <button onClick={() => insights?.biggest_drop && onDrilldown && onDrilldown({type: "drop", lessonNumber: insights.biggest_drop.to, taskType, groupId})} className="bg-white border border-outline-variant p-4 rounded-2xl text-left active:scale-95 transition-transform">
        <p className="text-[10px] font-bold text-on-surface-variant tracking-widest">TUSHISH</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h4 className="text-base font-bold">{insights?.biggest_drop ? insights.biggest_drop.from + " -> " + insights.biggest_drop.to : "-"}</h4>
          {insights?.biggest_drop && <span className="text-error font-bold text-sm">{insights.biggest_drop.percent}%</span>}
        </div>
      </button>
    </section>
  );
}

// === COURSE TREND ===
function AdminCourseTrend({ onBack, onDrilldown }) {
  const [taskType, setTaskType] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    studentAPI.getAdminTrend(taskType)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [taskType]);
  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">Umumiy kurs trendi</h1>
        </div>
      </header>
      <main className="pt-20 px-4 space-y-4">
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-outline">Jami oquvchilar</p>
              <h2 className="text-2xl font-bold text-primary">{data?.total_students || 0}</h2>
            </div>
            <div className="bg-secondary-container p-2 rounded-lg">
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
          </div>
        </section>
        <TaskFilter value={taskType} onChange={setTaskType} />
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant">
          <h3 className="text-sm font-bold text-primary mb-3">Ozlashtirish dinamikasi (16 dars)</h3>
          {loading ? <div className="h-[200px] flex items-center justify-center text-on-surface-variant">Yuklanmoqda...</div> :
            <div className="h-[200px]"><TrendChart lessons={data?.lessons || []} /></div>}
        </section>
        {!loading && data?.insights && <InsightsBento insights={data.insights} onDrilldown={onDrilldown} taskType={taskType} groupId={null} />}

        {/* Stats Bento - Course only */}
        {!loading && data && (
          <section className="grid grid-cols-2 gap-2">
            <div className="bg-primary-container p-4 rounded-2xl text-white">
              <span className="material-symbols-outlined opacity-70 text-base">star</span>
              <p className="text-[10px] opacity-80 mt-1">Eng faol guruh</p>
              <p className="text-sm font-bold leading-tight mt-1">{data.most_active_group || "-"}</p>
            </div>
            <div className="bg-secondary-container p-4 rounded-2xl">
              <span className="material-symbols-outlined text-primary text-base">trending_up</span>
              <p className="text-[10px] text-outline mt-1">Tugallanish</p>
              <p className="text-sm font-bold text-primary leading-tight mt-1">{data.completion_pct || 0}%</p>
            </div>
          </section>
        )}

        {/* TOP students */}
        {!loading && data?.top_students && data.top_students.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-primary mb-2 px-1">TOP oquvchilar (shu vazifa)</h3>
            <div className="space-y-2">
              {data.top_students.slice(0, 5).map((st, i) => {
                const medal = i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : (i+1);
                return (
                  <div key={st.id} className="bg-white p-3 rounded-xl flex items-center justify-between border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{medal}</div>
                      <div>
                        <p className="text-sm font-semibold">{st.full_name}</p>
                        <p className="text-[10px] text-outline">{st.group_name || "-"}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary">{st.score} b.</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// === GROUP TREND ===
function AdminGroupTrend({ groupId, onBack, onDrilldown }) {
  const [taskType, setTaskType] = useState("all");
  const [data, setData] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    studentAPI.getAdminGroups().then(g => {
      const found = (g.groups || []).find(x => x.id === groupId);
      setGroupInfo(found);
    });
  }, [groupId]);
  useEffect(() => {
    setLoading(true);
    studentAPI.getAdminTrend(taskType, groupId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [taskType, groupId]);
  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary truncate">{groupInfo?.name || "Guruh"}</h1>
        </div>
      </header>
      <main className="pt-20 px-4 space-y-4">
        <section className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{background: "linear-gradient(135deg, #003b2c 0%, #005440 100%)"}}>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[100px]">school</span>
          </div>
          <div className="relative z-10">
            {groupInfo?.rank === 1 && <span className="inline-block bg-white/20 px-2 py-0.5 rounded-full text-xs mb-2">#1 Rank</span>}
            <h2 className="text-xl font-bold">{groupInfo?.name}</h2>
            <p className="text-xs opacity-80">Kurator: {groupInfo?.curator_name}</p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-[10px] opacity-70">Oquvchilar</p>
                <p className="text-base font-bold">{groupInfo?.students_count || 0}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-[10px] opacity-70">Avg ball</p>
                <p className="text-base font-bold">{groupInfo?.avg_score || 0}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-[10px] opacity-70">Reyting</p>
                <p className="text-base font-bold">#{groupInfo?.rank || "-"}</p>
              </div>
            </div>
          </div>
        </section>
        <TaskFilter value={taskType} onChange={setTaskType} />
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">trending_up</span>
            Trend ({taskType === "all" ? "Hammasi" : taskType})
          </h3>
          {loading ? <div className="h-[200px] flex items-center justify-center text-on-surface-variant">Yuklanmoqda...</div> :
            <div className="h-[200px]"><TrendChart lessons={data?.lessons || []} /></div>}
        </section>
        {!loading && data?.insights && <InsightsBento insights={data.insights} onDrilldown={onDrilldown} taskType={taskType} groupId={groupId} />}

        {/* Problem students */}
        {!loading && data?.problem_count > 0 && (
          <section className="bg-error-container/20 border border-error/20 p-4 rounded-2xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-error">report</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-error">Etibor talab qiladi</h3>
                <p className="text-xs text-on-surface-variant mt-1">{data.problem_count} nafar oquvchi songi ochiq darslarda topshirmagan</p>
              </div>
            </div>
            <button onClick={() => alert("Tez orada")} className="mt-3 w-full bg-error text-white py-2.5 rounded-xl text-xs font-semibold active:scale-95">
              Royxatni korish
            </button>
          </section>
        )}

        {/* TOP students */}
        {!loading && data?.top_students && data.top_students.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-primary mb-2 px-1">Bu vazifa boyicha reyting</h3>
            <div className="space-y-2">
              {data.top_students.slice(0, 5).map((st, i) => (
                <div key={st.id} className="bg-white p-3 rounded-xl flex items-center justify-between border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{i+1}</div>
                    <div>
                      <p className="text-sm font-semibold">{st.full_name}</p>
                      <p className="text-[10px] text-outline">{st.group_name || "-"}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-primary">{st.score} b.</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}


// === DRILLDOWN PAGE (4 turi: best/worst/rise/drop) ===
function DrilldownPage({ drilldown, onBack, onSelectStudent }) {
  const { type, lessonNumber, taskType, groupId } = drilldown;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    setLoading(true);
    studentAPI.getAdminTrendDrilldown(lessonNumber, taskType, type, groupId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonNumber, taskType, type, groupId]);

  if (loading) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;
  if (!data) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Malumot yoq</div></div>;

  const isWorst = type === "worst";
  const isBest = type === "best";
  const isRise = type === "rise";
  const isDrop = type === "drop";

  const titlePrefix = isWorst ? "Eng zaif" : isBest ? "Eng yaxshi" : isRise ? "Kotarilish" : "Tushish";
  const emoji = isWorst ? "WARN" : isBest ? "TOP" : isRise ? "RISE" : "DROP";
  const heroBg = isWorst || isDrop ? "bg-error-container/20 border border-error/20" : "bg-primary/5 border border-primary/10";
  const heroIcon = isWorst ? "warning" : isBest ? "rocket_launch" : isRise ? "trending_up" : "trending_down";
  const heroIconBg = isWorst || isDrop ? "bg-error/10 text-error" : "bg-primary-container text-on-primary-container";

  // Tabni filterlash
  const filteredStudents = (data.students || []).filter(s => {
    if (activeTab === "all") return true;
    return s.category === activeTab;
  });

  // Stats labels
  const taskLabel = taskType === "all" ? "Hammasi" : taskType.charAt(0).toUpperCase() + taskType.slice(1);

  return (
    <div className="font-inter bg-background min-h-screen pb-40">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-sm font-bold text-primary truncate">{titlePrefix}: {data.lesson.number}-dars ({taskLabel})</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-4">
        {/* HERO - BEST/WORST */}
        {(isBest || isWorst) && (
        <section className={heroBg + " rounded-2xl p-4"}>
          <div className="flex items-start gap-3">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center " + heroIconBg}>
              <span className="material-symbols-outlined">{heroIcon}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-on-surface">{data.lesson.number}-dars — {taskLabel}</h2>
              <p className="text-xs text-outline truncate">{data.lesson.title}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <div><span className="text-outline">Avg:</span> <span className="font-bold">{data.stats.avg_score}/{data.lesson.max_score}</span></div>
                <div><span className="text-outline">Topshirildi:</span> <span className="font-bold">{data.stats.submitted}/{data.stats.total}</span></div>
                {data.stats.missing > 0 && <div><span className="text-outline">Yoq:</span> <span className="font-bold text-error">{data.stats.missing}</span></div>}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1"><span className="text-on-surface-variant">Umumiy natija:</span><span className="font-bold">{data.stats.completion_pct}%</span></div>
            <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
              <div className={(isWorst ? "bg-error" : "bg-primary") + " h-full rounded-full"} style={{width: data.stats.completion_pct + "%"}}></div>
            </div>
          </div>
        </section>
        )}

        {/* HERO - RISE/DROP */}
        {(isRise || isDrop) && data.previous_lesson_number && (() => {
          const prevAvg = data.students.filter(s => s.previous_score != null).reduce((a, s) => a + s.previous_score, 0) / Math.max(data.students.filter(s => s.previous_score != null).length, 1);
          const currAvg = data.students.filter(s => s.score != null).reduce((a, s) => a + s.score, 0) / Math.max(data.students.filter(s => s.score != null).length, 1);
          const changePct = prevAvg > 0 ? Math.round(((currAvg - prevAvg) / prevAvg) * 100) : 0;
          const changedCount = data.students.length;
          return (
            <>
              <section className={heroBg + " rounded-2xl p-4"}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={"material-symbols-outlined " + (isRise ? "text-primary" : "text-error") + " text-2xl"}>{heroIcon}</span>
                    <span className={(isRise ? "text-primary" : "text-error") + " text-xl font-bold"}>
                      {changePct > 0 ? "+" : ""}{changePct}% {isRise ? "o'sish" : "tushish"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-white/40 p-2 rounded-lg">
                  <div className="text-center">
                    <p className="text-[10px] text-outline">{data.previous_lesson_number}-dars (Oldingi)</p>
                    <p className="text-2xl font-bold text-on-surface">{prevAvg.toFixed(1)}</p>
                  </div>
                  <div className="text-center border-l border-outline-variant">
                    <p className={"text-[10px] " + (isRise ? "text-primary" : "text-error")}>{data.lesson.number}-dars (Hozir)</p>
                    <p className={"text-2xl font-bold " + (isRise ? "text-primary" : "text-error")}>{currAvg.toFixed(1)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">group</span>
                  <span>{changedCount} ta o'quvchi {isRise ? "yaxshi natija ko'rsatdi" : "natija pasaydi"}</span>
                </div>
              </section>

              {/* MINI BAR CHART */}
              <section className="bg-white rounded-2xl p-4 border border-outline-variant">
                <h3 className="text-sm font-bold text-primary mb-3">Progressiv taqqoslash</h3>
                <div className="flex items-end justify-around h-32 gap-4 pt-2">
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                    <div className="w-full bg-outline-variant/40 rounded-t-lg transition-all duration-700" style={{height: Math.max((prevAvg / data.lesson.max_score) * 100, 5) + "%"}}></div>
                    <span className="text-[10px] text-outline">{data.previous_lesson_number}-dars</span>
                    <span className="text-xs font-bold">{prevAvg.toFixed(1)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                    <div className={(isRise ? "bg-primary" : "bg-error") + " w-full rounded-t-lg transition-all duration-700"} style={{height: Math.max((currAvg / data.lesson.max_score) * 100, 5) + "%"}}></div>
                    <span className={"text-[10px] font-bold " + (isRise ? "text-primary" : "text-error")}>{data.lesson.number}-dars</span>
                    <span className="text-xs font-bold">{currAvg.toFixed(1)}</span>
                  </div>
                </div>
              </section>
            </>
          );
        })()}

        {/* STATS BENTO - faqat Best/Worst */}
        {(isBest || isWorst) && <section className="grid grid-cols-2 gap-2">
          <button onClick={() => setActiveTab("low")} className={(activeTab === "low" ? "ring-2 ring-error " : "") + "bg-white border border-outline-variant p-3 rounded-xl text-left active:scale-95 transition-transform"}>
            <span className="material-symbols-outlined text-error text-base">trending_down</span>
            <p className="text-[10px] text-outline uppercase tracking-wider mt-1">Past ball</p>
            <p className="text-xl font-bold text-on-surface">{data.stats.low} <span className="text-xs font-normal text-outline">ta</span></p>
          </button>
          <button onClick={() => setActiveTab("missing")} className={(activeTab === "missing" ? "ring-2 ring-outline " : "") + "bg-white border border-outline-variant p-3 rounded-xl text-left active:scale-95 transition-transform"}>
            <span className="material-symbols-outlined text-outline text-base">person_off</span>
            <p className="text-[10px] text-outline uppercase tracking-wider mt-1">Topshirmagan</p>
            <p className="text-xl font-bold text-on-surface">{data.stats.missing} <span className="text-xs font-normal text-outline">ta</span></p>
          </button>
          <button onClick={() => setActiveTab("medium")} className={(activeTab === "medium" ? "ring-2 ring-secondary " : "") + "bg-white border border-outline-variant p-3 rounded-xl text-left active:scale-95 transition-transform"}>
            <span className="material-symbols-outlined text-secondary text-base">equalizer</span>
            <p className="text-[10px] text-outline uppercase tracking-wider mt-1">Orta ball</p>
            <p className="text-xl font-bold text-on-surface">{data.stats.medium} <span className="text-xs font-normal text-outline">ta</span></p>
          </button>
          <button onClick={() => setActiveTab("high")} className={(activeTab === "high" ? "ring-2 ring-primary " : "") + "bg-white border border-outline-variant p-3 rounded-xl text-left active:scale-95 transition-transform"}>
            <span className="material-symbols-outlined text-primary text-base">stars</span>
            <p className="text-[10px] text-outline uppercase tracking-wider mt-1">Yaxshi ball</p>
            <p className="text-xl font-bold text-on-surface">{data.stats.high} <span className="text-xs font-normal text-outline">ta</span></p>
          </button>
        </section>}

        {/* TAB NAV - faqat Best/Worst */}
        {(isBest || isWorst) && <nav className="flex overflow-x-auto gap-2 border-b border-outline-variant -mx-4 px-4 pb-1" style={{scrollbarWidth: "none"}}>
          <button onClick={() => setActiveTab("all")} className={"flex-shrink-0 py-2 px-3 text-xs font-semibold " + (activeTab === "all" ? "text-primary border-b-2 border-primary" : "text-outline")}>Hammasi ({data.stats.total})</button>
          {data.stats.missing > 0 && <button onClick={() => setActiveTab("missing")} className={"flex-shrink-0 py-2 px-3 text-xs font-semibold " + (activeTab === "missing" ? "text-primary border-b-2 border-primary" : "text-outline")}>Topshirmagan ({data.stats.missing})</button>}
          {data.stats.low > 0 && <button onClick={() => setActiveTab("low")} className={"flex-shrink-0 py-2 px-3 text-xs font-semibold " + (activeTab === "low" ? "text-primary border-b-2 border-primary" : "text-outline")}>Past ({data.stats.low})</button>}
          {data.stats.medium > 0 && <button onClick={() => setActiveTab("medium")} className={"flex-shrink-0 py-2 px-3 text-xs font-semibold " + (activeTab === "medium" ? "text-primary border-b-2 border-primary" : "text-outline")}>Orta ({data.stats.medium})</button>}
          {data.stats.high > 0 && <button onClick={() => setActiveTab("high")} className={"flex-shrink-0 py-2 px-3 text-xs font-semibold " + (activeTab === "high" ? "text-primary border-b-2 border-primary" : "text-outline")}>Yaxshi ({data.stats.high})</button>}
        </nav>}

        {/* STUDENTS LIST */}
        <section className="space-y-2">
          {(isRise || isDrop) && (
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
              <span className={"material-symbols-outlined " + (isRise ? "text-primary" : "text-error")}>{isRise ? "arrow_upward" : "arrow_downward"}</span>
              {isRise ? "O'sgan o'quvchilar" : "Tushgan o'quvchilar"} ({filteredStudents.length} ta)
            </h3>
          )}
          {filteredStudents.map((st, i) => {
            const initials = (st.full_name || "??").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
            let badge, badgeColor, scoreDisplay;
            if (st.category === "missing") { badge = "Topshirmagan"; badgeColor = "text-error bg-error/10"; scoreDisplay = "—"; }
            else if (st.category === "low") { badge = "Past (" + st.score + ")"; badgeColor = "text-error bg-error/10"; scoreDisplay = st.score; }
            else if (st.category === "medium") { badge = "Orta (" + st.score + ")"; badgeColor = "text-on-secondary-container bg-secondary-container"; scoreDisplay = st.score; }
            else { badge = isBest && st.score === data.lesson.max_score ? "Maks" : "Yaxshi (" + st.score + ")"; badgeColor = "text-primary-container bg-primary-fixed"; scoreDisplay = st.score; }
            
            // Rise/Drop boshqa render
            if (isRise || isDrop) {
              const changePct = st.change_percent || 0;
              const changeColor = changePct > 0 ? "text-primary" : "text-error";
              const bgInitial = changePct > 0 ? "bg-primary/10 text-primary" : "bg-error/10 text-error";
              return (
                <button key={st.id} onClick={() => onSelectStudent && onSelectStudent(st.id)} className="w-full bg-white p-3 rounded-xl border border-outline-variant flex items-center justify-between text-left active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 " + bgInitial}>{initials}</div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-on-surface truncate">{st.full_name}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-outline">L{data.previous_lesson_number}: {st.previous_score?.toFixed(1)}</span>
                        <span className="material-symbols-outlined text-[10px] text-outline">arrow_forward</span>
                        <span className={"text-[10px] font-semibold " + changeColor}>L{data.lesson.number}: {st.score?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-2 flex items-center gap-2">
                    <span className={"text-sm font-bold " + changeColor + " bg-" + (changePct > 0 ? "primary" : "error") + "/10 px-2 py-1 rounded-full"}>
                      {changePct > 0 ? "+" : ""}{changePct}%
                    </span>
                    <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
                  </div>
                </button>
              );
            }
            
            return (
              <button key={st.id} onClick={() => onSelectStudent && onSelectStudent(st.id)} className="w-full bg-white p-3 rounded-xl border border-outline-variant flex items-center justify-between text-left active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={"w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 " + (st.category === "missing" ? "bg-surface-container text-outline" : st.category === "low" ? "bg-error/10 text-error" : st.category === "medium" ? "bg-secondary-container/50 text-secondary" : "bg-primary/10 text-primary")}>{initials}</div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-on-surface truncate">{st.full_name}</h4>
                    <span className={"inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5 " + badgeColor}>{badge}</span>
                  </div>
                </div>
                <div className="text-right ml-2 flex items-center gap-2">
                  <div>
                    <p className="text-base font-bold text-on-surface">{scoreDisplay}</p>
                    <p className="text-[10px] text-outline">/{data.lesson.max_score}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
                </div>
              </button>
            );
          })}
          {filteredStudents.length === 0 && <div className="text-center py-8 text-outline text-sm">Oquvchi topilmadi</div>}
        </section>
      </main>

      {/* STICKY FAB */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-t border-outline-variant px-4 py-3 space-y-2">
        {(isWorst || isDrop) && (
          <>
            <button onClick={() => alert("Eslatma yuborildi (tez orada real ishlaydi)")} className="w-full h-12 bg-primary text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-95">
              <span className="material-symbols-outlined text-base">send</span>
              {isWorst ? "Topshirmaganlarga eslatma" : "Tushganlarga eslatma"}
            </button>
            <button onClick={() => alert("Maslahat yuborildi (tez orada real ishlaydi)")} className="w-full h-12 border border-primary text-primary bg-white rounded-xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-95">
              <span className="material-symbols-outlined text-base">tips_and_updates</span>
              {isWorst ? "Past ballga maslahat" : "Kuratorga xabar"}
            </button>
          </>
        )}
        {(isBest || isRise) && (
          <>
            <button onClick={() => alert("Tabriklash yuborildi (tez orada real ishlaydi)")} className="w-full h-12 bg-primary text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-95">
              <span className="material-symbols-outlined text-base">celebration</span>
              {isBest ? "Hammasiga tabriklash" : "Osganlarni tabriklash"}
            </button>
            {isBest && <button onClick={() => alert("Bonus ball berish - tez orada")} className="w-full h-12 border border-primary text-primary bg-white rounded-xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-95">
              <span className="material-symbols-outlined text-base">stars</span>
              Bonus ball berish
            </button>}
          </>
        )}
      </div>
    </div>
  );
}


// === STUDENT TREND PAGE ===
function StudentTrendPage({ userId, initialTaskType, onBack }) {
  const [taskType, setTaskType] = useState(initialTaskType || "all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    studentAPI.getAdminStudentTrend(userId, taskType)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, taskType]);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart || !data) return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(0, 59, 44, 0.3)");
    gradient.addColorStop(1, "rgba(0, 59, 44, 0)");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: data.lessons.map(l => "D" + l.lesson_number),
        datasets: [{
          label: "Ball",
          data: data.lessons.map(l => l.is_unlocked ? l.score : null),
          borderColor: "#003b2c",
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#003b2c",
          pointHoverRadius: 7,
          spanGaps: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#6f7974" } },
          y: { min: 0, max: data.max_score, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 }, color: "#6f7974" } }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (loading) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;
  if (!data) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Malumot yoq</div></div>;

  const initials = (data.user.full_name || "??").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-sm font-bold text-primary truncate">Shaxsiy trend</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-4">
        {/* Profile Hero */}
        <section className="bg-white rounded-2xl p-4 border border-outline-variant flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-on-surface truncate">{data.user.full_name}</h2>
            {data.user.username && <p className="text-xs text-outline">@{data.user.username}</p>}
            <p className="text-[10px] text-outline mt-0.5">{data.user.group_name || "Guruhsiz"}</p>
          </div>
        </section>

        <TaskFilter value={taskType} onChange={setTaskType} />

        {/* Chart */}
        <section className="bg-white rounded-2xl p-4 border border-outline-variant">
          <h3 className="text-sm font-bold text-primary mb-3">{data.user.full_name.split(" ")[0]} trendi (16 dars)</h3>
          <div className="h-[200px]"><canvas ref={canvasRef}></canvas></div>
        </section>

        <InsightsBento insights={data.insights} />

        {/* Lessons list */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-primary mb-1 px-1">Darslar tafsiloti</h3>
          {data.lessons.map(l => {
            if (!l.is_unlocked) {
              return (
                <div key={l.lesson_number} className="bg-surface-container/50 p-3 rounded-xl border border-outline-variant/50 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline text-xs font-bold">{l.lesson_number}</div>
                    <div>
                      <p className="text-xs font-semibold text-outline">{l.lesson_number}-dars</p>
                      <p className="text-[10px] text-outline">Yopiq</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-base">lock</span>
                </div>
              );
            }
            const catBg = l.category === "missing" ? "bg-error/10 text-error" : l.category === "low" ? "bg-error/10 text-error" : l.category === "medium" ? "bg-secondary-container/50 text-secondary" : "bg-primary/10 text-primary";
            const catLabel = l.category === "missing" ? "Topshirmagan" : l.category === "low" ? "Past" : l.category === "medium" ? "Orta" : "Yaxshi";
            return (
              <div key={l.lesson_number} className="bg-white p-3 rounded-xl border border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 " + catBg}>{l.lesson_number}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{l.title}</p>
                    <span className={"inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5 " + catBg}>{catLabel}</span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-bold text-on-surface">{l.score.toFixed(1)}</p>
                  <p className="text-[10px] text-outline">/{data.max_score}</p>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}


// === PENDING HELPERS ===
function formatTimeAgo(isoStr) {
  if (!isoStr) return "";
  const now = new Date();
  const past = new Date(isoStr);
  const diffMs = now - past;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 60) return diffMin + " min oldin";
  if (diffHr < 24) return diffHr + " soat oldin";
  return diffDay + " kun oldin";
}

function timeColorClass(isoStr) {
  if (!isoStr) return "bg-surface-container text-outline";
  const diffHr = (new Date() - new Date(isoStr)) / 3600000;
  if (diffHr < 6) return "bg-green-50 text-green-700 border border-green-100";
  if (diffHr < 24) return "bg-yellow-50 text-yellow-700 border border-yellow-100";
  return "bg-red-50 text-red-700 border border-red-100";
}

function typeColorBadge(type) {
  const m = {
    KONSPEKT: "bg-blue-100 text-blue-800",
    WORKBOOK: "bg-purple-100 text-purple-800",
    AMALIY: "bg-orange-100 text-orange-800",
    INSTAGRAM_STORIES: "bg-pink-100 text-pink-800",
    INSTAGRAM_REELS: "bg-red-100 text-red-800",
  };
  return m[type] || "bg-gray-100 text-gray-800";
}

// === ADMIN PENDING LIST ===
function AdminPendingList({ onBack, onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taskType, setTaskType] = useState("all");
  const [groupId, setGroupId] = useState(null);
  const [sort, setSort] = useState("oldest");

  const load = () => {
    setLoading(true);
    studentAPI.getAdminPendingSubmissions(taskType, groupId, sort)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [taskType, groupId, sort]);

  if (loading) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;

  const stats = data?.stats || {by_type: {}};
  const submissions = data?.submissions || [];

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">Baholanmagan vazifalar</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-3">
        {/* Hero */}
        <section className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
                <span className="text-base font-bold text-primary">{stats.total} ta vazifa kutmoqda</span>
              </div>
              <p className="text-[10px] text-outline">Eng eski: {formatTimeAgo(stats.oldest_at)}</p>
            </div>
            <div className="bg-primary-container text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold">{stats.total}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/60 p-2 rounded-lg">
              <p className="text-[10px] text-outline">Konspekt</p>
              <p className="text-base font-bold text-primary">{stats.by_type.konspekt || 0}</p>
            </div>
            <div className="bg-white/60 p-2 rounded-lg">
              <p className="text-[10px] text-outline">Workbook</p>
              <p className="text-base font-bold text-primary">{stats.by_type.workbook || 0}</p>
            </div>
            <div className="bg-white/60 p-2 rounded-lg">
              <p className="text-[10px] text-outline">Reels</p>
              <p className="text-base font-bold text-primary">{stats.by_type.reels || 0}</p>
            </div>
          </div>
        </section>

        {/* Filter chips - task type */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth: "none"}}>
          {[
            {id: "all", label: "Hammasi", n: stats.total},
            {id: "konspekt", label: "Konspekt", n: stats.by_type.konspekt},
            {id: "workbook", label: "Workbook", n: stats.by_type.workbook},
            {id: "amaliy", label: "Amaliy", n: stats.by_type.amaliy},
            {id: "stories", label: "Stories", n: stats.by_type.stories},
            {id: "reels", label: "Reels", n: stats.by_type.reels},
          ].map(t => (
            <button key={t.id} onClick={() => setTaskType(t.id)}
              className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap " + 
                (taskType === t.id ? "bg-primary text-white" : "bg-white border border-outline-variant text-on-surface-variant")}>
              {t.label} ({t.n || 0})
            </button>
          ))}
        </div>

        {/* Group filter */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth: "none"}}>
          {[
            {id: null, label: "Hammasi guruh"},
            {id: 1, label: "1-guruh"},
            {id: 3, label: "2-guruh"},
            {id: 2, label: "3-guruh"},
          ].map(g => (
            <button key={g.id || "all"} onClick={() => setGroupId(g.id)}
              className={"flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border " +
                (groupId === g.id ? "bg-surface-container-high border-primary text-primary" : "bg-white border-outline-variant text-on-surface-variant")}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-outline flex items-center gap-1"><span className="material-symbols-outlined text-sm">sort</span>Saralash:</span>
          <div className="flex gap-3">
            <button onClick={() => setSort("oldest")} className={sort === "oldest" ? "text-primary font-bold" : "text-outline"}>Eng eski</button>
            <button onClick={() => setSort("newest")} className={sort === "newest" ? "text-primary font-bold" : "text-outline"}>Eng yangi</button>
            <button onClick={() => setSort("student")} className={sort === "student" ? "text-primary font-bold" : "text-outline"}>Oquvchi</button>
          </div>
        </div>

        {/* Submissions list */}
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">Done</div>
            <h3 className="text-base font-bold text-primary mb-1">Hammasi tekshirilgan!</h3>
            <p className="text-xs text-outline">Baholanmagan vazifa yoq</p>
          </div>
        ) : (
          <section className="space-y-2">
            {submissions.map(s => {
              const initials = (s.user_full_name || "??").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
              return (
                <button key={s.id} onClick={() => onSelect(s.id)} className="w-full bg-white rounded-2xl p-3 shadow-sm border border-outline-variant text-left active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container text-sm flex-shrink-0">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-on-surface truncate">{s.user_full_name}</h3>
                      <p className="text-[10px] text-outline">{s.group_name || "Guruhsiz"}</p>
                    </div>
                    <span className={"text-[10px] font-bold px-2 py-1 rounded-md " + typeColorBadge(s.type)}>{s.type}</span>
                  </div>
                  <div className="pl-13 flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant">{s.lesson_number ? s.lesson_number + "-dars" : "—"} · <span className="font-semibold">{s.lesson_title || "Reels"}</span></span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px]">
                    <span className={"px-2 py-0.5 rounded font-semibold " + timeColorClass(s.submitted_at)}>{formatTimeAgo(s.submitted_at)}</span>
                    <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

// === ADMIN REVIEW PAGE ===
function AdminReviewPage({ submissionId, onBack, onDone }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [isLate, setIsLate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    studentAPI.getAdminPendingSubmissions("all").then(d => {
      const found = (d.submissions || []).find(s => s.id === submissionId);
      if (found) {
        setSubmission(found);
        setScore(Math.floor((found.max_score || 10) * 0.8));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [submissionId]);

  const handleReview = async (approved) => {
    if (submitting) return;
    if (!approved && !comment.trim()) {
      alert("Rad etish uchun izoh majburiy!");
      return;
    }
    setSubmitting(true);
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      await studentAPI.reviewSubmission(submissionId, {
        score: approved ? score : 0,
        comment: comment,
        approved: approved,
        is_late: isLate,
        reviewer_telegram_id: tg,
      });
      alert(approved ? "Tasdiqlandi! " + score + " ball berildi" : "Rad etildi");
      onDone();
    } catch (e) {
      alert("Xato: " + e.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;
  if (!submission) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Vazifa topilmadi</div></div>;

  const initials = (submission.user_full_name || "??").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const maxScore = submission.max_score || 10;
  const quickButtons = maxScore <= 10 ? [0, 3, 5, 7, 10] : maxScore <= 20 ? [0, 5, 10, 15, 20] : [0, 10, 25, 40, 50];

  return (
    <div className="font-inter bg-background min-h-screen pb-40">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">Vazifani baholash</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-4">
        {/* User header */}
        <section className="bg-white rounded-2xl p-4 border border-outline-variant flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base">{initials}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-on-surface truncate">{submission.user_full_name}</h2>
            <p className="text-xs text-outline truncate">{submission.group_name || "—"} {submission.user_username ? "· @" + submission.user_username : ""}</p>
            <p className="text-[10px] text-outline mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">schedule</span>
              {formatTimeAgo(submission.submitted_at)}
            </p>
          </div>
        </section>

        {/* Task badge */}
        <section className="bg-primary-container rounded-2xl p-5 text-white">
          <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded-full inline-block mb-2">VAZIFA</span>
          <h3 className="text-lg font-bold">{submission.type}{submission.lesson_number ? " — " + submission.lesson_number + "-dars" : ""}</h3>
          {submission.lesson_title && <p className="text-xs opacity-90 mt-1">{submission.lesson_title}</p>}
          {submission.speaker && <p className="text-[11px] opacity-80 mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-xs">mic</span>{submission.speaker}</p>}
        </section>

        {/* Content */}
        <section>
          <h4 className="text-sm font-bold text-on-surface mb-2">Material</h4>
          {submission.instagram_link ? (
            <div className="bg-white rounded-2xl p-4 border border-outline-variant">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary">link</span>
                <span className="text-xs font-bold">Instagram</span>
              </div>
              <p className="text-xs text-on-surface mb-3 whitespace-pre-wrap">{submission.instagram_link}</p>
              <a href={(submission.instagram_link.match(/https?:\/\/[^\s]+/) || [""])[0]} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary font-semibold underline">
                <span className="material-symbols-outlined text-xs">open_in_new</span>
                Instagramda ochish
              </a>
            </div>
          ) : submission.file_id ? (
            <div className="bg-white rounded-2xl p-4 border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">{submission.file_type === "photo" ? "image" : submission.file_type === "video" ? "video_file" : "description"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{submission.file_name || "Fayl"}</p>
                  <p className="text-[10px] text-outline">{submission.file_type || "file"}</p>
                </div>
              </div>
              <p className="text-[10px] text-outline mt-2">Telegram bot orqali ochish kerak (faylni ko'rish uchun)</p>
            </div>
          ) : (
            <div className="bg-surface-container/50 rounded-2xl p-4 text-center text-outline text-xs">Material yoq</div>
          )}
        </section>

        {/* Grading */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-on-surface">Baholash</h4>
            <div className="bg-primary text-white text-lg font-bold px-4 py-1 rounded-full">{score} / {maxScore}</div>
          </div>

          <div>
            <input type="range" min="0" max={maxScore} step="1" value={score} onChange={e => setScore(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between mt-1 text-[10px] text-outline">
              <span>0</span><span>{maxScore}</span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto" style={{scrollbarWidth: "none"}}>
            {quickButtons.map(v => (
              <button key={v} onClick={() => setScore(v)}
                className={"flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold " + 
                  (score === v ? "bg-primary text-white" : "bg-white border border-outline-variant text-on-surface-variant")}>
                {v}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 p-3 bg-error-container/10 border border-error-container/30 rounded-2xl cursor-pointer">
            <input type="checkbox" checked={isLate} onChange={e => setIsLate(e.target.checked)} className="w-5 h-5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-error">Kechikkan deb belgilash</p>
              <p className="text-[10px] text-outline">Ball kam beriladi</p>
            </div>
          </label>

          <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={200} placeholder="Izoh (ixtiyoriy)"
            className="w-full min-h-[80px] p-3 rounded-2xl border border-outline-variant focus:border-primary focus:outline-none text-sm" />

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setComment("Ajoyib ish!")} className="p-2 bg-surface-container rounded-lg text-xs text-left">Ajoyib ish!</button>
            <button onClick={() => setComment("Yaxshi")} className="p-2 bg-surface-container rounded-lg text-xs text-left">Yaxshi</button>
            <button onClick={() => setComment("Tahrirlash kerak")} className="p-2 bg-surface-container rounded-lg text-xs text-left">Tahrirlash kerak</button>
            <button onClick={() => setComment("Rad etilsin")} className="p-2 bg-surface-container rounded-lg text-xs text-left">Rad etilsin</button>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-primary p-4 flex gap-2 z-[60]" style={{paddingBottom: "calc(1rem + env(safe-area-inset-bottom))"}}>
        <button onClick={() => handleReview(false)} disabled={submitting}
          className="flex-1 py-3 rounded-2xl border-2 border-error text-error font-bold text-sm active:scale-95 disabled:opacity-50">
          RAD ETISH
        </button>
        <button onClick={() => handleReview(true)} disabled={submitting}
          className="flex-[1.5] py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg active:scale-95 disabled:opacity-50">
          {submitting ? "Saqlanmoqda..." : "TASDIQLASH"}
        </button>
      </div>
    </div>
  );
}


// === ADMIN LESSONS LIST ===
function AdminLessonsList({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    studentAPI.getAdminLessons()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;

  const stats = data?.stats || {total: 0, unlocked: 0, locked: 0, max_students: 46};
  const allLessons = data?.lessons || [];
  const lessons = filter === "unlocked" ? allLessons.filter(l => l.is_unlocked) :
                  filter === "locked" ? allLessons.filter(l => !l.is_unlocked) :
                  allLessons;

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const months = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
    return d.getDate() + "-" + months[d.getMonth()];
  };

  return (
    <div className="font-inter bg-background min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-primary">Darslar</h1>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-3">
        <section className="bg-primary-container rounded-2xl p-4 text-white">
          <h2 className="text-base font-bold mb-1">📚 Real Marketing 5.0</h2>
          <p className="text-xs opacity-90 mb-3">16 dars dasturi</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-[10px] opacity-80">Jami</p>
            </div>
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.unlocked}</p>
              <p className="text-[10px] opacity-80">Ochiq</p>
            </div>
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.locked}</p>
              <p className="text-[10px] opacity-80">Yopiq</p>
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          {[
            {id: "all", label: "Hammasi", n: stats.total},
            {id: "unlocked", label: "Ochiq", n: stats.unlocked},
            {id: "locked", label: "Yopiq", n: stats.locked},
          ].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={"flex-1 px-3 py-2 rounded-full text-xs font-semibold " + 
                (filter === t.id ? "bg-primary text-white" : "bg-white border border-outline-variant text-on-surface-variant")}>
              {t.label} ({t.n})
            </button>
          ))}
        </div>

        <section className="space-y-2">
          {lessons.map(l => {
            const max = stats.max_students || 46;
            return (
              <div key={l.id} className={"bg-white rounded-2xl p-3 shadow-sm border " + (l.is_unlocked ? "border-outline-variant" : "border-outline-variant opacity-60")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={"w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 " + (l.is_unlocked ? "bg-primary text-white" : "bg-surface-container text-outline")}>{l.lesson_number}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-on-surface truncate">{l.title}</h3>
                      <p className="text-[10px] text-outline truncate">{l.speaker || "—"} · {formatDate(l.lesson_date)}</p>
                    </div>
                  </div>
                  <span className={"text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 " + (l.is_unlocked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                    {l.is_unlocked ? "OCHIQ" : "YOPIQ"}
                  </span>
                </div>
                {l.is_unlocked && (
                  <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-outline-variant">
                    <div className="text-center">
                      <p className="text-[10px] text-outline">Konsp.</p>
                      <p className="text-xs font-bold text-primary">{Math.min(l.konspekt_count, max)}/{max}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-outline">Workb.</p>
                      <p className="text-xs font-bold text-primary">{Math.min(l.workbook_count, max)}/{max}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-outline">Amaliy</p>
                      <p className="text-xs font-bold text-primary">{Math.min(l.amaliy_count, max)}/{max}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-outline">O'rt ball</p>
                      <p className="text-xs font-bold text-primary">{l.avg_score.toFixed(1)}</p>
                    </div>
                  </div>
                )}
                {l.is_unlocked && (l.workbook_deadline || l.practical_deadline || l.pending_count > 0) && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant text-[10px]">
                    <div className="flex gap-3">
                      {l.workbook_deadline && <span className="text-outline">📘 <span className="font-semibold text-on-surface-variant">{formatDate(l.workbook_deadline)}</span></span>}
                      {l.practical_deadline && <span className="text-outline">🛠 <span className="font-semibold text-on-surface-variant">{formatDate(l.practical_deadline)}</span></span>}
                    </div>
                    {l.pending_count > 0 && <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold">⏳ {l.pending_count}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}


// === ADMIN STATISTICS TAB ===
function AdminStatistics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getAdminStatsOverview()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="font-inter bg-background min-h-screen flex items-center justify-center"><div>Yuklanmoqda...</div></div>;

  const totals = data?.totals || {};
  const progress = data?.tasks_progress || [];
  const groups = data?.groups_ranking || [];
  const topStudents = data?.top_students || [];

  const taskLabels = {
    konspekt: "Konspekt",
    workbook: "Workbook",
    amaliy: "Amaliy",
    test: "Test",
    stories: "Stories",
    reels: "Reels",
  };

  const barColor = (pct) => {
    if (pct >= 80) return "bg-green-500 text-green-600";
    if (pct >= 50) return "bg-yellow-500 text-yellow-600";
    return "bg-red-500 text-red-600";
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 bg-surface h-14 border-b border-outline-variant">
        <h1 className="text-base font-bold text-primary flex items-center gap-2">📊 Statistika</h1>
      </header>

      <main className="pt-20 px-4 pb-24 space-y-5">
        {/* Hero Stats */}
        <section className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{background: "linear-gradient(135deg, #003b2c 0%, #005440 100%)"}}>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-base font-bold opacity-90">📚 Real Marketing 5.0</h2>
            <p className="text-[11px] opacity-70 mb-4">Umumiy holat</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-2xl font-bold">{totals.students || 0}</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wider">O'quvchi</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-2xl font-bold">{totals.lessons || 0} / {totals.lessons_unlocked || 0}</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wider">Dars (ochiq)</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-2xl font-bold">{totals.submissions || 0}</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wider">Topshiriqlar</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-2xl font-bold">{totals.submissions_24h || 0}</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wider">So'nggi 24 soat</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mini Stats */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-outline-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-primary mb-1">task_alt</span>
            <p className="text-lg font-bold text-primary">{totals.submissions_7d || 0}</p>
            <p className="text-[10px] text-outline">Hafta</p>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-outline-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-primary mb-1">stars</span>
            <p className="text-lg font-bold text-primary">{totals.curators || 0}</p>
            <p className="text-[10px] text-outline">Kuratorlar</p>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-outline-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-primary mb-1">support_agent</span>
            <p className="text-lg font-bold text-primary">{totals.assistants || 0}</p>
            <p className="text-[10px] text-outline">Asistentlar</p>
          </div>
        </section>

        {/* Vazifalar Progress */}
        <section>
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">📋 Vazifalar progress</h3>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant space-y-3">
            {progress.map((p, i) => {
              const colors = barColor(p.percent);
              const [bg, text] = colors.split(" ");
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-on-surface">{taskLabels[p.type] || p.type}</span>
                    <span className={"text-xs font-bold " + text}>{p.percent}% ({p.completed}/{p.total})</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className={"h-full rounded-full transition-all " + bg} style={{width: p.percent + "%"}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Guruhlar Reytingi - Podium */}
        {groups.length >= 3 && (
          <section>
            <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">🏆 Guruhlar reytingi</h3>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
              <div className="flex items-end justify-center gap-3 h-44">
                {/* 2nd - chap */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <p className="text-[10px] text-outline">{groups[1].name.split(" ")[0]}</p>
                    <p className="text-sm font-bold text-primary">{groups[1].avg_score}b</p>
                  </div>
                  <div className="w-16 h-20 bg-secondary-container rounded-t-lg flex items-center justify-center border-x border-t border-outline-variant">
                    <span className="text-on-secondary-container font-bold text-2xl">2</span>
                  </div>
                </div>
                {/* 1st - markaz */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <p className="text-xs text-primary font-bold">{groups[0].name.split(" ")[0]}</p>
                    <p className="text-base font-bold text-primary-container">{groups[0].avg_score}b</p>
                  </div>
                  <div className="w-20 h-28 bg-primary-container rounded-t-lg flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-3xl">1</span>
                  </div>
                </div>
                {/* 3rd - ong */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <p className="text-[10px] text-outline">{groups[2].name.split(" ")[0]}</p>
                    <p className="text-sm font-bold text-primary">{groups[2].avg_score}b</p>
                  </div>
                  <div className="w-16 h-14 bg-surface-container-high rounded-t-lg flex items-center justify-center border-x border-t border-outline-variant">
                    <span className="text-on-surface-variant font-bold text-xl">3</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TOP 5 */}
        {topStudents.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-primary mb-3">🌟 TOP 5 o'quvchilar</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
              {topStudents.map((s, i) => {
                const isFirst = s.rank === 1;
                return (
                  <div key={s.user_id}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 " + (isFirst ? "bg-primary-container text-white" : "bg-surface-container text-on-surface")}>{s.rank}</div>
                        <div className="min-w-0">
                          <p className={"text-sm truncate " + (isFirst ? "font-bold" : "font-medium")}>{s.full_name}</p>
                          <p className="text-[10px] text-outline truncate">{s.group_name}</p>
                        </div>
                      </div>
                      <span className={"px-3 py-1 rounded-full font-bold text-xs flex-shrink-0 " + (isFirst ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant")}>{s.total_score}b</span>
                    </div>
                    {i < topStudents.length - 1 && <div className="mx-3 border-t border-outline-variant/30"></div>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
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
