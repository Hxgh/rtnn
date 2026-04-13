import type { AdminLocale } from "@/src/lib/preferences";

type CommonDictionary = {
  appName: string;
  console: string;
  locale: string;
  theme: string;
  cancel: string;
  requiredFields: string;
  enterFullscreen: string;
  exitFullscreen: string;
  light: string;
  dark: string;
  system: string;
  chinese: string;
  english: string;
  save: string;
  saving: string;
  saveFailed: string;
  retry: string;
  search: string;
  create: string;
  update: string;
  detail: string;
  status: string;
  actions: string;
  breadcrumb: string;
  toggleSidebar: string;
  sidebar: string;
  mobileSidebarDescription: string;
  active: string;
  disabled: string;
  inactive: string;
  blocked: string;
  clearFilters: string;
  previousPage: string;
  nextPage: string;
  totalItems: string;
  itemsPerPage: string;
};

type NavDictionary = {
  overview: string;
  workspaceSection: string;
  businessSection: string;
  accessSection: string;
  systemSection: string;
  customers: string;
  users: string;
  roles: string;
  auditLogs: string;
  account: string;
};

type AuthDictionary = {
  brand: string;
  heading: string;
  description: string;
  signIn: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  continue: string;
  invalid: string;
  unavailable: string;
};

type DashboardDictionary = {
  title: string;
  totalUsers: string;
  totalCustomers: string;
  totalRoles: string;
  suspendedCustomers: string;
  recentAuditCount: string;
};

type UsersDictionary = {
  title: string;
  newUser: string;
  editUser: string;
  userDetail: string;
  email: string;
  name: string;
  roles: string;
  createdAt: string;
  lastLoginAt: string;
  status: string;
  password: string;
  empty: string;
};

type RolesDictionary = {
  title: string;
  newRole: string;
  editRole: string;
  roleDetail: string;
  roleName: string;
  description: string;
  permissions: string;
  createdAt: string;
  updatedAt: string;
  empty: string;
};

type CustomersDictionary = {
  title: string;
  newCustomer: string;
  editCustomer: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  groups: string;
  tags: string;
  status: string;
  lastLoginAt: string;
  allStatuses: string;
  allGroups: string;
  allTags: string;
  empty: string;
};

type AuditDictionary = {
  title: string;
  actor: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  detail: string;
  allActorTypes: string;
  adminActor: string;
  customerActor: string;
  systemActor: string;
  empty: string;
};

type AccountDictionary = {
  title: string;
  profile: string;
  name: string;
  email: string;
  roles: string;
  securityTitle: string;
  securityDescription: string;
  confirmPassword: string;
  passwordSessionNotice: string;
  currentPassword: string;
  nextPassword: string;
  changePassword: string;
  showPassword: string;
  hidePassword: string;
  passwordUpdated: string;
  passwordRequired: string;
  passwordMismatch: string;
  passwordSameAsCurrent: string;
  passwordTooShort: string;
  passwordCurrentInvalid: string;
  passwordSaveFailed: string;
};

type StatesDictionary = {
  loadingAdminShell: string;
  loadingDashboard: string;
  runtimeError: string;
  unexpectedFailure: string;
  dashboardError: string;
  pageNotFound: string;
  pageNotFoundDescription: string;
  goDashboard: string;
  accessDenied: string;
  accessDeniedDescription: string;
  loading: string;
  empty: string;
  apiUnavailable: string;
};

type FooterDictionary = {
  backToDashboard: string;
  signOut: string;
};

export type AdminDictionary = {
  common: CommonDictionary;
  nav: NavDictionary;
  auth: AuthDictionary;
  dashboard: DashboardDictionary;
  customers: CustomersDictionary;
  users: UsersDictionary;
  roles: RolesDictionary;
  auditLogs: AuditDictionary;
  account: AccountDictionary;
  states: StatesDictionary;
  footer: FooterDictionary;
};

const zhCN: AdminDictionary = {
  common: {
    appName: "RTNN 管理后台",
    console: "控制台",
    locale: "语言",
    theme: "主题",
    cancel: "取消",
    requiredFields: "请完整填写必填字段。",
    enterFullscreen: "进入全屏",
    exitFullscreen: "退出全屏",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    chinese: "中文",
    english: "English",
    save: "保存",
    saving: "保存中...",
    saveFailed: "保存失败，请稍后重试。",
    retry: "重试",
    search: "搜索",
    create: "创建",
    update: "更新",
    detail: "详情",
    status: "状态",
    actions: "操作",
    breadcrumb: "面包屑导航",
    toggleSidebar: "切换侧边栏",
    sidebar: "侧边导航",
    mobileSidebarDescription: "显示移动端侧边导航。",
    active: "启用",
    disabled: "禁用",
    inactive: "未激活",
    blocked: "封禁",
    clearFilters: "清空筛选",
    previousPage: "上一页",
    nextPage: "下一页",
    totalItems: "总条数",
    itemsPerPage: "每页条数",
  },
  nav: {
    overview: "总览",
    workspaceSection: "工作台",
    businessSection: "客户运营",
    accessSection: "权限管理",
    systemSection: "系统",
    customers: "客户管理",
    users: "用户管理",
    roles: "角色管理",
    auditLogs: "审计日志",
    account: "个人中心",
  },
  auth: {
    brand: "RTNN 管理后台",
    heading: "管理员登录",
    description: "使用管理员账号登录控制台。",
    signIn: "登录",
    email: "邮箱",
    emailPlaceholder: "请输入邮箱",
    password: "密码",
    passwordPlaceholder: "请输入密码",
    continue: "继续",
    invalid: "账号或密码错误，请重试。",
    unavailable: "登录服务暂不可用，请稍后再试。",
  },
  dashboard: {
    title: "系统运营看板",
    totalUsers: "用户规模",
    totalCustomers: "客户规模",
    totalRoles: "角色数量",
    suspendedCustomers: "受限客户",
    recentAuditCount: "近期审计量",
  },
  customers: {
    title: "客户管理",
    newCustomer: "新建客户",
    editCustomer: "编辑客户",
    name: "姓名",
    email: "邮箱",
    password: "初始密码",
    phone: "手机号",
    groups: "客户分组",
    tags: "客户标签",
    status: "状态",
    lastLoginAt: "最后登录",
    allStatuses: "全部状态",
    allGroups: "全部分组",
    allTags: "全部标签",
    empty: "暂无客户数据",
  },
  users: {
    title: "用户管理",
    newUser: "新建用户",
    editUser: "编辑用户",
    userDetail: "用户详情",
    email: "邮箱",
    name: "姓名",
    roles: "角色",
    createdAt: "创建时间",
    lastLoginAt: "最后登录",
    status: "状态",
    password: "初始密码",
    empty: "暂无用户数据",
  },
  roles: {
    title: "角色管理",
    newRole: "新建角色",
    editRole: "编辑角色",
    roleDetail: "角色详情",
    roleName: "角色名",
    description: "描述",
    permissions: "权限",
    createdAt: "创建时间",
    updatedAt: "更新时间",
    empty: "暂无角色数据",
  },
  auditLogs: {
    title: "审计日志",
    actor: "操作者",
    actorType: "操作者类型",
    action: "动作",
    resourceType: "资源类型",
    resourceId: "资源 ID",
    createdAt: "时间",
    detail: "详情",
    allActorTypes: "全部操作者",
    adminActor: "管理员",
    customerActor: "客户",
    systemActor: "系统",
    empty: "暂无审计数据",
  },
  account: {
    title: "个人中心",
    profile: "个人信息",
    name: "名称",
    email: "邮箱",
    roles: "角色",
    securityTitle: "密码安全",
    securityDescription: "修改当前管理员账号的登录密码，并刷新当前设备会话。",
    confirmPassword: "确认新密码",
    passwordSessionNotice: "密码更新后，其他已登录设备需要重新登录，当前设备会自动续期。",
    currentPassword: "当前密码",
    nextPassword: "新密码",
    changePassword: "修改密码",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    passwordUpdated: "密码更新成功，当前设备会继续保持登录。",
    passwordRequired: "当前密码和新密码不能为空。",
    passwordMismatch: "两次输入的新密码不一致。",
    passwordSameAsCurrent: "新密码不能与当前密码相同。",
    passwordTooShort: "新密码长度至少为 8 位。",
    passwordCurrentInvalid: "当前密码不正确，请重新输入。",
    passwordSaveFailed: "密码更新失败，请确认当前密码后重试。",
  },
  states: {
    loadingAdminShell: "正在加载管理端壳子...",
    loadingDashboard: "正在加载看板数据...",
    runtimeError: "运行时错误",
    unexpectedFailure: "系统出现异常",
    dashboardError: "看板加载失败",
    pageNotFound: "页面不存在",
    pageNotFoundDescription: "当前路由未注册对应视图。",
    goDashboard: "返回看板",
    accessDenied: "无权限访问",
    accessDeniedDescription: "当前账号没有该功能权限。",
    loading: "加载中...",
    empty: "暂无数据",
    apiUnavailable: "接口暂不可用，请稍后重试。",
  },
  footer: {
    backToDashboard: "回到看板",
    signOut: "退出登录",
  },
};

const enUS: AdminDictionary = {
  common: {
    appName: "RTNN Admin",
    console: "Console",
    locale: "Locale",
    theme: "Theme",
    cancel: "Cancel",
    requiredFields: "Please complete all required fields.",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    light: "Light",
    dark: "Dark",
    system: "System",
    chinese: "中文",
    english: "English",
    save: "Save",
    saving: "Saving...",
    saveFailed: "Failed to save. Please try again.",
    retry: "Retry",
    search: "Search",
    create: "Create",
    update: "Update",
    detail: "Detail",
    status: "Status",
    actions: "Actions",
    breadcrumb: "Breadcrumb",
    toggleSidebar: "Toggle sidebar",
    sidebar: "Sidebar navigation",
    mobileSidebarDescription: "Displays the mobile sidebar navigation.",
    active: "Active",
    disabled: "Disabled",
    inactive: "Inactive",
    blocked: "Blocked",
    clearFilters: "Clear filters",
    previousPage: "Previous",
    nextPage: "Next",
    totalItems: "Total",
    itemsPerPage: "Rows per page",
  },
  nav: {
    overview: "Overview",
    workspaceSection: "Workspace",
    businessSection: "Customer Ops",
    accessSection: "Access Control",
    systemSection: "System",
    customers: "Customers",
    users: "Users",
    roles: "Roles",
    auditLogs: "Audit Logs",
    account: "Account",
  },
  auth: {
    brand: "RTNN Admin",
    heading: "Admin sign in",
    description: "Sign in with your admin account to access the console.",
    signIn: "Sign in",
    email: "Email",
    emailPlaceholder: "Enter your email",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    continue: "Continue",
    invalid: "Invalid email or password. Please try again.",
    unavailable: "Login service is temporarily unavailable. Please try again later.",
  },
  dashboard: {
    title: "System Operations Dashboard",
    totalUsers: "User count",
    totalCustomers: "Customer count",
    totalRoles: "Role count",
    suspendedCustomers: "Restricted customers",
    recentAuditCount: "Recent audit volume",
  },
  customers: {
    title: "Customer Management",
    newCustomer: "Create customer",
    editCustomer: "Edit customer",
    name: "Name",
    email: "Email",
    password: "Initial password",
    phone: "Phone",
    groups: "Groups",
    tags: "Tags",
    status: "Status",
    lastLoginAt: "Last login",
    allStatuses: "All statuses",
    allGroups: "All groups",
    allTags: "All tags",
    empty: "No customers yet.",
  },
  users: {
    title: "User Management",
    newUser: "Create user",
    editUser: "Edit user",
    userDetail: "User detail",
    email: "Email",
    name: "Name",
    roles: "Roles",
    createdAt: "Created at",
    lastLoginAt: "Last login",
    status: "Status",
    password: "Initial password",
    empty: "No users yet.",
  },
  roles: {
    title: "Role Management",
    newRole: "Create role",
    editRole: "Edit role",
    roleDetail: "Role detail",
    roleName: "Role name",
    description: "Description",
    permissions: "Permissions",
    createdAt: "Created at",
    updatedAt: "Updated at",
    empty: "No roles yet.",
  },
  auditLogs: {
    title: "Audit Logs",
    actor: "Actor",
    actorType: "Actor type",
    action: "Action",
    resourceType: "Resource type",
    resourceId: "Resource ID",
    createdAt: "Time",
    detail: "Detail",
    allActorTypes: "All actors",
    adminActor: "Admin",
    customerActor: "Customer",
    systemActor: "System",
    empty: "No audit logs yet.",
  },
  account: {
    title: "Account Center",
    profile: "Profile",
    name: "Name",
    email: "Email",
    roles: "Roles",
    securityTitle: "Password Security",
    securityDescription: "Update the current admin password and rotate the current device session.",
    confirmPassword: "Confirm new password",
    passwordSessionNotice: "Other signed-in devices will be asked to sign in again. This device will rotate its session automatically.",
    currentPassword: "Current password",
    nextPassword: "New password",
    changePassword: "Change password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    passwordUpdated: "Password updated. This device stays signed in.",
    passwordRequired: "Current password and new password are required.",
    passwordMismatch: "The new passwords do not match.",
    passwordSameAsCurrent: "The new password must be different from the current password.",
    passwordTooShort: "The new password must be at least 8 characters.",
    passwordCurrentInvalid: "The current password is incorrect.",
    passwordSaveFailed: "Failed to update password. Verify your current password and try again.",
  },
  states: {
    loadingAdminShell: "Loading admin shell...",
    loadingDashboard: "Loading dashboard data...",
    runtimeError: "Runtime Error",
    unexpectedFailure: "Unexpected failure",
    dashboardError: "Dashboard Error",
    pageNotFound: "Page not found",
    pageNotFoundDescription: "No view is registered for this route.",
    goDashboard: "Go to dashboard",
    accessDenied: "Access denied",
    accessDeniedDescription: "Your account does not have this permission.",
    loading: "Loading...",
    empty: "No data",
    apiUnavailable: "API is temporarily unavailable.",
  },
  footer: {
    backToDashboard: "Back to dashboard",
    signOut: "Sign out",
  },
};

export function getAdminDictionary(locale: AdminLocale): AdminDictionary {
  if (locale === "en-US") {
    return enUS;
  }
  return zhCN;
}
