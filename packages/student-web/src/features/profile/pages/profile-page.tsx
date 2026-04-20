/**
 * 文件说明：个人资料页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：13-个人资料页/01-profile.html
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  Info,
  Leaf,
  Lock,
  Settings2,
  ShieldCheck,
  User,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';

type ProfileExtras = {
  bio: string;
  school: string;
  major: string;
  identity: string;
  grade: string;
};

const PROFILE_EXTRAS_STORAGE_KEY = 'xiaomai-profile-extras';

function readProfileExtras(storage: Storage | undefined): ProfileExtras {
  if (!storage) {
    return {
      bio: '',
      school: '',
      major: '',
      identity: '',
      grade: '',
    };
  }

  const rawValue = storage.getItem(PROFILE_EXTRAS_STORAGE_KEY);
  if (!rawValue) {
    return {
      bio: '',
      school: '',
      major: '',
      identity: '',
      grade: '',
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ProfileExtras>;
    return {
      bio: parsed.bio ?? '',
      school: parsed.school ?? '',
      major: parsed.major ?? '',
      identity: parsed.identity ?? '',
      grade: parsed.grade ?? '',
    };
  } catch {
    storage.removeItem(PROFILE_EXTRAS_STORAGE_KEY);
    return {
      bio: '',
      school: '',
      major: '',
      identity: '',
      grade: '',
    };
  }
}

function persistProfileExtras(extras: ProfileExtras) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILE_EXTRAS_STORAGE_KEY, JSON.stringify(extras));
}

export function ProfilePage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const setSession = useAuthSessionStore(state => state.setSession);

  const initialExtras = useMemo(
    () => readProfileExtras(typeof window === 'undefined' ? undefined : window.localStorage),
    [],
  );

  const [nickname, setNickname] = useState(session?.user.nickname ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user.avatarUrl ?? null);
  const [extras, setExtras] = useState<ProfileExtras>({
    bio: initialExtras.bio || '高等数学狂热爱好者，正在努力攻克微积分与线性代数。',
    school: initialExtras.school || '示例职业技术学院',
    major: initialExtras.major || '机电工程系',
    identity: initialExtras.identity || '高职学生',
    grade: initialExtras.grade || '大一',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applySave = () => {
    if (!session) {
      notify({
        tone: 'error',
        title: t('userSettings.profile.saveFailedTitle'),
        description: t('userSettings.profile.saveFailedMessage'),
      });
      return;
    }

    if (!nickname.trim()) {
      notify({
        tone: 'error',
        title: t('userSettings.profile.validationTitle'),
        description: t('userSettings.profile.nicknameRequired'),
      });
      return;
    }

    persistProfileExtras(extras);
    setSession(
      {
        ...session,
        user: {
          ...session.user,
          nickname: nickname.trim(),
          avatarUrl,
        },
      },
      undefined,
    );

    notify({
      tone: 'success',
      title: t('userSettings.profile.saveSuccessTitle'),
      description: t('userSettings.profile.saveSuccessMessage'),
    });
  };

  const resetDraft = () => {
    if (!session) return;
    const latestExtras = readProfileExtras(typeof window === 'undefined' ? undefined : window.localStorage);
    setNickname(session.user.nickname ?? '');
    setAvatarUrl(session.user.avatarUrl ?? null);
    setExtras({
      bio: latestExtras.bio || '',
      school: latestExtras.school || '',
      major: latestExtras.major || '',
      identity: latestExtras.identity || '',
      grade: latestExtras.grade || '',
    });
  };

  const handlePickAvatar = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    const dataUrl = await new Promise<string | null>((resolve) => {
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    if (!dataUrl) {
      notify({
        tone: 'error',
        title: t('userSettings.profile.avatarFailedTitle'),
        description: t('userSettings.profile.avatarFailedMessage'),
      });
      return;
    }

    setAvatarUrl(dataUrl);
    notify({
      tone: 'success',
      title: t('userSettings.profile.avatarUpdatedTitle'),
      description: t('userSettings.profile.avatarUpdatedMessage'),
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <header className="w-full max-w-6xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
        <Link
          to="/"
          className="font-bold text-lg flex items-center gap-3 pointer-events-auto hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-text-primary dark:bg-text-primary-dark rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="w-4.5 h-4.5 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark hidden sm:block text-xl">
            XiaoMai
          </span>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto">
          <Link
            to="/learning"
            className="bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-2 shadow-sm border border-bordercolor-light dark:border-bordercolor-dark transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">{t('learningCenter.page.backToLearning')}</span>
          </Link>
        </div>
      </header>

      <main className="w-[94%] max-w-6xl mx-auto mt-12 mb-12 pb-40 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 relative z-10">
        <aside className="flex flex-col gap-2 view-enter stagger-1 lg:sticky lg:top-24 self-start">
          <h2 className="text-[11px] font-black tracking-widest text-text-secondary dark:text-text-secondary-dark mb-3 px-4 uppercase">
            User Settings
          </h2>

          <div className="flex flex-col gap-1">
            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center transition-colors shadow-sm">
              <span className="flex items-center gap-2.5">
                <User className="w-4 h-4" /> {t('userSettings.profile.navProfile')}
              </span>
            </div>

            <Link
              to="/settings"
              className="border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex items-center gap-2.5 btn-transition"
            >
              <ShieldCheck className="w-4 h-4" /> {t('userSettings.profile.navSecurity')}
            </Link>

            <Link
              to="/settings"
              className="border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex items-center gap-2.5 btn-transition"
            >
              <Settings2 className="w-4 h-4" /> {t('userSettings.profile.navPreferences')}
            </Link>
          </div>
        </aside>

        <div className="flex flex-col gap-8 view-enter stagger-2 relative">
          <div className="mb-2">
            <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
              {t('userSettings.profile.title')}
            </h1>
            <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
              {t('userSettings.profile.subtitle')}
            </p>
          </div>

          <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-sm">
            <div className="w-24 h-24 rounded-full bg-secondary dark:bg-[#1a1614] border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center overflow-hidden relative group cursor-pointer shrink-0 shadow-sm">
              <img
                src={avatarUrl ?? 'https://i.pravatar.cc/150?img=68'}
                alt="Current Avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-80 btn-transition flex flex-col items-center justify-center text-white">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold tracking-wider">{t('userSettings.profile.avatarChange')}</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handlePickAvatar(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-bordercolor-light dark:border-bordercolor-dark bg-secondary dark:bg-[#1a1614] text-text-primary dark:text-text-primary-dark px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark btn-transition shadow-sm"
                >
                  {t('userSettings.profile.avatarUpload')}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="border border-transparent text-text-secondary dark:text-text-secondary-dark px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-surface-light dark:hover:bg-surface-dark btn-transition"
                >
                  {t('userSettings.profile.avatarRemove')}
                </button>
              </div>
              <p className="text-[11px] text-text-secondary/80 dark:text-text-secondary-dark/80 font-medium">
                {t('userSettings.profile.avatarHint')}
              </p>
            </div>
          </section>

          <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black mb-6 border-b border-bordercolor-light dark:border-bordercolor-dark pb-4 text-text-primary dark:text-text-primary-dark">
              {t('userSettings.profile.sectionBasic')}
            </h2>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2.5 max-w-lg">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark flex justify-between">
                  <span>
                    {t('userSettings.profile.nickname')} <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark"
                  placeholder={t('userSettings.profile.nicknamePlaceholder')}
                />
                <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-medium">
                  {t('userSettings.profile.nicknameHint')}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 max-w-lg">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {t('userSettings.profile.account')}
                </label>
                <div className="w-full bg-secondary dark:bg-[#1a1614] border border-bordercolor-light dark:border-bordercolor-dark rounded-xl px-4 py-3 text-sm text-text-secondary dark:text-text-secondary-dark flex justify-between items-center cursor-not-allowed">
                  <span className="font-mono">{session?.user.username ?? '-'}</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold bg-surface-light dark:bg-surface-dark px-2 py-0.5 rounded shadow-sm border border-bordercolor-light dark:border-bordercolor-dark">
                    <Lock className="w-3 h-3" /> {t('userSettings.profile.accountLocked')}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 max-w-lg">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {t('userSettings.profile.bio')}
                </label>
                <textarea
                  value={extras.bio}
                  onChange={(event) => setExtras((current) => ({ ...current, bio: event.target.value }))}
                  className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark h-28 resize-none"
                  placeholder={t('userSettings.profile.bioPlaceholder')}
                />
              </div>
            </div>
          </section>

          <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex justify-between items-center border-b border-bordercolor-light dark:border-bordercolor-dark pb-4 mb-6">
              <h2 className="text-lg font-black text-text-primary dark:text-text-primary-dark">
                {t('userSettings.profile.sectionEducation')}
              </h2>
              <span className="text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark bg-secondary dark:bg-[#2c2522] px-2 py-1 rounded">
                {t('userSettings.profile.optional')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              <div className="flex flex-col gap-2.5">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {t('userSettings.profile.school')}
                </label>
                <input
                  type="text"
                  value={extras.school}
                  onChange={(event) => setExtras((current) => ({ ...current, school: event.target.value }))}
                  className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark"
                  placeholder={t('userSettings.profile.schoolPlaceholder')}
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {t('userSettings.profile.major')}
                </label>
                <input
                  type="text"
                  value={extras.major}
                  onChange={(event) => setExtras((current) => ({ ...current, major: event.target.value }))}
                  className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark"
                  placeholder={t('userSettings.profile.majorPlaceholder')}
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {t('userSettings.profile.identity')}
                </label>
                <div className="relative">
                  <select
                    value={extras.identity}
                    onChange={(event) => setExtras((current) => ({ ...current, identity: event.target.value }))}
                    className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark appearance-none cursor-pointer pr-10"
                  >
                    <option value="">{t('userSettings.profile.identityPlaceholder')}</option>
                    <option value="高职学生">高职学生</option>
                    <option value="高职教师">高职教师</option>
                    <option value="自学者">自学者</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {t('userSettings.profile.grade')}
                </label>
                <div className="relative">
                  <select
                    value={extras.grade}
                    onChange={(event) => setExtras((current) => ({ ...current, grade: event.target.value }))}
                    className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark appearance-none cursor-pointer pr-10"
                  >
                    <option value="">{t('userSettings.profile.gradePlaceholder')}</option>
                    <option value="大一">大一</option>
                    <option value="大二">大二</option>
                    <option value="大三">大三</option>
                    <option value="毕业生/社会人员">毕业生/社会人员</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 mb-4 view-enter stagger-3">
            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark p-4 md:px-6 rounded-2xl flex flex-col sm:flex-row sm:justify-between items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark">
                <Info className="w-4 h-4" /> {t('userSettings.profile.saveHint')}
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={resetDraft}
                  className="border border-bordercolor-light dark:border-bordercolor-dark bg-secondary dark:bg-[#1a1614] text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-6 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm"
                >
                  {t('userSettings.profile.cancel')}
                </button>
                <button
                  type="button"
                  onClick={applySave}
                  className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-8 py-2.5 rounded-xl text-[13px] font-bold hover:opacity-90 btn-transition flex items-center gap-2 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(82,196,26,0.8)]" />
                  {t('userSettings.profile.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SurfaceDashboardDock active="settings" avatarUrl={avatarUrl} />
    </div>
  );
}
