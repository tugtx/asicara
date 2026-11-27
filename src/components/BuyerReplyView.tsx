import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareReply,
  Copy,
  Check,
  Send,
  RefreshCw,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  ArrowRight,
  SlidersHorizontal,
  ShieldAlert,
  Pencil,
  Key,
  ArrowLeftRight,
  MessagesSquare,
  FileText,
  Gauge,
  X,
} from 'lucide-react';
import {
  apiConsultationReply,
  BuyerReplyHistoryItem,
  BuyerReplyOption,
} from '../lib/aiClient';
import { getAiConfig } from '../lib/aiConfig';

interface BuyerReplyViewProps {
  onOpenApiKey?: () => void;
}

interface CategoryPreset {
  id: string;
  label: string;
  myRole: string;
  otherRole: string;
  platforms: string[];
  scenarios: string[];
  tones: string[];
  bgPlaceholder: string;
  goalPlaceholder: string;
  msgPlaceholder: string;
}

const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: 'shopping_buyer',
    label: '购物 · 我是买家',
    myRole: '买家',
    otherRole: '卖家',
    platforms: ['闲鱼/二手交易', '淘宝/拼多多', '微信/私域沟通', '线下/批发询价', '通用网购'],
    scenarios: ['礼貌砍价/议价', '询问细节/验货', '防坑确认/留证', '催发货/问物流', '售后退换/维权', '婉拒/再考虑'],
    tones: ['高情商温和', '真诚爽快', '理性客观', '坚定不吃亏', '委婉客气'],
    bgPlaceholder: '如：闲鱼二手 Sony 镜头，挂价 2600 元',
    goalPlaceholder: '如：想砍价到 2350 包邮，并让他拍一段对焦和镜片视频确认无划痕',
    msgPlaceholder: '粘贴卖家的发言，例如：“亲，这台最低 380 不包邮，二手物品售出不退不换哦”...',
  },
  {
    id: 'shopping_seller',
    label: '客服 · 我是卖家',
    myRole: '卖家 / 客服',
    otherRole: '买家 / 顾客',
    platforms: ['淘宝/天猫/拼多多', '闲鱼个人卖家', '抖音/小红书店铺', '微信私域成交'],
    scenarios: ['接待促成交', '礼貌拒绝大刀', '解释发货/物流延迟', '安抚差评/情绪', '协商退换货/补偿'],
    tones: ['热情周到', '真诚耐心', '专业可靠', '温和守底线', '简洁利落'],
    bgPlaceholder: '如：店铺爆款连衣裙 199 元，买家嫌贵或要求退差价',
    goalPlaceholder: '如：稳住客户情绪，解释品质优势并给一张 10 元小额优惠券促成下单',
    msgPlaceholder: '粘贴买家发来的消息，例如：“别的店才卖 150，你们太贵了，不便宜点不买了”...',
  },
  {
    id: 'workplace',
    label: '职场 · 领导/同事',
    myRole: '下属 / 同事',
    otherRole: '领导 / 同事',
    platforms: ['企业微信/钉钉/飞书', '微信工作群/私聊', '正式邮件', '当面沟通话术'],
    scenarios: ['汇报进度/结果', '礼貌拒绝额外甩锅', '跨部门催促协作', '沟通请假/调休', '回应批评/突发问题'],
    tones: ['不卑不亢', '专业稳重', '委婉高情商', '清晰果断', '诚恳担当'],
    bgPlaceholder: '如：手头已有 3 个紧急上线项目，邻组又临时丢来一份大报表',
    goalPlaceholder: '如：既不得罪对方，又明确表达本周排期已满，建议走排期或让领导定优先级',
    msgPlaceholder: '粘贴领导或同事的消息，例如：“这个需求很急，麻烦你今天下班前顺手一起做完发我一下”...',
  },
  {
    id: 'business',
    label: '商务 · 客户/甲方乙方',
    myRole: '服务方 / 乙方',
    otherRole: '客户 / 甲方',
    platforms: ['微信商务沟通', '邮件往来', '企业微信', '商务面谈'],
    scenarios: ['婉拒免费加需求', '专业报价/谈预算', '礼貌催款/回款', '解释项目延期', '推进签约落地'],
    tones: ['专业得体', '不卑不亢', '共赢合作', '坚定有边界', '简洁商务'],
    bgPlaceholder: '如：网站开发合同金额 3 万元，客户临时要求额外做一套小程序',
    goalPlaceholder: '如：肯定客户想法，但明确该功能不在原合同范围内，需要单独补充报价和工期',
    msgPlaceholder: '粘贴甲方或客户的话，例如：“顺便帮我们加个会员积分商城吧，应该很简单，就不另算钱了”...',
  },
  {
    id: 'job_hunting',
    label: '求职 · HR/面试官',
    myRole: '求职者 / 候选人',
    otherRole: 'HR / 面试官',
    platforms: ['BOSS直聘/猎聘', '微信沟通', '正式邮件', '电话/面试沟通'],
    scenarios: ['沟通谈薪/争取待遇', '礼貌追问面试结果', '高情商婉拒 Offer', '回应压薪/质疑空窗期', '协商入职时间'],
    tones: ['自信真诚', '不卑不亢', '专业得体', '委婉礼貌', '坚定守底线'],
    bgPlaceholder: '如：收到复试通过通知，但 HR 开出的薪资比期望低了 2000',
    goalPlaceholder: '如：表达很认可公司平台，但结合自身过往项目价值希望能争取到期望月薪',
    msgPlaceholder: '粘贴 HR 的发言，例如：“你的背景挺合适的，不过咱们这个岗位预算有限，目前只能给到 12k”...',
  },
  {
    id: 'renting',
    label: '租房 · 房东/中介/物业',
    myRole: '租客 / 业主',
    otherRole: '房东 / 中介 / 物业',
    platforms: ['微信私聊', '闲鱼/租房平台', '电话沟通/短信留证'],
    scenarios: ['租房砍价/免杂费', '设备报修催办', '退租退押金维权', '合同/水电条款确认', '拒绝不合理涨价'],
    tones: ['有理有据', '温和坚定', '硬气维权', '好商量套近乎'],
    bgPlaceholder: '如：退租打扫干净了，房东以墙面有正常使用痕迹想扣 800 押金',
    goalPlaceholder: '如：指出属于正常损耗并有入住视频为证，要求全额退还押金',
    msgPlaceholder: '粘贴房东或中介的话，例如：“房子住了这么久有折旧和卫生费，押金要扣 800 块”...',
  },
  {
    id: 'social',
    label: '社交 · 亲友/人情/情感',
    myRole: '本人',
    otherRole: '亲戚 / 朋友 / 对方',
    platforms: ['微信私聊', '家族/朋友群', '短信/相亲聊天'],
    scenarios: ['婉拒借钱/帮忙', '回应催婚/打听隐私', '化解尴尬场面', '礼貌拒绝邀约', '高情商破冰/拉近距离'],
    tones: ['高情商幽默', '委婉不得罪人', '真诚客气', '礼貌划清界限', '轻松自然'],
    bgPlaceholder: '如：不太熟的远房亲戚突然发微信说要借 5000 元周转',
    goalPlaceholder: '如：体面拒绝借钱，用自身也有房贷/定期理财等合理理由不伤和气',
    msgPlaceholder: '粘贴对方发来的话，例如：“最近手头有点紧，方不方便先借我 5000 块钱应急，下个月发工资就还”...',
  },
  {
    id: 'rights',
    label: '维权 · 官方客服/学校/机构',
    myRole: '消费者 / 家长 / 当事人',
    otherRole: '客服 / 老师 / 机构人员',
    platforms: ['平台官方客服', '家校微信沟通', '投诉/申诉渠道', '机构售后'],
    scenarios: ['强硬投诉施压', '家校客观沟通', '退费/索赔协商', '要求升级专员处理', '留存书面凭证'],
    tones: ['理性冷静', '坚定有理有据', '客气但有原则', '严肃施压'],
    bgPlaceholder: '如：健身房/教培机构拖延退费，客服一直在踢皮球',
    goalPlaceholder: '如：要求对方给出明确退费时间节点，否则保留向 12315 投诉的权利',
    msgPlaceholder: '粘贴对方的话，例如：“不好意思让您久等了，退费流程还在财务审核中，具体时间没法保证呢”...',
  },
  {
    id: 'custom',
    label: '自定义场景',
    myRole: '我方',
    otherRole: '对方',
    platforms: ['微信/即时通讯', '工作沟通软件', '邮件/正式函件', '平台聊天窗口', '线下对话'],
    scenarios: ['得体回应', '礼貌拒绝', '争取利益/讲价', '核实细节/防坑', '催促推进', '缓和矛盾/安抚'],
    tones: ['高情商温和', '理性专业', '不卑不亢', '幽默化解', '简短直接', '硬气坚定'],
    bgPlaceholder: '填写你们当前沟通的事项背景（任何场景都可以）',
    goalPlaceholder: '填写你想让 AI 帮你达成什么沟通效果',
    msgPlaceholder: '把对方发来的任何文字粘贴到这里...',
  },
];

interface QuickExample {
  label: string;
  categoryId: string;
  myRole: string;
  otherRole: string;
  platform: string;
  scenario: string;
  tone: string;
  backgroundInfo: string;
  myGoal: string;
  history: BuyerReplyHistoryItem[];
  otherMessage: string;
}

const formatNowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const QUICK_EXAMPLES: QuickExample[] = [
  {
    label: '闲鱼砍价',
    categoryId: 'shopping_buyer',
    myRole: '买家',
    otherRole: '卖家',
    platform: '闲鱼/二手交易',
    scenario: '礼貌砍价/议价',
    tone: '真诚爽快',
    backgroundInfo: '二手微单相机，卖家挂价 3200 元',
    myGoal: '想砍到 2900 包顺丰，并且确认没有拆修进灰',
    history: [
      { id: 'ex1-1', role: 'me', content: '老板你好，这台相机快门数大概多少？镜头有霉点或拆修过吗？', timestamp: '14:10' },
      { id: 'ex1-2', role: 'other', content: '快门才 3000 多，女生自用一手机，没拆没修，箱说发票都在。', timestamp: '14:12' },
    ],
    otherMessage: '亲，这台最低 3150 不包邮哦，成色很好的，挂这个价已经亏很多了，不刀了哈。',
  },
  {
    label: '婉拒领导加活',
    categoryId: 'workplace',
    myRole: '下属',
    otherRole: '部门领导',
    platform: '企业微信/钉钉/飞书',
    scenario: '礼貌拒绝额外甩锅',
    tone: '不卑不亢',
    backgroundInfo: '手上已有两个今晚要上线的高优项目',
    myGoal: '说明当前工作饱和度，请领导帮忙协调优先级或延后到明天',
    history: [
      { id: 'ex2-1', role: 'other', content: '今天版本发布的两块联调搞定了吗？', timestamp: '17:20' },
      { id: 'ex2-2', role: 'me', content: '正在跑回归测试，预计今晚 8 点前能完成上线。', timestamp: '17:23' },
    ],
    otherMessage: '这个季度复盘 PPT 比较急，我看你平时写得不错，今晚辛苦顺手一起赶出来发我吧。',
  },
  {
    label: 'HR谈薪回应',
    categoryId: 'job_hunting',
    myRole: '求职者',
    otherRole: 'HR',
    platform: '微信沟通',
    scenario: '沟通谈薪/争取待遇',
    tone: '自信真诚',
    backgroundInfo: '面试全部通过，期望 16k，HR 压价到 13k',
    myGoal: '礼貌表达对岗位的看重，结合经验争取至少 15k 或其他补贴',
    history: [
      { id: 'ex3-1', role: 'other', content: '恭喜你呀，技术总监和业务负责人反馈都很好，准备给你发 Offer 了。', timestamp: '10:30' },
      { id: 'ex3-2', role: 'me', content: '谢谢，我也非常认可团队的业务方向，期待后续合作。', timestamp: '10:33' },
    ],
    otherMessage: '不过咱们今年定薪比较严格，这个级别最高只能给到 13k，你看能接受吗？',
  },
  {
    label: '房东扣押金',
    categoryId: 'renting',
    myRole: '租客',
    otherRole: '房东',
    platform: '微信私聊',
    scenario: '退租退押金维权',
    tone: '硬气维权',
    backgroundInfo: '租期已满，房间打扫干净，入住前已拍视频留底',
    myGoal: '拒绝不合理扣款，要求退还全额 2000 元押金',
    history: [
      { id: 'ex4-1', role: 'me', content: '房东您好，钥匙已放门口密码盒，全屋打扫好并拍了视频发您，水电也结清了。', timestamp: '15:02' },
    ],
    otherMessage: '我看墙边有一点划痕，厨房也要深度保洁，押金就扣 600 块，剩下的 1400 转给你行吧。',
  },
  {
    label: '婉拒亲友借钱',
    categoryId: 'social',
    myRole: '本人',
    otherRole: '不太熟的亲戚',
    platform: '微信私聊',
    scenario: '婉拒借钱/帮忙',
    tone: '委婉不得罪人',
    backgroundInfo: '平时很少联系，突然开口借 8000 元',
    myGoal: '坚决不借，同时语气客气留面子，避免后续纠缠',
    history: [
      { id: 'ex5-1', role: 'other', content: '在忙吗？最近工作怎么样呀？', timestamp: '19:40' },
      { id: 'ex5-2', role: 'me', content: '刚下班呢，还好还好，您最近身体怎么样？', timestamp: '19:45' },
    ],
    otherMessage: '老表，最近手头周转不过来，先借我 8000 块应个急，过两个月肯定还你！',
  },
  {
    label: '拒甲方免费加需求',
    categoryId: 'business',
    myRole: '乙方项目负责人',
    otherRole: '甲方客户',
    platform: '微信商务沟通',
    scenario: '婉拒免费加需求',
    tone: '专业得体',
    backgroundInfo: '品牌官网设计项目尾款未结，客户临时要加一套 H5 活动页',
    myGoal: '肯定需求价值，但明确需按二期单独报价，不影响一期验收付款',
    history: [
      { id: 'ex6-1', role: 'me', content: '张总，官网一期所有页面已全部上线验收完毕，麻烦安排一下尾款流程。', timestamp: '11:10' },
    ],
    otherMessage: '顺便帮我们把下周活动用的 H5 页面也做一下呗，都是老合作了，应该不费事。',
  },
];

interface ConsultationSession {
  id: string;
  title: string;
  categoryId: string;
  myRole: string;
  otherRole: string;
  backgroundInfo: string;
  platform: string;
  scenario: string;
  tone: string;
  myGoal: string;
  otherMessage: string;
  history: BuyerReplyHistoryItem[];
  analysis: string;
  analysisConfidence?: number;
  confidenceReason?: string;
  replies: BuyerReplyOption[];
  modelUsed?: string;
  updatedAt: string;
}

const STORAGE_KEY = 'ai_novel_studio_buyer_sessions_v1';

const createEmptySession = (presetId: string = 'shopping_buyer'): ConsultationSession => {
  const preset = CATEGORY_PRESETS.find((c) => c.id === presetId) || CATEGORY_PRESETS[0];
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '新咨询会话',
    categoryId: preset.id,
    myRole: preset.myRole,
    otherRole: preset.otherRole,
    backgroundInfo: '',
    platform: preset.platforms[0],
    scenario: preset.scenarios[0],
    tone: preset.tones[0],
    myGoal: '',
    otherMessage: '',
    history: [],
    analysis: '',
    analysisConfidence: undefined,
    confidenceReason: '',
    replies: [],
    updatedAt: new Date().toISOString(),
  };
};

const normalizeStoredSession = (raw: any): ConsultationSession => {
  const preset = CATEGORY_PRESETS.find((c) => c.id === raw?.categoryId) || CATEGORY_PRESETS[0];
  return {
    id: raw?.id || `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: raw?.title || '新咨询会话',
    categoryId: raw?.categoryId || preset.id,
    myRole: raw?.myRole || preset.myRole,
    otherRole: raw?.otherRole || preset.otherRole,
    backgroundInfo: raw?.backgroundInfo ?? raw?.productInfo ?? '',
    platform: raw?.platform || preset.platforms[0],
    scenario: raw?.scenario || preset.scenarios[0],
    tone: raw?.tone || preset.tones[0],
    myGoal: raw?.myGoal ?? raw?.buyerGoal ?? '',
    otherMessage: raw?.otherMessage ?? raw?.sellerMessage ?? '',
    history: Array.isArray(raw?.history)
      ? raw.history.map((h: any, i: number) => ({
          id: h?.id || `msg-${i}-${Date.now()}`,
          role: h?.role || 'other',
          content: String(h?.content || ''),
          timestamp: h?.timestamp || '',
        }))
      : [],
    analysis: raw?.analysis ?? raw?.sellerAnalysis ?? '',
    analysisConfidence: typeof raw?.analysisConfidence === 'number' ? raw.analysisConfidence : undefined,
    confidenceReason: raw?.confidenceReason || '',
    replies: Array.isArray(raw?.replies) ? raw.replies : [],
    modelUsed: raw?.modelUsed,
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  };
};

const getConfidenceColors = (score: number) => {
  if (score >= 85) {
    return {
      text: 'text-emerald-700',
      darkText: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: '高把握度',
    };
  }
  if (score >= 65) {
    return {
      text: 'text-amber-700',
      darkText: 'text-amber-400',
      bar: 'bg-amber-500',
      label: '中高把握',
    };
  }
  return {
    text: 'text-stone-600',
    darkText: 'text-stone-300',
    bar: 'bg-stone-400',
    label: '参考建议',
  };
};

export const BuyerReplyView: React.FC<BuyerReplyViewProps> = ({ onOpenApiKey }) => {
  const [sessions, setSessions] = useState<ConsultationSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeStoredSession);
        }
      }
    } catch {}
    return [createEmptySession('shopping_buyer')];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const currentPreset =
    CATEGORY_PRESETS.find((c) => c.id === activeSession.categoryId) || CATEGORY_PRESETS[0];

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedHistory, setCopiedHistory] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [customRefine, setCustomRefine] = useState('');
  const [adoptedNotice, setAdoptedNotice] = useState('');

  // Chat log manual entry & batch import states
  const [manualRole, setManualRole] = useState<'other' | 'me'>('other');
  const [manualMsgInput, setManualMsgInput] = useState('');
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchImportText, setBatchImportText] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [activeSession.history.length]);

  const updateActiveSession = (partial: Partial<ConsultationSession>) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, ...partial, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handleSelectCategory = (preset: CategoryPreset) => {
    updateActiveSession({
      categoryId: preset.id,
      myRole: preset.myRole,
      otherRole: preset.otherRole,
      platform: preset.platforms[0],
      scenario: preset.scenarios[0],
      tone: preset.tones[0],
    });
  };

  const handleSwapRoles = () => {
    updateActiveSession({
      myRole: activeSession.otherRole,
      otherRole: activeSession.myRole,
    });
  };

  const handleCreateSession = () => {
    const fresh = createEmptySession(activeSession.categoryId);
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setErrorMsg('');
    setAdoptedNotice('');
    setEditingIndex(null);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      const fresh = createEmptySession('shopping_buyer');
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeSession.id === id) {
      setActiveSessionId(next[0].id);
    }
  };

  const handleApplyExample = (ex: QuickExample) => {
    updateActiveSession({
      title: ex.label,
      categoryId: ex.categoryId,
      myRole: ex.myRole,
      otherRole: ex.otherRole,
      platform: ex.platform,
      scenario: ex.scenario,
      tone: ex.tone,
      backgroundInfo: ex.backgroundInfo,
      myGoal: ex.myGoal,
      history: ex.history,
      otherMessage: ex.otherMessage,
      replies: [],
      analysis: '',
      analysisConfidence: undefined,
      confidenceReason: '',
    });
    setErrorMsg('');
    setAdoptedNotice('');
  };

  const handleAddManualHistory = () => {
    const text = manualMsgInput.trim();
    if (!text) return;
    const item: BuyerReplyHistoryItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role: manualRole,
      content: text,
      timestamp: formatNowTime(),
    };
    updateActiveSession({
      history: [...activeSession.history, item],
    });
    setManualMsgInput('');
  };

  const handleBatchImportHistory = () => {
    const lines = batchImportText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const myKeywords = ['我', '本人', '买家', '下属', '租客', '求职者', '乙方', activeSession.myRole]
      .filter(Boolean)
      .map((k) => k.toLowerCase());
    const otherKeywords = ['对方', '卖家', '客服', '领导', '同事', '房东', '中介', 'hr', '甲方', activeSession.otherRole]
      .filter(Boolean)
      .map((k) => k.toLowerCase());

    const imported: BuyerReplyHistoryItem[] = [];
    const now = formatNowTime();

    for (const line of lines) {
      let role: 'me' | 'other' = 'other';
      let content = line;
      const colonIdx = line.search(/[:：]/);
      if (colonIdx > 0 && colonIdx <= 18) {
        const prefix = line.slice(0, colonIdx).trim().toLowerCase();
        const rest = line.slice(colonIdx + 1).trim();
        if (rest) {
          if (myKeywords.some((k) => prefix.includes(k))) {
            role = 'me';
            content = rest;
          } else if (otherKeywords.some((k) => prefix.includes(k))) {
            role = 'other';
            content = rest;
          }
        }
      }
      imported.push({
        id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        content,
        timestamp: now,
      });
    }

    updateActiveSession({
      history: [...activeSession.history, ...imported],
    });
    setBatchImportText('');
    setShowBatchImport(false);
  };

  const handleDeleteHistoryItem = (idx: number) => {
    updateActiveSession({
      history: activeSession.history.filter((_, i) => i !== idx),
    });
  };

  const handleCopyFullHistory = async () => {
    if (activeSession.history.length === 0) return;
    const text = activeSession.history
      .map((item) => {
        const isMe = item.role === 'me' || item.role === 'buyer';
        const speaker = isMe
          ? `我（${activeSession.myRole || '我方'}）`
          : `对方（${activeSession.otherRole || '对方'}）`;
        return `${item.timestamp ? `[${item.timestamp}] ` : ''}${speaker}：${item.content}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHistory(true);
      setTimeout(() => setCopiedHistory(false), 1800);
    } catch {}
  };

  const handleLogCurrentOtherMessage = () => {
    const msg = activeSession.otherMessage.trim();
    if (!msg) return;
    const last = activeSession.history[activeSession.history.length - 1];
    if (last && (last.role === 'other' || last.role === 'seller') && last.content.trim() === msg) {
      return;
    }
    updateActiveSession({
      history: [
        ...activeSession.history,
        {
          id: `msg-${Date.now()}`,
          role: 'other',
          content: msg,
          timestamp: formatNowTime(),
        },
      ],
    });
  };

  const handleGenerate = async (refineInstruction?: string) => {
    const cleanOtherMsg = activeSession.otherMessage.trim();
    if (!cleanOtherMsg) {
      setErrorMsg('请先输入或粘贴对方发来的消息内容。');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setAdoptedNotice('');
    setEditingIndex(null);

    try {
      const aiCfg = getAiConfig();
      const res = await apiConsultationReply({
        apiKey: aiCfg.apiKey,
        model: aiCfg.model,
        customBaseUrl: aiCfg.customBaseUrl,
        useChatCompletions: aiCfg.useChatCompletions,
        selectedModels: aiCfg.selectedModels,
        category: currentPreset.label,
        myRole: activeSession.myRole,
        otherRole: activeSession.otherRole,
        otherMessage: cleanOtherMsg,
        backgroundInfo: activeSession.backgroundInfo,
        myGoal: activeSession.myGoal,
        platform: activeSession.platform,
        tone: activeSession.tone,
        scenario: activeSession.scenario,
        history: activeSession.history,
        refineInstruction,
        previousReplies: refineInstruction ? activeSession.replies : undefined,
      });

      if (res.success && Array.isArray(res.replies) && res.replies.length > 0) {
        const autoTitle =
          activeSession.title === '新咨询会话' || activeSession.title === '新购物咨询'
            ? (activeSession.backgroundInfo.trim() || `${activeSession.myRole}→${activeSession.otherRole}`).slice(0, 16)
            : activeSession.title;

        updateActiveSession({
          title: autoTitle,
          analysis: res.analysis || res.sellerAnalysis || '',
          analysisConfidence: typeof res.analysisConfidence === 'number' ? res.analysisConfidence : 82,
          confidenceReason: res.confidenceReason || '',
          replies: res.replies,
          modelUsed: res.modelUsed,
        });
      } else {
        setErrorMsg(res.error || '生成失败，请检查模型配置或稍后再试。');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '请求模型服务异常，请重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReply = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1800);
    }
  };

  const handleAdoptAndContinue = (replyText: string) => {
    const otherMsg = activeSession.otherMessage.trim();
    const now = formatNowTime();
    const newEntries: BuyerReplyHistoryItem[] = [];
    const lastItem = activeSession.history[activeSession.history.length - 1];

    if (
      otherMsg &&
      !(lastItem && (lastItem.role === 'other' || lastItem.role === 'seller') && lastItem.content.trim() === otherMsg)
    ) {
      newEntries.push({
        id: `msg-other-${Date.now()}`,
        role: 'other',
        content: otherMsg,
        timestamp: now,
      });
    }
    if (replyText.trim()) {
      newEntries.push({
        id: `msg-me-${Date.now() + 1}`,
        role: 'me',
        content: replyText.trim(),
        timestamp: now,
      });
    }

    updateActiveSession({
      history: [...activeSession.history, ...newEntries],
      otherMessage: '',
      myGoal: '',
    });
    setAdoptedNotice('已将该轮对话存入聊天记录！您可以直接在左侧粘贴对方下一句回复继续生成。');
  };

  const handleClearHistory = () => {
    updateActiveSession({
      history: [],
      replies: [],
      analysis: '',
      analysisConfidence: undefined,
      confidenceReason: '',
      otherMessage: '',
      myGoal: '',
      title: '新咨询会话',
    });
    setAdoptedNotice('');
    setErrorMsg('');
  };

  const handleEditReplyContent = (idx: number, newContent: string) => {
    const nextReplies = activeSession.replies.map((r, i) =>
      i === idx ? { ...r, content: newContent } : r
    );
    updateActiveSession({ replies: nextReplies });
  };

  const analysisConfScore = activeSession.analysisConfidence;
  const analysisConfStyle =
    typeof analysisConfScore === 'number' ? getConfidenceColors(analysisConfScore) : null;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Page Title Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
            <MessageSquareReply className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              全场景智能咨询回复助手
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              支持购物买卖、客服、职场、商务、求职、租房、社交、维权与自定义角色；实时记录聊天上下文并输出方案置信度评估
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCreateSession}
            className="inline-flex items-center px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            新建咨询会话
          </button>
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center px-3.5 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-stone-500" />
            重置当前会话
          </button>
        </div>
      </div>

      {/* Category Type Selector Strip */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-stone-700">
            选择沟通场景类型（也可直接自定义双方身份）
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-stone-400 mr-1">快捷示例：</span>
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => handleApplyExample(ex)}
                className="px-2 py-1 rounded-md bg-stone-100 hover:bg-amber-50 hover:text-amber-800 text-stone-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_PRESETS.map((preset) => {
            const isActive = activeSession.categoryId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectCategory(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sessions.map((s) => {
          const isCurrent = s.id === activeSession.id;
          return (
            <div
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id);
                setErrorMsg('');
                setAdoptedNotice('');
              }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                isCurrent
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span className="max-w-[160px] truncate">{s.title || '新咨询会话'}</span>
              {s.history.length > 0 && (
                <span className="text-[11px] text-stone-400 tabular-nums">
                  {s.history.length}条记录
                </span>
              )}
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="p-0.5 rounded hover:bg-stone-200/70 text-stone-400 hover:text-stone-700"
                  title="删除会话"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles, Input & Controls (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-5">
          {/* Role Pair Editor */}
          <div className="grid grid-cols-11 gap-2 items-end">
            <div className="col-span-5">
              <label
                htmlFor="my-role-input"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                我的身份
              </label>
              <input
                id="my-role-input"
                type="text"
                value={activeSession.myRole}
                onChange={(e) => updateActiveSession({ myRole: e.target.value })}
                placeholder="如：买家 / 下属 / 租客"
                className="w-full px-3 py-2 text-sm font-medium text-stone-900 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="col-span-1 flex justify-center pb-1.5">
              <button
                type="button"
                onClick={handleSwapRoles}
                className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 cursor-pointer"
                title="互换双方身份"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="col-span-5">
              <label
                htmlFor="other-role-input"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                对方身份
              </label>
              <input
                id="other-role-input"
                type="text"
                value={activeSession.otherRole}
                onChange={(e) => updateActiveSession({ otherRole: e.target.value })}
                placeholder="如：卖家 / 领导 / 房东"
                className="w-full px-3 py-2 text-sm font-medium text-stone-900 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Chat History Log (Original Left-Column Position) */}
          <div className="space-y-2.5 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <MessagesSquare className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold text-stone-800">聊天记录</span>
                <span className="text-stone-400 tabular-nums">
                  · {activeSession.history.length} 条
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeSession.history.length >= 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = chatContainerRef.current;
                      if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-1.5 py-1 rounded-md text-[11px] text-stone-500 hover:text-stone-900 hover:bg-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                    title="滑到最早记录"
                  >
                    顶部
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBatchImport(!showBatchImport)}
                  className="inline-flex items-center px-2 py-1 rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  批量导入
                </button>
                {activeSession.history.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyFullHistory}
                      className="inline-flex items-center px-2 py-1 rounded-md border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedHistory ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-emerald-600" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveSession({ history: [] })}
                      className="px-1.5 py-1 rounded-md text-[11px] text-stone-500 hover:text-red-600 hover:bg-red-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      清空
                    </button>
                  </>
                )}
              </div>
            </div>

            {showBatchImport && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-700">
                    粘贴多行记录（如“{activeSession.otherRole || '对方'}：...” / “我：...”）
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBatchImport(false)}
                    className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={batchImportText}
                  onChange={(e) => setBatchImportText(e.target.value)}
                  rows={3}
                  placeholder={`${activeSession.otherRole || '对方'}：在吗，这周能定下来吗？\n${activeSession.myRole || '我'}：还在对比，能再优惠点吗？`}
                  className="w-full p-2 text-xs text-stone-900 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBatchImportHistory}
                    disabled={!batchImportText.trim()}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white text-xs font-semibold cursor-pointer"
                  >
                    解析并导入
                  </button>
                </div>
              </div>
            )}

            <div
              ref={chatContainerRef}
              className={`${
                activeSession.history.length > 0 ? 'min-h-[120px] max-h-[260px]' : ''
              } overflow-y-auto overscroll-contain space-y-2 p-2.5 pr-2 rounded-xl bg-stone-50 border border-stone-200/80 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-stone-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300 hover:[&::-webkit-scrollbar-thumb]:bg-stone-400 [&::-webkit-scrollbar-thumb]:rounded-full`}
            >
              {activeSession.history.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-3">
                  暂无聊天记录（可在下方手动录入，或生成回复后点击「采纳并存入聊天记录」）
                </p>
              ) : (
                activeSession.history.map((item, idx) => {
                  const isMe = item.role === 'me' || item.role === 'buyer';
                  return (
                    <div
                      key={item.id || idx}
                      className={`group text-xs leading-relaxed p-2.5 rounded-lg border ${
                        isMe
                          ? 'bg-amber-50/80 border-amber-200/80 text-stone-900 ml-4'
                          : 'bg-white border-stone-200 text-stone-800 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5 text-[11px] text-stone-500">
                        <span className="font-semibold text-stone-800">
                          {isMe
                            ? `我（${activeSession.myRole || '我方'}）`
                            : `${activeSession.otherRole || '对方'}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {item.timestamp && (
                            <span className="tabular-nums text-stone-400">{item.timestamp}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(idx)}
                            className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-opacity cursor-pointer"
                            title="删除此条记录"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{item.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center p-0.5 bg-stone-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setManualRole('other')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    manualRole === 'other'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {activeSession.otherRole || '对方'}说
                </button>
                <button
                  type="button"
                  onClick={() => setManualRole('me')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    manualRole === 'me'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  我说
                </button>
              </div>
              <input
                type="text"
                value={manualMsgInput}
                onChange={(e) => setManualMsgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualMsgInput.trim()) {
                    e.preventDefault();
                    handleAddManualHistory();
                  }
                }}
                placeholder="补充一条历史对话..."
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddManualHistory}
                disabled={!manualMsgInput.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                添加
              </button>
            </div>
          </div>

          {/* Other Party's Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="other-message-input"
                className="block text-sm font-semibold text-stone-900"
              >
                对方（{activeSession.otherRole || '对方'}）刚刚说了什么
              </label>
              {activeSession.otherMessage.trim() && (
                <button
                  type="button"
                  onClick={handleLogCurrentOtherMessage}
                  className="text-xs font-medium text-amber-700 hover:text-amber-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + 仅记入聊天记录
                </button>
              )}
            </div>
            <textarea
              id="other-message-input"
              value={activeSession.otherMessage}
              onChange={(e) => updateActiveSession({ otherMessage: e.target.value })}
              placeholder={currentPreset.msgPlaceholder}
              rows={4}
              className="w-full p-3.5 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:bg-white resize-y transition-colors"
            />
          </div>

          {/* Background Info & My Goal */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="background-info-input"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                事件 / 沟通背景（选填）
              </label>
              <input
                id="background-info-input"
                type="text"
                value={activeSession.backgroundInfo}
                onChange={(e) => updateActiveSession({ backgroundInfo: e.target.value })}
                placeholder={currentPreset.bgPlaceholder}
                className="w-full px-3 py-2 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="my-goal-input"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                我的核心诉求 / 想达成的效果（选填）
              </label>
              <textarea
                id="my-goal-input"
                value={activeSession.myGoal}
                onChange={(e) => updateActiveSession({ myGoal: e.target.value })}
                placeholder={currentPreset.goalPlaceholder}
                rows={2}
                className="w-full px-3 py-2 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:bg-white resize-y"
              />
            </div>
          </div>

          {/* Platform / Scenario / Tone */}
          <div className="space-y-4 pt-2 border-t border-stone-100">
            <div>
              <span className="block text-xs font-semibold text-stone-700 mb-2">
                沟通渠道 / 平台
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPreset.platforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateActiveSession({ platform: p })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSession.platform === p
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-stone-700 mb-2">
                回复目的
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPreset.scenarios.map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => updateActiveSession({ scenario: sc })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSession.scenario === sc
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-stone-700 mb-2">
                说话语气
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPreset.tones.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateActiveSession({ tone: t })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeSession.tone === t
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                        : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={isGenerating || !activeSession.otherMessage.trim()}
            className="w-full py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在以「{activeSession.myRole || '我方'}」身份生成回复...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>生成「{activeSession.myRole || '我方'}」回复话术</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Results with Confidence (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {adoptedNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
              <span>{adoptedNotice}</span>
              <button
                type="button"
                onClick={() => setAdoptedNotice('')}
                className="text-emerald-700 hover:text-emerald-900 underline shrink-0 cursor-pointer"
              >
                知道了
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">无法生成话术</p>
                  <p className="text-xs text-red-800 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              {onOpenApiKey && (
                <button
                  type="button"
                  onClick={onOpenApiKey}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-100 text-red-700 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 mr-1" />
                  去配置模型
                </button>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-4">
              <div className="flex items-center gap-3 text-stone-700">
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                <span className="text-sm font-semibold">
                  正在结合聊天记录分析对方意图并评估各回复方案置信度...
                </span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="h-16 bg-stone-100 rounded-xl" />
                <div className="h-24 bg-stone-100 rounded-xl" />
                <div className="h-24 bg-stone-100 rounded-xl" />
              </div>
            </div>
          )}

          {!isGenerating && activeSession.replies.length === 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
                <MessageSquareReply className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-sm font-bold text-stone-900">
                  等待生成回复话术与置信度评估
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  在左侧粘贴对方最新消息后点击「生成回复话术」，这里将展示对方意图拆解、整体判断置信度，以及 3 套附带推荐置信度的话术方案。
                </p>
              </div>
            </div>
          )}

          {!isGenerating && activeSession.replies.length > 0 && (
            <div className="space-y-4">
              {/* Analysis & Overall Confidence Card */}
              {activeSession.analysis && (
                <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <ShieldAlert className="w-4 h-4" />
                      对方话术拆解与应对要点
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      {typeof analysisConfScore === 'number' && analysisConfStyle && (
                        <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${analysisConfStyle.darkText}`}>
                          <Gauge className="w-3.5 h-3.5" />
                          意图判断置信度 {analysisConfScore}% · {analysisConfStyle.label}
                        </span>
                      )}
                      {activeSession.modelUsed && (
                        <span className="font-mono text-[11px] text-stone-400">
                          {activeSession.modelUsed.replace(/^models\//, '')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-stone-100 leading-relaxed">
                    {activeSession.analysis}
                  </p>

                  {typeof analysisConfScore === 'number' && analysisConfStyle && (
                    <div className="pt-2 border-t border-stone-800 space-y-1.5">
                      <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${analysisConfStyle.bar} transition-all`}
                          style={{ width: `${analysisConfScore}%` }}
                        />
                      </div>
                      {activeSession.confidenceReason && (
                        <p className="text-xs text-stone-400 leading-relaxed">
                          置信度依据：{activeSession.confidenceReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Generated Reply Options with Per-Reply Confidence */}
              <div className="space-y-3">
                {activeSession.replies.map((reply, idx) => {
                  const isCopied = copiedIndex === idx;
                  const isEditing = editingIndex === idx;
                  const confScore = typeof reply.confidence === 'number' ? reply.confidence : 80;
                  const confStyle = getConfidenceColors(confScore);

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 transition-colors hover:border-stone-300"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                          <span className="font-bold text-stone-900 text-sm">
                            0{idx + 1}. {reply.style}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-semibold">{reply.tag}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold tabular-nums ${confStyle.text}`}>
                            置信度 {confScore}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            {isEditing ? '完成编辑' : '修改'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdoptAndContinue(reply.content)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            title="将本轮双方发言记入聊天记录并继续下一轮"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            采纳并存入聊天记录
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyReply(reply.content, idx)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                复制话术
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={reply.content}
                          onChange={(e) => handleEditReplyContent(idx, e.target.value)}
                          rows={3}
                          className="w-full p-3 text-sm text-stone-900 bg-stone-50 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      ) : (
                        <p className="text-[15px] text-stone-900 leading-relaxed whitespace-pre-wrap select-text">
                          {reply.content}
                        </p>
                      )}

                      {/* Confidence Bar & Rationale */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-[160px] flex-1 max-w-xs">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${confStyle.bar}`}
                              style={{ width: `${confScore}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-stone-500 tabular-nums shrink-0">
                            {confScore}% · {confStyle.label}
                          </span>
                        </div>
                        {reply.confidenceNote && (
                          <span className="text-xs text-stone-500">
                            {reply.confidenceNote}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Refinement Controls */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                    一键微调话术方向
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      '更简短口语点',
                      '语气更客气委婉',
                      '更强硬守住底线',
                      '加一点幽默缓和气氛',
                      '更正式严谨一点',
                    ].map((quickCmd) => (
                      <button
                        key={quickCmd}
                        type="button"
                        onClick={() => handleGenerate(quickCmd)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-50 hover:text-amber-800 text-stone-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {quickCmd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customRefine}
                    onChange={(e) => setCustomRefine(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customRefine.trim()) {
                        e.preventDefault();
                        const cmd = customRefine.trim();
                        setCustomRefine('');
                        handleGenerate(cmd);
                      }
                    }}
                    placeholder="输入自定义微调要求，例如：语气再温和一些，给对方留个台阶..."
                    className="flex-1 px-3 py-2 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customRefine.trim()) return;
                      const cmd = customRefine.trim();
                      setCustomRefine('');
                      handleGenerate(cmd);
                    }}
                    disabled={!customRefine.trim() || isGenerating}
                    className="inline-flex items-center px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    重新调整
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
