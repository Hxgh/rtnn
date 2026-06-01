import type { SupportedLocale } from "@rtnn/config";
import { readWeappLocale } from "../preferences";

export type WeappMessages = {
  common: {
    loading: string;
    retry: string;
    backHome: string;
    signOut: string;
    login: string;
    home: string;
    me: string;
    status: {
      loading: string;
      signedIn: string;
      signedOut: string;
      guest: string;
      error: string;
    };
  };
  login: {
    title: string;
    description: string;
    introTitle: string;
    introDescription: string;
    email: string;
    password: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
    backHome: string;
    errorRequired: string;
    errorInvalid: string;
    errorSessionUnavailable: string;
  };
  home: {
    title: string;
    description: string;
    loadingTitle: string;
    loadingDescription: string;
    guestTitle: string;
    guestDescription: string;
    guestAction: string;
    errorTitle: string;
    errorDescription: string;
    accountTitle: string;
    rolesLabel: string;
    sessionLabel: string;
    emailLabel: string;
    userIdLabel: string;
    quickAccessTitle: string;
    meTitle: string;
    meDescription: string;
  };
  profile: {
    title: string;
    description: string;
    loadingTitle: string;
    loadingDescription: string;
    guestTitle: string;
    guestDescription: string;
    guestAction: string;
    errorTitle: string;
    errorDescription: string;
    accountTitle: string;
    emailLabel: string;
    userIdLabel: string;
    roleLabel: string;
    sessionTitle: string;
    sessionDescription: string;
    logout: string;
    signedIn: string;
  };
  errors: {
    unknown: string;
    sessionUnavailable: string;
    loginFailed: string;
    loginRequired: string;
    invalidCurrentPassword: string;
    sameAsCurrentPassword: string;
    passwordTooShort: string;
    passwordMismatch: string;
  };
};

const zhCN: WeappMessages = {
  common: {
    loading: "加载中",
    retry: "重试",
    backHome: "返回首页",
    signOut: "退出登录",
    login: "登录",
    home: "首页",
    me: "我的",
    status: {
      loading: "同步中",
      signedIn: "已登录",
      signedOut: "未登录",
      guest: "未登录",
      error: "异常",
    },
  },
  login: {
    title: "登录",
    description: "登录后可访问首页与我的页，并同步当前设备会话。",
    introTitle: "欢迎回来",
    introDescription: "输入邮箱和密码后即可进入正式前台。",
    email: "邮箱",
    password: "密码",
    emailPlaceholder: "请输入邮箱",
    passwordPlaceholder: "请输入密码",
    submit: "登录",
    submitting: "登录中...",
    backHome: "返回首页",
    errorRequired: "请输入邮箱和密码。",
    errorInvalid: "登录失败，请确认账号密码或稍后重试。",
    errorSessionUnavailable: "当前会话暂不可用，请稍后重试。",
  },
  home: {
    title: "首页",
    description: "查看当前账户状态，并进入我的页管理会话。",
    loadingTitle: "正在同步当前会话",
    loadingDescription: "正在检查本地凭据与当前账户状态。",
    guestTitle: "当前未登录",
    guestDescription: "登录后即可访问首页和我的页，并同步当前设备会话。",
    guestAction: "去登录",
    errorTitle: "当前会话状态暂时不可用",
    errorDescription: "请稍后重试。",
    accountTitle: "账户概览",
    rolesLabel: "当前角色",
    sessionLabel: "会话状态",
    emailLabel: "邮箱",
    userIdLabel: "用户 ID",
    quickAccessTitle: "常用入口",
    meTitle: "我的",
    meDescription: "查看账户信息，并管理当前设备会话。",
  },
  profile: {
    title: "我的",
    description: "查看当前账户信息，并管理当前设备会话。",
    loadingTitle: "正在同步账户信息",
    loadingDescription: "正在恢复当前设备会话。",
    guestTitle: "当前未登录",
    guestDescription: "请先建立当前设备会话。",
    guestAction: "去登录",
    errorTitle: "暂时无法读取账户信息",
    errorDescription: "请稍后重试。",
    accountTitle: "账户信息",
    emailLabel: "邮箱",
    userIdLabel: "用户 ID",
    roleLabel: "角色",
    sessionTitle: "会话管理",
    sessionDescription:
      "退出登录后，需要重新输入邮箱和密码才能继续访问首页与我的页。",
    logout: "退出登录",
    signedIn: "已登录",
  },
  errors: {
    unknown: "操作失败，请稍后重试。",
    sessionUnavailable: "当前会话暂不可用，请稍后重试。",
    loginFailed: "登录失败，请确认账号密码或稍后重试。",
    loginRequired: "请输入邮箱和密码。",
    invalidCurrentPassword: "原密码错误，请重新输入。",
    sameAsCurrentPassword: "新密码不能与当前密码相同。",
    passwordTooShort: "密码长度至少 8 位。",
    passwordMismatch: "两次输入的密码不一致。",
  },
};

const enUS: WeappMessages = {
  common: {
    loading: "Loading",
    retry: "Retry",
    backHome: "Back home",
    signOut: "Sign out",
    login: "Login",
    home: "Home",
    me: "Profile",
    status: {
      loading: "Syncing",
      signedIn: "Signed in",
      signedOut: "Signed out",
      guest: "Signed out",
      error: "Error",
    },
  },
  login: {
    title: "Login",
    description:
      "Log in to access Home and Profile and keep the current device session in sync.",
    introTitle: "Welcome back",
    introDescription: "Enter your email and password to continue.",
    email: "Email",
    password: "Password",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "Enter your password",
    submit: "Login",
    submitting: "Logging in...",
    backHome: "Back home",
    errorRequired: "Enter both email and password.",
    errorInvalid: "Login failed. Check your credentials or try again later.",
    errorSessionUnavailable:
      "The current session is temporarily unavailable. Try again later.",
  },
  home: {
    title: "Home",
    description: "View the current account state and manage the session.",
    loadingTitle: "Syncing the current session",
    loadingDescription: "Checking local credentials and account state.",
    guestTitle: "Not signed in",
    guestDescription:
      "Log in to access Home and Profile and keep this device session in sync.",
    guestAction: "Go to login",
    errorTitle: "The current session is temporarily unavailable",
    errorDescription: "Try again later.",
    accountTitle: "Account overview",
    rolesLabel: "Current role",
    sessionLabel: "Session status",
    emailLabel: "Email",
    userIdLabel: "User ID",
    quickAccessTitle: "Quick access",
    meTitle: "Profile",
    meDescription:
      "View account details and manage the current device session.",
  },
  profile: {
    title: "Profile",
    description: "View account details and manage the current device session.",
    loadingTitle: "Syncing account information",
    loadingDescription: "Restoring the current device session.",
    guestTitle: "Not signed in",
    guestDescription: "Create a device session first.",
    guestAction: "Go to login",
    errorTitle: "Unable to load account information",
    errorDescription: "Try again later.",
    accountTitle: "Account details",
    emailLabel: "Email",
    userIdLabel: "User ID",
    roleLabel: "Role",
    sessionTitle: "Session management",
    sessionDescription:
      "Sign out to require email and password before using Home and Profile again.",
    logout: "Sign out",
    signedIn: "Signed in",
  },
  errors: {
    unknown: "Action failed. Try again later.",
    sessionUnavailable:
      "The current session is temporarily unavailable. Try again later.",
    loginFailed: "Login failed. Check your credentials or try again later.",
    loginRequired: "Enter both email and password.",
    invalidCurrentPassword: "The current password is invalid.",
    sameAsCurrentPassword:
      "The new password must differ from the current password.",
    passwordTooShort: "The password must be at least 8 characters long.",
    passwordMismatch: "The two passwords do not match.",
  },
};

const messagesByLocale: Record<SupportedLocale, WeappMessages> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export function getWeappMessages(locale = readWeappLocale()): WeappMessages {
  return messagesByLocale[locale] ?? zhCN;
}
