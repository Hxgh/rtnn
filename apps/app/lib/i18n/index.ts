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
    updatedAt: string;
    sha256: string;
    unavailable: string;
    download: string;
    openFailed: string;
  };
  login: {
    title: string;
    description: string;
    passwordLogin: string;
    email: string;
    password: string;
    submit: string;
    backHome: string;
    resetByAdmin: string;
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
    openInstaller: string;
    openDownloads: string;
    openingUpdate: string;
    updateAvailable: string;
    latestInstallerAvailable: string;
    noUpdate: string;
    updateUnavailable: string;
    downloadUnavailable: string;
    updateOpened: string;
    openFailed: string;
    packageFile: string;
    packageSize: string;
    updatedAt: string;
    appStoreBoundary: string;
  };
  nativeCapabilities: {
    title: string;
    description: string;
    runtimeTitle: string;
    runtimeDescription: string;
    externalTitle: string;
    externalDescription: string;
    mapTitle: string;
    mapDescription: string;
    mediaTitle: string;
    mediaDescription: string;
    barcodeTitle: string;
    barcodeDescription: string;
    barcodeScan: string;
    barcodeScanFromImage: string;
    barcodeResult: string;
    barcodeNoResult: string;
    notificationTitle: string;
    notificationDescription: string;
    notificationSend: string;
    permissionDescription: string;
    keyboardTitle: string;
    keyboardDescription: string;
    runtime: string;
    platform: string;
    shell: string;
    features: string;
    webviewDiagnostics: string;
    webviewDiagnosticsDescription: string;
    webviewBridgeReady: string;
    webviewBridgeMissing: string;
    webviewBridgeCheck: string;
    webviewBridgeCheckedAt: string;
    webviewBridgeObject: string;
    webviewBridgeState: string;
    bridgeMap: string;
    bridgePermission: string;
    bridgeMedia: string;
    bridgeBarcode: string;
    bridgeNotification: string;
    bridgeDiagnostics: string;
    bridgeTheme: string;
    browserRuntime: string;
    unavailable: string;
    permissions: string;
    photoPermission: string;
    cameraPermission: string;
    notificationPermission: string;
    permissionGranted: string;
    permissionDenied: string;
    permissionPrompt: string;
    permissionUnsupported: string;
    permissionUnknown: string;
    mapInstalled: string;
    mapNotInstalled: string;
    mapUnknown: string;
    mapUnsupported: string;
    mapDetected: string;
    mapUnknownCount: string;
    mapChecking: string;
    mapPickerTitle: string;
    mapPickerDescription: string;
    mapVisibilityLimited: string;
    mapCheckUnavailable: string;
    mapRefresh: string;
    mapOpenWith: string;
    requestPermission: string;
    permissionActionDriven: string;
    permissionActionDrivenShort: string;
    permissionRequestDone: string;
    openExternal: string;
    openMap: string;
    pickImages: string;
    captureImage: string;
    clearImages: string;
    keyboardLabel: string;
    keyboardPlaceholder: string;
    openDownloads: string;
    opening: string;
    opened: string;
    cancelled: string;
    failed: string;
    selectedImages: string;
    noImages: string;
    close: string;
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
    updatedAt: "更新时间",
    sha256: "SHA256",
    unavailable: "暂无可下载客户端",
    download: "下载",
    openFailed: "无法打开下载地址，请稍后重试。",
  },
  login: {
    title: "登录",
    description: "使用客户账号登录，继续访问首页与个人中心。",
    passwordLogin: "密码登录",
    email: "邮箱",
    password: "密码",
    submit: "登录",
    backHome: "返回首页",
    resetByAdmin: "忘记密码请联系管理员重置。",
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
    description: "检查当前安装包是否有新版本；移动端默认跳转下载页，正式分发优先应用商店。",
    platform: "平台",
    version: "壳版本",
    channel: "环境",
    checkUpdate: "检查更新",
    checkingUpdate: "检查中...",
    openUpdate: "打开下载页",
    openInstaller: "打开下载页",
    openDownloads: "打开下载页",
    openingUpdate: "打开中...",
    updateAvailable: "有可用更新",
    latestInstallerAvailable: "当前安装包可下载",
    noUpdate: "已是最新版本",
    updateUnavailable: "更新检查不可用",
    downloadUnavailable: "暂无可用安装包",
    updateOpened: "更新地址已打开，请按系统提示继续。",
    openFailed: "更新地址打开失败，请前往下载页重试。",
    packageFile: "安装包",
    packageSize: "大小",
    updatedAt: "更新时间",
    appStoreBoundary: "移动端安装包由应用商店或统一下载页分发，应用内只负责展示版本信息与跳转入口。",
  },
  nativeCapabilities: {
    title: "设备服务",
    description: "管理当前设备可用的系统能力，包括地图、相机、相册、扫码、通知和下载入口。",
    runtimeTitle: "设备信息",
    runtimeDescription: "查看当前客户端环境与已启用的系统能力。",
    externalTitle: "外链打开",
    externalDescription: "使用系统浏览器或外部应用打开链接。",
    mapTitle: "地图跳转",
    mapDescription: "选择已安装的地图应用并打开导航。",
    mediaTitle: "相机相册",
    mediaDescription: "从相册选择图片，或调用相机拍摄图片。",
    barcodeTitle: "扫码",
    barcodeDescription: "按需请求相机权限，支持常见二维码和一维码。",
    barcodeScan: "扫码",
    barcodeScanFromImage: "识别图片",
    barcodeResult: "扫码结果",
    barcodeNoResult: "暂无扫码结果",
    notificationTitle: "通知",
    notificationDescription: "按需请求通知权限，并发送本地通知。",
    notificationSend: "发送通知",
    permissionDescription: "权限按需请求，具体业务页面可根据使用场景决定触发时机。",
    keyboardTitle: "键盘与安全区",
    keyboardDescription: "输入内容时页面会适配键盘和底部安全区域。",
    runtime: "运行环境",
    platform: "平台",
    shell: "客户端类型",
    features: "能力",
    webviewDiagnostics: "桥接状态",
    webviewDiagnosticsDescription: "查看当前客户端与系统能力桥接的可用状态。",
    webviewBridgeReady: "桥接已注入",
    webviewBridgeMissing: "桥接未注入",
    webviewBridgeCheck: "刷新状态",
    webviewBridgeCheckedAt: "检测时间",
    webviewBridgeObject: "系统服务",
    webviewBridgeState: "状态",
    bridgeMap: "地图服务",
    bridgePermission: "权限服务",
    bridgeMedia: "媒体服务",
    bridgeBarcode: "扫码服务",
    bridgeNotification: "通知服务",
    bridgeDiagnostics: "状态服务",
    bridgeTheme: "外观服务",
    browserRuntime: "浏览器",
    unavailable: "当前在浏览器中运行，原生能力会降级为 Web 行为。",
    permissions: "权限状态",
    photoPermission: "相册",
    cameraPermission: "相机",
    notificationPermission: "通知",
    permissionGranted: "已允许",
    permissionDenied: "已拒绝",
    permissionPrompt: "按需询问",
    permissionUnsupported: "不支持",
    permissionUnknown: "未知",
    mapInstalled: "已安装",
    mapNotInstalled: "未安装",
    mapUnknown: "无法检测",
    mapUnsupported: "不支持检测",
    mapDetected: "已检测安装",
    mapUnknownCount: "无法检测",
    mapChecking: "正在检测地图应用",
    mapPickerTitle: "打开方式",
    mapPickerDescription: "请选择可用的地图应用。未安装或暂时无法确认的应用将不可选择。",
    mapVisibilityLimited: "系统暂时无法确认该应用是否可用，请刷新状态或更新客户端后重试。",
    mapCheckUnavailable: "当前环境暂时无法读取地图应用状态，请刷新状态或更新客户端后重试。",
    mapRefresh: "重新检测",
    mapOpenWith: "打开",
    requestPermission: "请求权限",
    permissionActionDriven: "该权限会在对应操作时由系统按需询问，不单独弹窗。",
    permissionActionDrivenShort: "去处理",
    permissionRequestDone: "权限请求已处理。",
    openExternal: "打开外链",
    openMap: "打开地图",
    pickImages: "选择图片",
    captureImage: "拍照",
    clearImages: "清空图片",
    keyboardLabel: "备注",
    keyboardPlaceholder: "请输入内容",
    openDownloads: "客户端下载",
    opening: "打开中...",
    opened: "操作已触发，请根据系统提示继续。",
    cancelled: "已取消，未选择文件。",
    failed: "操作失败，请检查客户端能力或系统权限。",
    selectedImages: "已选择图片",
    noImages: "尚未选择图片",
    close: "关闭",
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
    updatedAt: "Updated",
    sha256: "SHA256",
    unavailable: "No client downloads are available.",
    download: "Download",
    openFailed: "Unable to open the download URL. Please try again later.",
  },
  login: {
    title: "Sign in",
    description: "Use your customer account to continue.",
    passwordLogin: "Password",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    backHome: "Back home",
    resetByAdmin: "Forgot your password? Contact an administrator to reset it.",
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
    description: "Check whether a newer package is available. Mobile clients open the downloads page; production distribution should prefer app stores.",
    platform: "Platform",
    version: "Shell version",
    channel: "Channel",
    checkUpdate: "Check update",
    checkingUpdate: "Checking...",
    openUpdate: "Open downloads",
    openInstaller: "Open downloads",
    openDownloads: "Open downloads",
    openingUpdate: "Opening...",
    updateAvailable: "Update available",
    latestInstallerAvailable: "Installer available",
    noUpdate: "Up to date",
    updateUnavailable: "Update check unavailable",
    downloadUnavailable: "No installer available",
    updateOpened: "Update link opened. Follow the system prompts to continue.",
    openFailed: "Failed to open the update link. Try the downloads page.",
    packageFile: "Installer",
    packageSize: "Size",
    updatedAt: "Updated",
    appStoreBoundary: "Mobile packages are distributed through app stores or the downloads page. The app only shows version details and opens the proper entry.",
  },
  nativeCapabilities: {
    title: "Device Services",
    description: "Manage system capabilities available on this device, including maps, camera, photos, scanning, notifications, and downloads.",
    runtimeTitle: "Device information",
    runtimeDescription: "View the current client environment and enabled system capabilities.",
    externalTitle: "External links",
    externalDescription: "Open links with the system browser or external apps.",
    mapTitle: "Map navigation",
    mapDescription: "Choose an installed map app and open navigation.",
    mediaTitle: "Camera and photos",
    mediaDescription: "Choose images from photos, or capture a new image with the camera.",
    barcodeTitle: "Scan",
    barcodeDescription: "Camera permission is requested when needed. Common QR codes and 1D barcodes are supported.",
    barcodeScan: "Scan",
    barcodeScanFromImage: "Scan image",
    barcodeResult: "Scan result",
    barcodeNoResult: "No scan result",
    notificationTitle: "Notifications",
    notificationDescription: "Request notification permission when needed and send a local notification.",
    notificationSend: "Send notification",
    permissionDescription: "Permissions are requested on demand. Each business screen can decide the right trigger timing.",
    keyboardTitle: "Keyboard and safe area",
    keyboardDescription: "The page adapts to the keyboard and bottom safe area while editing.",
    runtime: "Runtime",
    platform: "Platform",
    shell: "Client type",
    features: "Features",
    webviewDiagnostics: "Bridge status",
    webviewDiagnosticsDescription: "View the availability of the client bridge used by system capabilities.",
    webviewBridgeReady: "Bridge injected",
    webviewBridgeMissing: "Bridge missing",
    webviewBridgeCheck: "Refresh",
    webviewBridgeCheckedAt: "Checked",
    webviewBridgeObject: "Service",
    webviewBridgeState: "State",
    bridgeMap: "Map service",
    bridgePermission: "Permission service",
    bridgeMedia: "Media service",
    bridgeBarcode: "Scan service",
    bridgeNotification: "Notification service",
    bridgeDiagnostics: "Status service",
    bridgeTheme: "Appearance service",
    browserRuntime: "Browser",
    unavailable: "The current runtime is a browser, so native actions fall back to web behavior.",
    permissions: "Permissions",
    photoPermission: "Photos",
    cameraPermission: "Camera",
    notificationPermission: "Notifications",
    permissionGranted: "Allowed",
    permissionDenied: "Denied",
    permissionPrompt: "Ask when needed",
    permissionUnsupported: "Unsupported",
    permissionUnknown: "Unknown",
    mapInstalled: "Installed",
    mapNotInstalled: "Not installed",
    mapUnknown: "Unknown",
    mapUnsupported: "Unsupported",
    mapDetected: "Detected installed",
    mapUnknownCount: "Unknown",
    mapChecking: "Checking map apps",
    mapPickerTitle: "Open with",
    mapPickerDescription: "Choose an available map app. Missing or uncertain apps cannot be selected.",
    mapVisibilityLimited: "The system cannot confirm whether this app is available. Refresh status or update the client and retry.",
    mapCheckUnavailable: "The current environment cannot read map app status. Refresh status or update the client and retry.",
    mapRefresh: "Refresh",
    mapOpenWith: "Open",
    requestPermission: "Request permission",
    permissionActionDriven: "This permission is requested by the system when the related action runs, not as a standalone prompt.",
    permissionActionDrivenShort: "Handle",
    permissionRequestDone: "Permission request handled.",
    openExternal: "Open external link",
    openMap: "Open map",
    pickImages: "Pick images",
    captureImage: "Capture image",
    clearImages: "Clear images",
    keyboardLabel: "Note",
    keyboardPlaceholder: "Enter text",
    openDownloads: "Client downloads",
    opening: "Opening...",
    opened: "Action started. Follow the system prompts to continue.",
    cancelled: "Cancelled. No file was selected.",
    failed: "Action failed. Check client capabilities or system permissions.",
    selectedImages: "Selected images",
    noImages: "No images selected",
    close: "Close",
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
