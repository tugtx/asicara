import React, { useState, useEffect } from 'react';
import { Novel, TabType } from './types';
import { sampleNovels } from './data/initialNovel';
import { Navbar } from './components/Navbar';
import { ApiKeyModal } from './components/ApiKeyModal';
import { GeneralChat } from './components/GeneralChat';
import { LoginView } from './components/LoginView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { UsageGuideModal } from './components/UsageGuideModal';
import { BuyerReplyView } from './components/BuyerReplyView';
import { DevToolsGuard } from './components/DevToolsGuard';
import { X, BookOpen, Sparkles, MessageCircle } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ai_novel_studio_auth_logged_in') === 'true';
  });

  const [novels, setNovels] = useState<Novel[]>(() => {
    const saved = localStorage.getItem('ai_novel_studio_novels_v1');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        // 数据迁移逻辑：强制更新旧版的样例书籍
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id === 'novel-1') {
          const first = parsed[0];
          const hasThreeChapters = first.volumes?.[0]?.chapters?.length === 3;
          const hasFemaleLead = first.characters?.some((c: any) => c.name === '苏轻雪');
          
          // 如果标题是旧的，或者是旧的3章结构，或者还残留有女主，则强制同步到最新的模版
          if (first.title === '星海主宰：从废土觉醒开始' || hasThreeChapters || hasFemaleLead) {
             parsed[0] = sampleNovels[0];
          }
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return sampleNovels;
  });

  const [currentNovelId, setCurrentNovelId] = useState<string>(() => {
    const savedId = localStorage.getItem('ai_novel_studio_current_novel_id');
    if (savedId && novels.some((n) => n.id === savedId)) {
      return savedId;
    }
    return novels[0]?.id || 'novel-1';
  });

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const savedTab = localStorage.getItem('ai_novel_studio_active_tab');
    if (savedTab && ['admin', 'apikeys', 'buyer_reply'].includes(savedTab)) return savedTab as TabType;
    return 'apikeys';
  });

  const [selectedChapterId, setSelectedChapterId] = useState<string>(() => {
    return localStorage.getItem('ai_novel_studio_selected_chapter_id') || '';
  });

  const [showConfigWarning, setShowConfigWarning] = useState(false);
  const [showUsageGuideModal, setShowUsageGuideModal] = useState(false);
  const [isGeneralChatOpen, setIsGeneralChatOpen] = useState(false);

  const [usedSeconds, setUsedSeconds] = useState<number>(0);
  const [maxSeconds, setMaxSeconds] = useState<number>(() => parseInt(localStorage.getItem('ai_novel_studio_timeout_max') || '3600', 10));
  const [isLimitedUser, setIsLimitedUser] = useState<boolean>(false);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);

  // 体验计时Ref，避免 useEffect 依赖变化导致无限清空/重建计时器
  const maxSecondsRef = React.useRef(maxSeconds);
  const usedSecondsRef = React.useRef(usedSeconds);
  useEffect(() => {
    maxSecondsRef.current = maxSeconds;
  }, [maxSeconds]);
  useEffect(() => {
    usedSecondsRef.current = usedSeconds;
  }, [usedSeconds]);

  const timingIntervalsRef = React.useRef<{ local?: NodeJS.Timeout; server?: NodeJS.Timeout }>({});

  // 1分钟体验用户时长计时及与 Cloudflare D1 数据库双向心跳同步机制
  useEffect(() => {
    if (!isAuthenticated) return;
    const email = localStorage.getItem('ai_novel_studio_user_email') || '';
    const normalized = email.trim().toLowerCase();
    
    let isMounted = true;

    const checkAdminAndSetup = async () => {
        const email = localStorage.getItem('ai_novel_studio_user_email') || '';
        if (!email) return;
        
        // Fetch from the backend
        let isAdmin = false;
        try {
            const apiURL = localStorage.getItem('ai_novel_studio_cloud_api_url_userdatas') || 
                           (import.meta as any).env.VITE_CLOUD_API_URL || '';
            const fetchBase = apiURL ? apiURL.replace(/\/$/, '') : '';
            
            const savedKey = localStorage.getItem('ai_novel_studio_cloud_api_key') || '';
            const adminKeyQuery = savedKey.trim() ? `&admin_key=${encodeURIComponent(savedKey.trim())}` : '';

            const res = await fetch(`${fetchBase}/api/auth/check-admin?account=${encodeURIComponent(email.trim())}${adminKeyQuery}`);
            if (res.ok) {
              const data = await res.json();
              isAdmin = data.isAdmin;
            }
        } catch (e: any) {
            console.warn('Admin check error:', e.message);
        }
        
        if (!isMounted) return;

        // Only limited if NOT an admin
        const isLimited = !isAdmin;
        setIsLimitedUser(isLimited);
        setIsAdminUser(isAdmin);

        if (isLimited) {
          const storedLocalSeconds = parseInt(localStorage.getItem(`ai_novel_studio_used_seconds_${normalized}`) || '0', 10);
          setUsedSeconds(storedLocalSeconds);
    
          // 与 Cloudflare 注册的 D1 后端进行心跳和限制拉取
          const syncWithServer = async (incrementAmt: number) => {
            if (!isMounted) return;
            try {
              const apiURL = (localStorage.getItem('ai_novel_studio_cloud_api_url_userdatas') || (import.meta as any).env.VITE_CLOUD_API_URL || '').trim();
              
              const fetchBase = apiURL ? apiURL.replace(/\/$/, '') : '';
              let res = await fetch(`${fetchBase}/api/auth/sync-time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalized, increment: incrementAmt })
              });

              if (!res.ok) {
                res = await fetch(`${fetchBase}/api/auth/heartbeat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: normalized, increment: incrementAmt })
                });
              }

              if (res.ok && isMounted) {
                const data = await res.json();
                if (data.success) {
                  const serverUsed = Number(data.used_seconds);
                  const serverMax = Number(data.max_seconds);
                  setMaxSeconds(serverMax);
                  maxSecondsRef.current = serverMax;
                  
                  // 只有当服务器返回的时间与本地时间偏差较大时才强制覆盖，避免心跳导致 UI 抖动
                  if (Math.abs(serverUsed - usedSecondsRef.current) > 3) {
                      setUsedSeconds(serverUsed);
                      localStorage.setItem(`ai_novel_studio_used_seconds_${normalized}`, String(serverUsed));
                  }

                  // 如果已超时
                  if (data.expired || serverUsed >= serverMax) {
                    localStorage.removeItem('ai_novel_studio_auth_logged_in');
                    localStorage.setItem('ai_novel_studio_timeout_active', 'true');
                    localStorage.setItem('ai_novel_studio_timeout_email', email);
                    localStorage.setItem('ai_novel_studio_timeout_used', String(serverUsed));
                    localStorage.setItem('ai_novel_studio_timeout_max', String(serverMax));
                    setIsAuthenticated(false);
                  }
                }
              }
            } catch (e: any) {
              console.warn('体验计时心跳同步异常:', e.message);
            }
          };

          // 页面首次挂载时触发同步一次
          await syncWithServer(0); 
          if (!isMounted) return;

          // 确保旧计时器已清除
          if (timingIntervalsRef.current.local) clearInterval(timingIntervalsRef.current.local);
          if (timingIntervalsRef.current.server) clearInterval(timingIntervalsRef.current.server);

          // 每 1 秒顺滑递增本地计数，但以服务器下发数据为基准
          timingIntervalsRef.current.local = setInterval(() => {
            setUsedSeconds((prev) => {
              const next = prev + 1;
              localStorage.setItem(`ai_novel_studio_used_seconds_${normalized}`, String(next));
              
              if (next >= maxSecondsRef.current) {
                if (timingIntervalsRef.current.local) clearInterval(timingIntervalsRef.current.local);
                localStorage.removeItem('ai_novel_studio_auth_logged_in');
                localStorage.setItem('ai_novel_studio_timeout_active', 'true');
                localStorage.setItem('ai_novel_studio_timeout_email', email);
                localStorage.setItem('ai_novel_studio_timeout_used', String(next));
                localStorage.setItem('ai_novel_studio_timeout_max', String(maxSecondsRef.current));
                setIsAuthenticated(false);
              }
              return next;
            });
          }, 1000);

          // 每 5 秒对 D1 数据库执行一次物理递增与时长同步
          timingIntervalsRef.current.server = setInterval(() => {
            syncWithServer(5);
          }, 5000);

        }
    };
    checkAdminAndSetup();
    
    return () => {
      isMounted = false;
      if (timingIntervalsRef.current.local) clearInterval(timingIntervalsRef.current.local);
      if (timingIntervalsRef.current.server) clearInterval(timingIntervalsRef.current.server);
      timingIntervalsRef.current = {};
    };
  }, [isAuthenticated]);
  const checkAiConfigured = (): boolean => {
    const apiKey = localStorage.getItem('ai_novel_studio_apikey') || '';
    const model = localStorage.getItem('ai_novel_studio_model') || '';
    if (!apiKey.trim() || !model.trim()) {
      setShowConfigWarning(true);
      return false;
    }
    return true;
  };

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('ai_novel_studio_novels_v1', JSON.stringify(novels));
  }, [novels]);

  useEffect(() => {
    if (currentNovelId) {
      localStorage.setItem('ai_novel_studio_current_novel_id', currentNovelId);
    }
  }, [currentNovelId]);

  useEffect(() => {
    if (activeTab) {
      if (activeTab === 'admin') {
        const email = localStorage.getItem('ai_novel_studio_user_email') || '';
        const normalized = email.trim().toLowerCase();
        const isEmailUser = normalized.includes('@') || localStorage.getItem(`ai_novel_studio_login_type_${normalized}`) === 'email_limited';
        if (isEmailUser) {
          setActiveTab('apikeys');
          return;
        }
      }
      localStorage.setItem('ai_novel_studio_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedChapterId) {
      localStorage.setItem('ai_novel_studio_selected_chapter_id', selectedChapterId);
    }
  }, [selectedChapterId]);

  const currentNovel = novels.find((n) => n.id === currentNovelId) || novels[0];

  const handleLogout = () => {
    localStorage.removeItem('ai_novel_studio_auth_logged_in');
    setIsAuthenticated(false);
  };

  return (
    <DevToolsGuard>
      {!isAuthenticated ? (
        <LoginView 
          onLoginSuccess={() => setIsAuthenticated(true)} 
          onOpenUsageGuide={() => setShowUsageGuideModal(true)} 
        />
      ) : (
        <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-white">
          <Navbar
            currentNovel={currentNovel}
            allNovels={novels}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenApiKey={() => setActiveTab('apikeys')}
            onToggleGeneralChat={() => setIsGeneralChatOpen(!isGeneralChatOpen)}
            onLogout={handleLogout}
            onOpenUsageGuide={() => setShowUsageGuideModal(true)}
            isLimitedUser={isLimitedUser}
            isAdminUser={isAdminUser}
            maxSeconds={maxSeconds}
            usedSeconds={usedSeconds}
          />

          <main className="flex-1 pb-16">
        {activeTab === 'admin' && (
          <AdminSettingsView setActiveTab={setActiveTab} />
        )}

        {activeTab === 'apikeys' && (
          <ApiKeyModal setActiveTab={setActiveTab} />
        )}

        {activeTab === 'buyer_reply' && (
          <BuyerReplyView onOpenApiKey={() => setActiveTab('apikeys')} />
        )}
        <GeneralChat isOpen={isGeneralChatOpen} onClose={() => setIsGeneralChatOpen(false)} />
      </main>

      </div>
      )}

      <UsageGuideModal
        isOpen={showUsageGuideModal}
        onClose={() => setShowUsageGuideModal(false)}
      />

      {showConfigWarning && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-stone-900">⚠️ AI 配置未完成</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                您必须配置自己的 <strong>Gemini API Key</strong> 并选择一个 <strong>全局模型</strong> 才能进行 AI 智能创作。
              </p>
              <p className="text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-left leading-relaxed">
                本程序不提供任何收费的内置或共享模型，从而 100% 保护您的创作内容隐私、数据安全，以及防止 API 密钥额度流失。
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfigWarning(false);
                  setActiveTab('apikeys');
                }}
                className="w-full px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                立即配置密钥与选择模型
              </button>
              <button
                onClick={() => setShowConfigWarning(false)}
                className="w-full px-4 py-2 text-stone-500 hover:text-stone-800 text-xs font-semibold cursor-pointer"
              >
                暂不配置
              </button>
            </div>
          </div>
        </div>
      )}
    </DevToolsGuard>
  );
}

