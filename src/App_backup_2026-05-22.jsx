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

  return (
    <>
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-b-card shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <div className="text-sm opacity-90">Assalomu alaykum,</div>
            <div className="text-lg font-semibold">{profile?.full_name}</div>
          </div>
        </div>

        <div className="text-center my-6">
          <div className="text-5xl font-bold mb-1">💎 {scores?.total}</div>
          <div className="text-sm opacity-90">/ {scores?.max_total} ball</div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-card p-3">
          <div className="flex justify-between text-sm mb-2">
            <span>Sizning natijangiz</span>
            <span className="font-semibold">{scores?.percentage}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-1000"
              style={{ width: `${scores?.percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Ranking card */}
        {ranking && (
          <div className="card bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-text-secondary mb-1">🏆 Sizning o'rningiz</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{ranking.group_position}</span>
                  <span className="text-sm text-text-secondary">/ {ranking.group_total} guruh</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary mb-1">Kursda</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{ranking.course_position}</span>
                  <span className="text-sm text-text-secondary">/ {ranking.course_total}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group info */}
        <div className="card flex items-center justify-between">
          <div>
            <div className="text-xs text-text-secondary">Guruh</div>
            <div className="font-semibold">{profile?.group_name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-secondary">Kurator</div>
            <div className="font-semibold">{profile?.curator_name}</div>
          </div>
        </div>

        {/* Scores breakdown */}
        <h2 className="text-lg font-semibold mt-4 mb-2">📊 Ballaringiz</h2>
        <div className="space-y-2">
          <ScoreRow icon="📒" label="Konspekt" earned={scores?.konspekt || 0} max={160} />
          <ScoreRow icon="📘" label="Workbook" earned={scores?.workbook || 0} max={320} />
          <ScoreRow icon="🛠" label="Amaliy" earned={scores?.amaliy || 0} max={400} />
          <ScoreRow icon="🧪" label="Test" earned={scores?.test || 0} max={320} />
          <ScoreRow icon="🏆" label="Workshop" earned={scores?.workshop || 0} max={250} />
          <ScoreRow icon="📸" label="Instagram" earned={scores?.instagram || 0} max={520} />
        </div>
      </div>
    </>
  );
}

// ============== LESSONS TAB ==============
function LessonsTab({ lessons }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📚 Vazifalar</h1>
      <div className="text-sm text-text-secondary mb-4">
        Jami {lessons.length} ta dars
      </div>
      
      <div className="space-y-3">
        {lessons.map(lesson => (
          <LessonCard key={lesson.lesson_id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}

function LessonCard({ lesson }) {
  if (!lesson.is_unlocked) {
    return (
      <div className="card opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bg-subtle flex items-center justify-center text-text-secondary font-bold">
            🔒
          </div>
          <div>
            <div className="text-sm text-text-secondary">{lesson.lesson_number}-dars</div>
            <div className="font-medium">{lesson.title}</div>
            <div className="text-xs text-text-muted mt-1">
              📅 {new Date(lesson.lesson_date).toLocaleDateString('uz')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
          {lesson.lesson_number}
        </div>
        <div className="flex-1">
          <div className="font-semibold mb-1">{lesson.title}</div>
          {lesson.speaker && (
            <div className="text-xs text-text-secondary">👨‍🏫 {lesson.speaker}</div>
          )}
          <div className="text-xs text-text-muted">
            📅 {new Date(lesson.lesson_date).toLocaleDateString('uz')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-bg-subtle">
        <StatusChip type="📒 Konspekt" data={lesson.konspekt} maxScore={10} />
        {lesson.workbook !== null && (
          <StatusChip type="📘 Workbook" data={lesson.workbook} maxScore={20} />
        )}
        {lesson.amaliy !== null && (
          <StatusChip type="🛠 Amaliy" data={lesson.amaliy} maxScore={50} />
        )}
        {lesson.test !== null && (
          <StatusChip type="🧪 Test" data={lesson.test} maxScore={20} />
        )}
      </div>
    </div>
  );
}

function StatusChip({ type, data, maxScore }) {
  if (!data) {
    return (
      <div className="text-xs px-2 py-1 rounded-chip bg-bg-subtle text-text-secondary">
        {type} <span className="opacity-60">— yo'q</span>
      </div>
    );
  }

  const status = data.status;
  let color = 'bg-success/10 text-success';
  let label = `✅ ${data.score}`;

  if (status === 'PENDING') {
    color = 'bg-warning/10 text-warning';
    label = '⏳ kutmoqda';
  } else if (status === 'REJECTED') {
    color = 'bg-danger/10 text-danger';
    label = '🔄 qayta';
  } else if (data.score === 0 && status !== 'APPROVED') {
    color = 'bg-bg-subtle text-text-secondary';
    label = `${data.score}`;
  }

  return (
    <div className={`text-xs px-2 py-1 rounded-chip font-medium ${color}`}>
      {type} {label}
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
