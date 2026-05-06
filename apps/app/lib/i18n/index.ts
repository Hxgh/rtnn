import {
  APP_LOCALES,
  normalizeAppLocale,
  type AppLocale,
  type AppTheme as ThemeMode,
} from "@/lib/preferences";

export { APP_LOCALES };
export type { AppLocale, ThemeMode };

export function normalizeLocale(input?: string | null): AppLocale {
  return normalizeAppLocale(input);
}

export type AppMessages = {
  common: {
    nav: {
      home: string;
      me: string;
      login: string;
    };
    actions: {
      back: string;
      backHome: string;
      retry: string;
      signOut: string;
      submitting: string;
    };
    prefs: {
      locale: string;
      theme: string;
      chinese: string;
      english: string;
      light: string;
      dark: string;
      system: string;
    };
    labels: {
      role: string;
      email: string;
      userId: string;
      sessionStatus: string;
    };
  };
  home: {
    badge: string;
    title: string;
    description: string;
    quickActions: string;
    accountSummary: string;
    sessionTitle: string;
    signedIn: string;
    signedOut: string;
    signedOutHint: string;
  };
  download: {
    title: string;
    description: string;
    sectionTitle: string;
    version: string;
    status: string;
    reason: string;
    available: string;
    notAvailable: string;
    channel: string;
    provider: string;
    file: string;
    fileSize: string;
    sha256: string;
    unavailable: string;
    download: string;
    openFailed: string;
  };
  login: {
    title: string;
    description: string;
    email: string;
    password: string;
    submit: string;
    invalid: string;
    required: string;
    expired: string;
  };
  profile: {
    title: string;
    description: string;
    currentUser: string;
    signOut: string;
    accountOverview: string;
    preferencesTitle: string;
  };
  nativeUpdate: {
    title: string;
    description: string;
    platform: string;
    version: string;
    channel: string;
    checkUpdate: string;
    checkingUpdate: string;
    openUpdate: string;
    openingUpdate: string;
    updateAvailable: string;
    noUpdate: string;
    updateUnavailable: string;
    updateOpened: string;
  };
  security: {
    title: string;
    description: string;
    formTitle: string;
    currentPassword: string;
    nextPassword: string;
    confirmPassword: string;
    submit: string;
    success: string;
    errors: {
      required: string;
      mismatch: string;
      sameAsCurrent: string;
      tooShort: string;
      invalidCurrent: string;
      sessionExpired: string;
      failed: string;
    };
  };
  forbidden: {
    code: string;
    title: string;
    description: string;
  };
  notFound: {
    code: string;
    title: string;
    description: string;
  };
  error: {
    code: string;
    title: string;
    description: string;
  };
  loading: {
    title: string;
  };
};

const zhCN: AppMessages = {
  common: {
    nav: {
      home: "首页",
      me: "我的",
      login: "登录",
    },
    actions: {
      back: "返回",
      backHome: "返回首页",
      retry: "重试",
      signOut: "退出登录",
      submitting: "提交中...",
    },
    prefs: {
      locale: "语言",
      theme: "主题",
      chinese: "中文",
      english: "English",
      light: "浅色",
      dark: "深色",
      system: "跟随系统",
    },
    labels: {
      role: "角色",
      email: "邮箱",
      userId: "用户 ID",
      sessionStatus: "会话状态",
    },
  },
  home: {
    badge: "账户首页",
    title: "欢迎回来",
    description: "查看当前账户状态、常用入口和个人设置。",
    quickActions: "常用入口",
    accountSummary: "账户摘要",
    sessionTitle: "当前会话",
    signedIn: "已登录",
    signedOut: "未登录",
    signedOutHint: "登录后即可访问首页、我的页和账户安全能力。",
  },
  download: {
    title: "客户端下载",
    description: "获取当前可用的移动端和桌面端安装包。",
    sectionTitle: "可下载客户端",
    version: "版本",
    status: "状态",
    reason: "原因",
    available: "可下载",
    notAvailable: "不可用",
    channel: "环境",
    provider: "分发源",
    file: "文件",
    fileSize: "文件大小",
    sha256: "SHA256",
    unavailable: "暂无可下载客户端",
    download: "下载",
    openFailed: "无法打开下载地址，请稍后重试。",
  },
  login: {
    title: "登录",
    description: "使用客户账号登录，继续访问首页与个人中心。",
    email: "邮箱",
    password: "密码",
    submit: "登录",
    invalid: "账号或密码错误，请重试。",
    required: "请输入邮箱和密码。",
    expired: "会话已过期，请重新登录。",
  },
  profile: {
    title: "我的",
    description: "集中管理账户信息、密码安全与应用偏好。",
    currentUser: "当前登录用户",
    signOut: "退出登录",
    accountOverview: "账户概览",
    preferencesTitle: "应用偏好",
  },
  nativeUpdate: {
    title: "移动客户端",
    description: "检查当前安装包是否需要更新。",
    platform: "平台",
    version: "壳版本",
    channel: "环境",
    checkUpdate: "检查更新",
    checkingUpdate: "检查中...",
    openUpdate: "打开更新",
    openingUpdate: "打开中...",
    updateAvailable: "有可用更新",
    noUpdate: "已是最新版本",
    updateUnavailable: "更新检查不可用",
    updateOpened: "更新地址已打开，请按系统提示继续。",
  },
  security: {
    title: "账户安全",
    description: "修改登录密码，并在成功后刷新当前设备会话。",
    formTitle: "修改密码",
    currentPassword: "当前密码",
    nextPassword: "新密码",
    confirmPassword: "确认新密码",
    submit: "保存新密码",
    success: "密码修改成功，已更新当前会话。",
    errors: {
      required: "请完整填写所有字段。",
      mismatch: "两次输入的新密码不一致。",
      sameAsCurrent: "新密码不能与当前密码相同。",
      tooShort: "新密码长度至少为 8 位。",
      invalidCurrent: "当前密码不正确。",
      sessionExpired: "会话已过期，请重新登录后再试。",
      failed: "修改失败，请稍后重试。",
    },
  },
  forbidden: {
    code: "403",
    title: "无权限访问",
    description: "当前账号缺少访问该页面的权限，请联系管理员开通。",
  },
  notFound: {
    code: "404",
    title: "页面不存在",
    description: "你访问的页面可能已被移动或删除。",
  },
  error: {
    code: "error",
    title: "页面加载失败",
    description: "请稍后重试，或联系管理员排查后端接口与网关状态。",
  },
  loading: {
    title: "正在加载页面数据...",
  },
};

const enUS: AppMessages = {
  common: {
    nav: {
      home: "Home",
      me: "Me",
      login: "Sign in",
    },
    actions: {
      back: "Back",
      backHome: "Back home",
      retry: "Retry",
      signOut: "Sign out",
      submitting: "Submitting...",
    },
    prefs: {
      locale: "Locale",
      theme: "Theme",
      chinese: "中文",
      english: "English",
      light: "Light",
      dark: "Dark",
      system: "System",
    },
    labels: {
      role: "Role",
      email: "Email",
      userId: "User ID",
      sessionStatus: "Session status",
    },
  },
  home: {
    badge: "Account Home",
    title: "Welcome back",
    description: "Review account status, common destinations, and personal settings.",
    quickActions: "Quick actions",
    accountSummary: "Account summary",
    sessionTitle: "Current session",
    signedIn: "Signed in",
    signedOut: "Signed out",
    signedOutHint: "Sign in to access the home, profile, and account security flows.",
  },
  download: {
    title: "Client downloads",
    description: "Get the current mobile and desktop client installers.",
    sectionTitle: "Available clients",
    version: "Version",
    status: "Status",
    reason: "Reason",
    available: "Available",
    notAvailable: "Unavailable",
    channel: "Channel",
    provider: "Provider",
    file: "File",
    fileSize: "File size",
    sha256: "SHA256",
    unavailable: "No client downloads are available.",
    download: "Download",
    openFailed: "Unable to open the download URL. Please try again later.",
  },
  login: {
    title: "Sign in",
    description: "Use the built-in customer account to verify the real session flow.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    invalid: "Invalid email or password. Please try again.",
    required: "Please enter both email and password.",
    expired: "Session expired. Please sign in again.",
  },
  profile: {
    title: "Profile",
    description: "Manage account details, password security, and app preferences in one place.",
    currentUser: "Current signed-in user",
    signOut: "Sign out",
    accountOverview: "Account overview",
    preferencesTitle: "App preferences",
  },
  nativeUpdate: {
    title: "Mobile Client",
    description: "Check whether the installed client package needs an update.",
    platform: "Platform",
    version: "Shell version",
    channel: "Channel",
    checkUpdate: "Check update",
    checkingUpdate: "Checking...",
    openUpdate: "Open update",
    openingUpdate: "Opening...",
    updateAvailable: "Update available",
    noUpdate: "Up to date",
    updateUnavailable: "Update check unavailable",
    updateOpened: "Update link opened. Follow the system prompts to continue.",
  },
  security: {
    title: "Account Security",
    description: "Change the password and refresh the current device session after success.",
    formTitle: "Change password",
    currentPassword: "Current password",
    nextPassword: "New password",
    confirmPassword: "Confirm new password",
    submit: "Save new password",
    success: "Password updated and session tokens have been refreshed.",
    errors: {
      required: "Please fill in all required fields.",
      mismatch: "The new passwords do not match.",
      sameAsCurrent: "The new password must be different from the current password.",
      tooShort: "The new password must be at least 8 characters.",
      invalidCurrent: "Current password is invalid.",
      sessionExpired: "Session expired. Please sign in again.",
      failed: "Unable to change password. Please retry later.",
    },
  },
  forbidden: {
    code: "403",
    title: "Access denied",
    description: "Your account does not have permission to access this page.",
  },
  notFound: {
    code: "404",
    title: "Page not found",
    description: "The page you requested may have been moved or deleted.",
  },
  error: {
    code: "error",
    title: "Failed to load page",
    description: "Please retry later or check backend and gateway health status.",
  },
  loading: {
    title: "Loading page data...",
  },
};

export const APP_MESSAGES: Record<AppLocale, AppMessages> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export function getMessagesByLocale(locale: AppLocale): AppMessages {
  return APP_MESSAGES[locale];
}
