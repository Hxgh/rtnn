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
  nativeCapabilities: {
    title: string;
    description: string;
    serviceActionsTitle: string;
    serviceSupportTitle: string;
    runtimeTitle: string;
    runtimeDescription: string;
    mapTitle: string;
    mapShortLabel: string;
    mapDescription: string;
    mapDiagnosticDescription: string;
    mediaTitle: string;
    mediaDescription: string;
    barcodeTitle: string;
    barcodeDescription: string;
    barcodeScanFromImage: string;
    barcodeImageScanning: string;
    barcodeCameraTitle: string;
    barcodeCameraDescription: string;
    barcodeCameraIdle: string;
    barcodeScanning: string;
    barcodeCopyResult: string;
    barcodeStart: string;
    barcodeStop: string;
    barcodeResult: string;
    barcodeNoResult: string;
    barcodeContent: string;
    barcodeContentType: string;
    barcodeFormat: string;
    barcodeCameraDenied: string;
    barcodeNativeUnavailable: string;
    barcodeImageUnsupported: string;
    barcodeContentTypeLabels: Record<"url" | "email" | "phone" | "sms" | "wifi" | "geo" | "product" | "text", string>;
    notificationTitle: string;
    notificationDescription: string;
    notificationSend: string;
    notificationSent: string;
    diagnosticsTitle: string;
    diagnosticsDescription: string;
    permissionDescription: string;
    keyboardTitle: string;
    keyboardDescription: string;
    runtime: string;
    platform: string;
    shell: string;
    features: string;
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
    mapUnavailable: string;
    mapUnsupported: string;
    mapDetected: string;
    mapChecking: string;
    mapPickerTitle: string;
    mapPickerDescription: string;
    mapPickerCheckingDescription: string;
    mapPickerEmptyDescription: string;
    mapPickerFailedDescription: string;
    mapVisibilityLimited: string;
    mapCheckUnavailable: string;
    mapOpenFailed: string;
    requestPermission: string;
    permissionActionDriven: string;
    permissionActionDrivenShort: string;
    permissionRequestDone: string;
    webviewLoadFailed: string;
    openMap: string;
    pickImages: string;
    captureImage: string;
    clearImages: string;
    keyboardPlaceholder: string;
    openDownloads: string;
    downloadEntryDescription: string;
    openDiagnostics: string;
    diagnosticsEntryDescription: string;
    opening: string;
    openingShort: string;
    checkingShort: string;
    failed: string;
    selectedImages: string;
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
  nativeCapabilities: {
    title: "设备服务",
    description: "调用当前客户端可用的设备能力。",
    serviceActionsTitle: "设备能力",
    serviceSupportTitle: "辅助入口",
    runtimeTitle: "设备信息",
    runtimeDescription: "查看当前客户端环境与已启用的系统能力。",
    mapTitle: "地图导航",
    mapShortLabel: "导",
    mapDescription: "检测可用地图应用后选择并打开导航。",
    mapDiagnosticDescription: "查看当前客户端识别到的地图应用状态。",
    mediaTitle: "相机相册",
    mediaDescription: "选择相册图片，或调用相机拍摄图片。",
    barcodeTitle: "扫码",
    barcodeDescription: "识别二维码和常见条形码。",
    barcodeScanFromImage: "选择图片识别",
    barcodeImageScanning: "识别中...",
    barcodeCameraTitle: "相机扫码",
    barcodeCameraDescription: "使用相机取景框识别二维码和条形码，识别成功后自动停止。",
    barcodeCameraIdle: "点击开始后打开相机取景框",
    barcodeScanning: "扫码中...",
    barcodeCopyResult: "复制结果",
    barcodeStart: "开始扫码",
    barcodeStop: "停止扫码",
    barcodeResult: "扫码结果",
    barcodeNoResult: "暂无扫码结果",
    barcodeContent: "内容",
    barcodeContentType: "类型",
    barcodeFormat: "码制",
    barcodeCameraDenied: "相机权限未开启，请允许访问相机后重试。",
    barcodeNativeUnavailable: "当前客户端暂不能调用系统扫码。",
    barcodeImageUnsupported: "当前环境不支持图片识别，请换一张图片或使用相机扫码。",
    barcodeContentTypeLabels: {
      url: "网页链接",
      email: "邮箱",
      phone: "电话",
      sms: "短信",
      wifi: "Wi-Fi",
      geo: "地理位置",
      product: "商品条码",
      text: "文本",
    },
    notificationTitle: "通知",
    notificationDescription: "发送本地通知，并按系统策略申请通知权限。",
    notificationSend: "发送通知",
    notificationSent: "通知已发送。",
    diagnosticsTitle: "设备诊断",
    diagnosticsDescription: "查看运行环境、权限和系统状态。",
    permissionDescription: "权限由相关操作按需申请。",
    keyboardTitle: "键盘与安全区",
    keyboardDescription: "输入内容时页面会适配键盘和底部安全区域。",
    runtime: "运行环境",
    platform: "平台",
    shell: "客户端类型",
    features: "能力",
    unavailable: "当前运行在浏览器中。",
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
    mapUnavailable: "无法确认",
    mapUnsupported: "不支持检测",
    mapDetected: "地图应用状态",
    mapChecking: "正在检测地图应用",
    mapPickerTitle: "选择地图应用",
    mapPickerDescription: "选择一个可用应用继续导航。",
    mapPickerCheckingDescription: "正在检测可用地图应用。",
    mapPickerEmptyDescription: "当前设备未识别到可用地图应用。",
    mapPickerFailedDescription: "当前无法读取地图应用状态。",
    mapVisibilityLimited: "当前设备未识别到该地图应用。",
    mapCheckUnavailable: "当前无法读取地图应用状态。",
    mapOpenFailed: "未能打开地图应用，请选择其他可用地图。",
    requestPermission: "请求权限",
    permissionActionDriven: "该权限会在对应操作时由系统询问。",
    permissionActionDrivenShort: "按操作询问",
    permissionRequestDone: "权限请求已处理。",
    webviewLoadFailed: "操作未完成，请返回后重试。",
    openMap: "打开地图",
    pickImages: "选择图片",
    captureImage: "拍照",
    clearImages: "清空图片",
    keyboardPlaceholder: "请输入内容",
    openDownloads: "客户端下载",
    downloadEntryDescription: "查看当前环境可下载的客户端安装包。",
    openDiagnostics: "设备诊断",
    diagnosticsEntryDescription: "查看设备能力状态。",
    opening: "处理中...",
    openingShort: "处理中",
    checkingShort: "检测中",
    failed: "操作未完成，请检查客户端状态或系统权限。",
    selectedImages: "已选择图片",
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
    description: "请返回后重试。",
  },
  loading: {
    title: "加载中...",
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
  nativeCapabilities: {
    title: "Device Services",
    description: "Use device capabilities available in this client.",
    serviceActionsTitle: "Device actions",
    serviceSupportTitle: "Support",
    runtimeTitle: "Device information",
    runtimeDescription: "View the current client environment and enabled system capabilities.",
    mapTitle: "Map navigation",
    mapShortLabel: "M",
    mapDescription: "Check available map apps, then choose one for navigation.",
    mapDiagnosticDescription: "Inspect map app availability detected by the client.",
    mediaTitle: "Camera and photos",
    mediaDescription: "Choose photos or capture a new image with the camera.",
    barcodeTitle: "Scan",
    barcodeDescription: "Read QR codes and common barcodes.",
    barcodeScanFromImage: "Choose image",
    barcodeImageScanning: "Scanning...",
    barcodeCameraTitle: "Camera scan",
    barcodeCameraDescription: "Use the camera viewfinder to read QR codes and barcodes. Scanning stops after a match.",
    barcodeCameraIdle: "Start scanning to open the camera viewfinder",
    barcodeScanning: "Scanning...",
    barcodeCopyResult: "Copy result",
    barcodeStart: "Start scan",
    barcodeStop: "Stop scan",
    barcodeResult: "Scan result",
    barcodeNoResult: "No scan result",
    barcodeContent: "Content",
    barcodeContentType: "Type",
    barcodeFormat: "Format",
    barcodeCameraDenied: "Camera permission is not enabled. Allow camera access and retry.",
    barcodeNativeUnavailable: "System scanning is not available in this client.",
    barcodeImageUnsupported: "Image scanning is not supported here. Choose another image or use camera scan.",
    barcodeContentTypeLabels: {
      url: "Web URL",
      email: "Email",
      phone: "Phone",
      sms: "SMS",
      wifi: "Wi-Fi",
      geo: "Location",
      product: "Product barcode",
      text: "Text",
    },
    notificationTitle: "Notifications",
    notificationDescription: "Send a local notification and request permission when required.",
    notificationSend: "Send notification",
    notificationSent: "Notification sent.",
    diagnosticsTitle: "Device Diagnostics",
    diagnosticsDescription: "Review runtime, permissions, and system status.",
    permissionDescription: "Permissions are requested by related actions.",
    keyboardTitle: "Keyboard and safe area",
    keyboardDescription: "The page adapts to the keyboard and bottom safe area while editing.",
    runtime: "Runtime",
    platform: "Platform",
    shell: "Client type",
    features: "Features",
    unavailable: "The current runtime is a browser.",
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
    mapUnavailable: "Unconfirmed",
    mapUnsupported: "Unsupported",
    mapDetected: "Map app status",
    mapChecking: "Checking map apps",
    mapPickerTitle: "Choose Map App",
    mapPickerDescription: "Choose an available app to continue navigation.",
    mapPickerCheckingDescription: "Checking available map apps.",
    mapPickerEmptyDescription: "No available map app was detected on this device.",
    mapPickerFailedDescription: "Map app status cannot be read right now.",
    mapVisibilityLimited: "This map app was not detected on this device.",
    mapCheckUnavailable: "Map app status could not be read.",
    mapOpenFailed: "The map app could not be opened. Choose another available app.",
    requestPermission: "Request permission",
    permissionActionDriven: "This permission is requested by the system when the related action runs.",
    permissionActionDrivenShort: "On action",
    permissionRequestDone: "Permission request handled.",
    webviewLoadFailed: "The action was not completed. Go back and retry.",
    openMap: "Open map",
    pickImages: "Pick images",
    captureImage: "Capture image",
    clearImages: "Clear images",
    keyboardPlaceholder: "Enter text",
    openDownloads: "Client downloads",
    downloadEntryDescription: "View downloadable client packages for this environment.",
    openDiagnostics: "Device diagnostics",
    diagnosticsEntryDescription: "View device capability status.",
    opening: "Processing...",
    openingShort: "Processing",
    checkingShort: "Checking",
    failed: "Action was not completed. Check client status or system permissions.",
    selectedImages: "Selected images",
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
    description: "Go back and retry.",
  },
  loading: {
    title: "Loading...",
  },
};

export const APP_MESSAGES: Record<AppLocale, AppMessages> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export function getMessagesByLocale(locale: AppLocale): AppMessages {
  return APP_MESSAGES[locale];
}
