/**
 * 全站权限元信息（管理面板用）
 *
 * 把 38 个权限位翻译成人能看懂的分组 + 开关，
 * 管理页面不再直接让管理员输入十进制权限码。
 */

import {
  PERM_VIEW_SITE,
  PERM_CREATE_POST,
  PERM_COMMENT,
  PERM_LIKE,
  PERM_EDIT_OWN_POST,
  PERM_DELETE_OWN_POST,
  PERM_EDIT_OTHERS_POST,
  PERM_DELETE_OTHERS_POST,
  PERM_PIN_POST,
  PERM_CREATE_CONFESSION,
  PERM_VIEW_CONFESSION,
  PERM_VIEW_POST,
  PERM_VIEW_TIMELINE,
  PERM_SUBMIT_TIMELINE,
  PERM_REVIEW_TIMELINE,
  PERM_EDIT_OTHERS_PERMISSION,
  PERM_ACCESS_ADMIN_PANEL,
  PERM_VIEW_DATABASE,
  PERM_EDIT_DATABASE,
  PERM_SUBMIT_PERMISSION_REQUEST,
  PERM_SUBMIT_REPORT,
  PERM_SUBMIT_APPEAL,
  PERM_SUBMIT_BLOCK_CREATE,
  PERM_MANAGE_BLOCK,
  PERM_VIEW_TICKET,
  PERM_HANDLE_TICKET,
  PERM_MODIFY_OWN_USERNAME,
  PERM_SET_NAME_BADGE,
  PERM_SUBMIT_VERIFICATION,
  PERM_MODIFY_PASSWORD,
  PERM_FOLLOW_USER,
  PERM_ENABLE_QUESTION_BOX,
  PERM_VIEW_QUESTION_BOX,
  PERM_ASK_QUESTION,
  PERM_VIEW_ANONYMOUS_IDENTITY,
  PERM_VIEW_ADMIN_LOG,
  PERM_UPLOAD_IMAGE,
  PERM_CREATE_VOTE,
  toPermissionsBigInt,
  hasPermission,
} from "./permission";

export interface PermissionItem {
  bit: number;
  label: string;
  desc: string;
}

export interface PermissionGroup {
  key: string;
  title: string;
  desc: string;
  items: PermissionItem[];
}

/** 全站权限分组（覆盖 0-37 全部权限位） */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "basic",
    title: "基础使用",
    desc: "看帖、发帖、评论这些日常操作",
    items: [
      { bit: PERM_VIEW_SITE, label: "进入站点", desc: "关闭后账号等于被完全封禁" },
      { bit: PERM_VIEW_POST, label: "查看帖子", desc: "浏览帖子与评论" },
      { bit: PERM_CREATE_POST, label: "发帖", desc: "发布主题帖与回复" },
      { bit: PERM_COMMENT, label: "评论", desc: "在帖子下发表评论" },
      { bit: PERM_LIKE, label: "点赞", desc: "给帖子和评论点赞" },
      { bit: PERM_EDIT_OWN_POST, label: "编辑自己的帖子", desc: "修改自己发的内容" },
      { bit: PERM_DELETE_OWN_POST, label: "删除自己的帖子", desc: "删除自己发的内容" },
      { bit: PERM_UPLOAD_IMAGE, label: "上传图片", desc: "发帖时附带图片" },
    ],
  },
  {
    key: "community",
    title: "社区功能",
    desc: "表白墙、大事记、投票、提问箱等",
    items: [
      { bit: PERM_VIEW_CONFESSION, label: "查看表白墙", desc: "浏览表白墙内容" },
      { bit: PERM_CREATE_CONFESSION, label: "发布表白墙", desc: "匿名发布表白内容" },
      { bit: PERM_VIEW_TIMELINE, label: "查看大事记", desc: "浏览学校大事记" },
      { bit: PERM_SUBMIT_TIMELINE, label: "提交大事记", desc: "向大事记投稿" },
      { bit: PERM_CREATE_VOTE, label: "创建投票", desc: "发起新的投票" },
      { bit: PERM_FOLLOW_USER, label: "关注他人", desc: "关注其他同学" },
      { bit: PERM_ENABLE_QUESTION_BOX, label: "启用提问箱", desc: "开放自己的提问箱" },
      { bit: PERM_VIEW_QUESTION_BOX, label: "查看提问箱", desc: "查看他人的提问箱" },
      { bit: PERM_ASK_QUESTION, label: "向提问箱提问", desc: "匿名向他人提问" },
      { bit: PERM_MODIFY_OWN_USERNAME, label: "修改用户名", desc: "自己改昵称" },
      { bit: PERM_MODIFY_PASSWORD, label: "修改密码", desc: "自己改登录密码" },
      { bit: PERM_SUBMIT_VERIFICATION, label: "提交认证", desc: "提交认证工单" },
      { bit: PERM_SET_NAME_BADGE, label: "设置昵称徽章", desc: "给自己设置牌子" },
    ],
  },
  {
    key: "request",
    title: "申请与举报",
    desc: "向管理员发起申请或反馈",
    items: [
      { bit: PERM_SUBMIT_PERMISSION_REQUEST, label: "提交权限申请", desc: "申请额外权限" },
      { bit: PERM_SUBMIT_REPORT, label: "提交举报", desc: "举报违规内容" },
      { bit: PERM_SUBMIT_APPEAL, label: "提交申诉", desc: "对处罚提出申诉" },
      { bit: PERM_SUBMIT_BLOCK_CREATE, label: "申请创建板块", desc: "提交建板工单" },
    ],
  },
  {
    key: "admin",
    title: "管理权限",
    desc: "进入后台、管理内容与工单",
    items: [
      { bit: PERM_ACCESS_ADMIN_PANEL, label: "进入管理面板", desc: "打开管理后台" },
      { bit: PERM_EDIT_OTHERS_POST, label: "编辑他人帖子", desc: "修改别人发的内容" },
      { bit: PERM_DELETE_OTHERS_POST, label: "删除他人帖子", desc: "删除别人发的内容" },
      { bit: PERM_PIN_POST, label: "置顶帖子", desc: "把内容放到首页置顶" },
      { bit: PERM_REVIEW_TIMELINE, label: "审核大事记", desc: "审批大事记投稿" },
      { bit: PERM_MANAGE_BLOCK, label: "全站板块管理", desc: "锁定、删除、转让板块" },
      { bit: PERM_VIEW_TICKET, label: "查看工单", desc: "查看用户提交的工单" },
      { bit: PERM_HANDLE_TICKET, label: "处理工单", desc: "批准或拒绝工单" },
      { bit: PERM_VIEW_ANONYMOUS_IDENTITY, label: "查看匿名身份", desc: "看穿匿名发帖人" },
      { bit: PERM_VIEW_ADMIN_LOG, label: "查看管理日志", desc: "查看管理员操作记录" },
    ],
  },
  {
    key: "system",
    title: "系统权限（谨慎）",
    desc: "改别人权限、碰数据库，给错人风险很高",
    items: [
      { bit: PERM_EDIT_OTHERS_PERMISSION, label: "编辑他人权限", desc: "修改任何人的权限" },
      { bit: PERM_VIEW_DATABASE, label: "查看数据库", desc: "浏览数据库表和归档" },
      { bit: PERM_EDIT_DATABASE, label: "执行 SQL", desc: "在后台执行只读查询" },
    ],
  },
];

/** 所有权限位（扁平） */
export const ALL_PERMISSION_ITEMS: PermissionItem[] = PERMISSION_GROUPS.flatMap(
  (group) => group.items
);

/** 角色预设 */
export const PERMISSION_PRESETS: { key: string; label: string; desc: string; bits: number[] }[] = [
  {
    key: "user",
    label: "普通用户",
    desc: "看帖、发帖、评论、投票等基础功能",
    bits: [
      PERM_VIEW_SITE, PERM_VIEW_POST, PERM_VIEW_CONFESSION, PERM_VIEW_TIMELINE,
      PERM_VIEW_QUESTION_BOX, PERM_LIKE, PERM_COMMENT, PERM_SUBMIT_REPORT,
      PERM_SUBMIT_APPEAL, PERM_SUBMIT_PERMISSION_REQUEST, PERM_SUBMIT_BLOCK_CREATE,
      PERM_UPLOAD_IMAGE, PERM_CREATE_POST, PERM_EDIT_OWN_POST, PERM_DELETE_OWN_POST,
      PERM_CREATE_CONFESSION, PERM_SUBMIT_TIMELINE, PERM_MODIFY_OWN_USERNAME,
      PERM_MODIFY_PASSWORD, PERM_FOLLOW_USER, PERM_ENABLE_QUESTION_BOX,
      PERM_ASK_QUESTION, PERM_CREATE_VOTE, PERM_SUBMIT_VERIFICATION,
    ],
  },
  {
    key: "verified",
    label: "认证用户",
    desc: "普通用户 + 昵称徽章",
    bits: [
      PERM_VIEW_SITE, PERM_VIEW_POST, PERM_VIEW_CONFESSION, PERM_VIEW_TIMELINE,
      PERM_VIEW_QUESTION_BOX, PERM_LIKE, PERM_COMMENT, PERM_SUBMIT_REPORT,
      PERM_SUBMIT_APPEAL, PERM_SUBMIT_PERMISSION_REQUEST, PERM_SUBMIT_BLOCK_CREATE,
      PERM_UPLOAD_IMAGE, PERM_CREATE_POST, PERM_EDIT_OWN_POST, PERM_DELETE_OWN_POST,
      PERM_CREATE_CONFESSION, PERM_SUBMIT_TIMELINE, PERM_MODIFY_OWN_USERNAME,
      PERM_MODIFY_PASSWORD, PERM_FOLLOW_USER, PERM_ENABLE_QUESTION_BOX,
      PERM_ASK_QUESTION, PERM_CREATE_VOTE, PERM_SUBMIT_VERIFICATION,
      PERM_SET_NAME_BADGE,
    ],
  },
  {
    key: "admin",
    label: "管理员",
    desc: "认证用户 + 管理面板、内容管理与工单",
    bits: [
      PERM_VIEW_SITE, PERM_VIEW_POST, PERM_VIEW_CONFESSION, PERM_VIEW_TIMELINE,
      PERM_VIEW_QUESTION_BOX, PERM_LIKE, PERM_COMMENT, PERM_SUBMIT_REPORT,
      PERM_SUBMIT_APPEAL, PERM_SUBMIT_PERMISSION_REQUEST, PERM_SUBMIT_BLOCK_CREATE,
      PERM_UPLOAD_IMAGE, PERM_CREATE_POST, PERM_EDIT_OWN_POST, PERM_DELETE_OWN_POST,
      PERM_CREATE_CONFESSION, PERM_SUBMIT_TIMELINE, PERM_MODIFY_OWN_USERNAME,
      PERM_MODIFY_PASSWORD, PERM_FOLLOW_USER, PERM_ENABLE_QUESTION_BOX,
      PERM_ASK_QUESTION, PERM_CREATE_VOTE, PERM_SUBMIT_VERIFICATION,
      PERM_SET_NAME_BADGE, PERM_ACCESS_ADMIN_PANEL, PERM_EDIT_OTHERS_POST,
      PERM_DELETE_OTHERS_POST, PERM_PIN_POST, PERM_REVIEW_TIMELINE,
      PERM_MANAGE_BLOCK, PERM_VIEW_TICKET, PERM_HANDLE_TICKET,
      PERM_VIEW_ANONYMOUS_IDENTITY, PERM_VIEW_ADMIN_LOG, PERM_VIEW_DATABASE,
    ],
  },
  {
    key: "superadmin",
    label: "站长",
    desc: "全部 38 项权限，包含修改他人权限和数据库",
    bits: Array.from({ length: 38 }, (_, i) => i),
  },
];

/** 权限位数组 → 十进制掩码字符串 */
export function maskFromBits(bits: number[]): string {
  let mask = 0n;
  for (const bit of bits) mask |= 1n << BigInt(bit);
  return mask.toString();
}

/** 掩码里有多少项权限 */
export function countPermissions(permissions: bigint | string | number): number {
  let mask = toPermissionsBigInt(permissions);
  let count = 0;
  while (mask > 0n) {
    if (mask & 1n) count++;
    mask >>= 1n;
  }
  return count;
}

/** 用一句人话描述权限组合（列表和详情里替代十进制掩码） */
export function describePermissions(permissions: bigint | string | number): string {
  const count = countPermissions(permissions);
  if (count === 0) return "无权限";
  if (count === 38) return "站长（全部权限）";
  if (hasPermission(permissions, PERM_EDIT_OTHERS_PERMISSION)) return `管理员（${count} 项）`;
  if (hasPermission(permissions, PERM_ACCESS_ADMIN_PANEL)) return `管理员（${count} 项）`;
  if (hasPermission(permissions, PERM_SET_NAME_BADGE)) return `认证用户（${count} 项）`;
  if (hasPermission(permissions, PERM_CREATE_POST)) return `普通用户（${count} 项）`;
  return `自定义（${count} 项）`;
}
