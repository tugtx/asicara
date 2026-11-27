import React, { useEffect, useState } from 'react';
import { ShieldAlert, RotateCw } from 'lucide-react';

interface DevToolsGuardProps {
  children: React.ReactNode;
}

export const DevToolsGuard: React.FC<DevToolsGuardProps> = ({ children }) => {
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    const blockEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const code = (e.code || '').toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. Block F12
      if (key === 'f12' || code === 'f12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 2. Block Chrome / Edge / Firefox DevTools shortcuts:
      // Ctrl+Shift+I / J / C / K / E, Cmd+Shift+I / J / C / K / E
      if (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c', 'k', 'e'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 3. Block macOS Chrome / Edge / Safari DevTools shortcuts:
      // Cmd+Option+I / J / C / U (or Ctrl+Alt+...)
      if (isCtrlOrMeta && e.altKey && ['i', 'j', 'c', 'u'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 4. Block View Source (Ctrl/Cmd+U) and Save Page (Ctrl/Cmd+S)
      if (isCtrlOrMeta && !e.shiftKey && !e.altKey && (key === 'u' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const captureOpts: AddEventListenerOptions = { capture: true };
    window.addEventListener('contextmenu', blockEvent, captureOpts);
    document.addEventListener('contextmenu', blockEvent, captureOpts);
    window.addEventListener('keydown', handleKeyDown, captureOpts);
    document.addEventListener('keydown', handleKeyDown, captureOpts);

    // Active DevTools detection in standalone top-level browser windows
    let timer: ReturnType<typeof setInterval> | null = null;
    const isStandaloneWindow = (() => {
      try {
        return window.self === window.top;
      } catch {
        return false;
      }
    })();

    if (isStandaloneWindow) {
      const checkDebugger = () => {
        try {
          const start = performance.now();
          // eslint-disable-next-line no-new-func
          new Function('debugger')();
          const elapsed = performance.now() - start;
          if (elapsed > 80) {
            setDevToolsOpen(true);
          } else {
            setDevToolsOpen(false);
          }
        } catch {
          // Ignore CSP or restricted eval environments cleanly
        }
      };

      checkDebugger();
      timer = setInterval(checkDebugger, 1000);
    }

    return () => {
      window.removeEventListener('contextmenu', blockEvent, captureOpts);
      document.removeEventListener('contextmenu', blockEvent, captureOpts);
      window.removeEventListener('keydown', handleKeyDown, captureOpts);
      document.removeEventListener('keydown', handleKeyDown, captureOpts);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (devToolsOpen) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-7 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white">已禁止打开检查界面</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              当前页面已开启调试防护，检测到浏览器开发者工具处于打开状态，页面内容已暂时隐藏。请关闭开发者工具后恢复使用。
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            我已关闭，刷新页面
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
