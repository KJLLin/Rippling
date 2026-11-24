/**
 * 每日运势打卡 API（/api/checkin）
 */

import { apiGet, apiPost } from "./client";

/** 运势档位 */
export type FortuneLevel = "great" | "good" | "small" | "flat" | "bad";

export interface FortuneInfo {
  level: FortuneLevel;
  label: string;
  goods: string[];
  bads: string[];
}

export interface CheckinStatus {
  date: string;
  checkedIn: boolean;
  fortune: FortuneInfo;
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
