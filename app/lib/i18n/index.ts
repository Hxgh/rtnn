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
    sessionTitle: string;
    signedIn: string;
    signedOut: string;
    signedOutHint: string;
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
      me: "个人",
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
    badge: "customer app",
    title: "移动端前台",
    description: "聚焦 customer 会话、账户安全与个人信息查看的首发闭环。",
    quickActions: "快捷入口",
    sessionTitle: "当前会话",
    signedIn: "已登录",
    signedOut: "未登录",
    signedOutHint: "先登录 customer 账号，再进入个人页与账户安全页面。",
  },
  login: {
    title: "登录",
    description:
      "使用 backend 正式 customer 登录接口建立会话，并由 cookie 驱动 me/refresh/logout。",
    email: "邮箱",
    password: "密码",
    submit: "登录",
    invalid: "账号或密码错误，请重试。",
    required: "请输入邮箱和密码。",
    expired: "会话已过期，请重新登录。",
  },
  profile: {
    title: "个人页",
    description: "集中查看账户信息、账户安全与应用偏好。",
    currentUser: "当前登录用户",
    signOut: "退出登录",
    accountOverview: "账户概览",
    preferencesTitle: "应用偏好",
  },
  security: {
    title: "账户安全",
    description: "修改登录密码，并在成功后更新当前会话。",
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
    badge: "customer app",
    title: "Mobile Frontend",
    description: "First-release shell focused on customer session, account security, and profile view.",
    quickActions: "Quick actions",
    sessionTitle: "Current session",
    signedIn: "Signed in",
    signedOut: "Signed out",
    signedOutHint: "Sign in first, then access profile and account security pages.",
  },
  login: {
    title: "Sign in",
    description:
      "Use backend customer auth endpoints to build a real session with me/refresh/logout.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    invalid: "Invalid email or password. Please try again.",
    required: "Please enter both email and password.",
    expired: "Session expired. Please sign in again.",
  },
  profile: {
    title: "Profile",
    description: "Review account details, password security, and app preferences.",
    currentUser: "Current signed-in user",
    signOut: "Sign out",
    accountOverview: "Account overview",
    preferencesTitle: "App preferences",
  },
  security: {
    title: "Account Security",
    description: "Change the password and refresh the current session after success.",
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
