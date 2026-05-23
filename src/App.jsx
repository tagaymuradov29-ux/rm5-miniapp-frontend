import { useState, useEffect } from 'react';
import { studentAPI, getTelegramUser, initTelegramWebApp } from './api';

export default function App() {
  const [user, setUser] = useState(null);
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

      const [profileData, scoresData, lessonsData, rankingData] = await Promise.all([
        studentAPI.getProfile(tgUser.id),
        studentAPI.getScores(tgUser.id),
        studentAPI.getLessons(tgUser.id),
        studentAPI.getRanking(tgUser.id),
      ]);

      setProfile(profileData);
      setScores(scoresData);
      setLessons(lessonsData.lessons || []);
      setRanking(rankingData);
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

  return (
    <div className="min-h-screen pb-24">
      {activeTab === 'home' && <HomeTab profile={profile} scores={scores} ranking={ranking} />}
      {activeTab === 'lessons' && <LessonsTab lessons={lessons} />}
      {activeTab === 'ranking' && <RankingTab ranking={ranking} />}
      {activeTab === 'profile' && <ProfileTab profile={profile} user={user} />}
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// ============== HOME TAB ==============
function HomeTab({ profile, scores, ranking }) {
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

// ============== LESSONS TAB ==============
function LessonsTab({ lessons }) {
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
          filtered.map(lesson => <LessonCard key={lesson.lesson_id} lesson={lesson} />)
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

function LessonCard({ lesson }) {
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
    <article className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/30">
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
