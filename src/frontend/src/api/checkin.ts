/**
 * 每日运势打卡 API（/api/checkin）
 *
 * 对齐洛谷：六档运势，每条宜忌带一句结果说明；
 * 大吉只有宜 + "万事皆宜"，大凶只有忌 + "诸事不宜"。
 */

import { apiGet, apiPost } from "./client";

/** 运势档位 */
export type FortuneLevel = "great" | "good" | "small" | "flat" | "bad" | "terrible";

/** 单条宜 / 忌 */
export interface FortuneItem {
  text: string;
  note: string;
}

export interface FortuneInfo {
  level: FortuneLevel;
  label: string;
  goods: FortuneItem[];
  bads: FortuneItem[];
  /** 大吉"万事皆宜" / 大凶"诸事不宜"，其余为 null */
  summary: string | null;
}

export interface CheckinStatus {
  date: string;
  checkedIn: boolean;
  /** 未打卡时为 null，打卡后才揭晓 */
  fortune: FortuneInfo | null;
  streak: number;
  total: number;
  /** 仅 POST 返回：本次提交时是否已经打过卡 */
  alreadyChecked?: boolean;
}

/** 今日运势与打卡状态 */
export function getCheckinStatus(): Promise<CheckinStatus> {
  return apiGet<CheckinStatus>("/api/checkin/status", { silentError: true });
}

/** 今日打卡（重复提交幂等） */
export function doCheckin(): Promise<CheckinStatus> {
  return apiPost<CheckinStatus>("/api/checkin");
}
