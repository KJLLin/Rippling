/**
 * 每日运势打卡数据访问层
 *
 * 底层表：user_checkin
 *
 * 设计要点：
 *   1. 运势完全由 userId + 日期确定，不依赖随机数；
 *      同一天刷新多少次结果都一样，第二天自然变化。
 *   2. 日期统一按 Asia/Shanghai 切分，避免 Worker 的 UTC 时区导致
 *      晚上 8 点后"今天"和用户以为的今天不是同一天。
 *   3. 连续天数不落库，按最近记录现算，改规则/补卡都不会算错。
 */

import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

/** 运势档位 */
export type FortuneLevel = "great" | "good" | "small" | "flat" | "bad";

/** 运势结果 */
export interface FortuneInfo {
  level: FortuneLevel;
  /** 中文档位名（大吉 / 中吉 / 小吉 / 中平 / 小凶） */
  label: string;
  /** 宜（2 条） */
  goods: string[];
  /** 忌（2 条） */
  bads: string[];
}

/** 打卡状态（接口直接返回给前端） */
export interface CheckinStatus {
  /** 今天（Asia/Shanghai）的日期，YYYY-MM-DD */
  date: string;
  /** 今天是否已打卡 */
  checkedIn: boolean;
  /** 今日运势 */
  fortune: FortuneInfo;
  /** 当前连续打卡天数（未打卡时算到昨天为止） */
  streak: number;
  /** 累计打卡天数 */
  total: number;
}

/** 各档位的中文名与占比（按 0-99 分桶） */
const LEVELS: ReadonlyArray<{ level: FortuneLevel; label: string; until: number }> = [
  { level: "great", label: "大吉", until: 10 },
  { level: "good", label: "中吉", until: 30 },
  { level: "small", label: "小吉", until: 55 },
  { level: "flat", label: "中平", until: 85 },
  { level: "bad", label: "小凶", until: 100 },
];

/** 宜事项池（校园向，避免玄学感太重） */
const GOOD_POOL = [
  "去食堂",
  "刷几道题",
  "打球",
  "早睡",
  "背单词",
  "问老师",
  "整理错题",
  "和同学聊天",
  "去操场跑两圈",
  "看一集番",
  "提前写作业",
  "喝热水",
];

/** 忌事项池 */
const BAD_POOL = [
  "熬夜",
  "抄作业",
  "上课打瞌睡",
  "对答案",
  "忘带作业",
  "空腹上学",
  "临时抱佛脚",
  "和同学抬杠",
  "刷手机到半夜",
  "拖到最后一天",
  "把水杯落在教室",
  "中午不吃饭",
];

/** FNV-1a 32 位哈希：稳定、够快、不需要随机数 */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 从池子里按种子稳定挑 count 条（不重复） */
function pick(pool: string[], seed: string, count: number): string[] {
  const picked: string[] = [];
  let salt = 0;
  while (picked.length < count && salt < pool.length * 4) {
    const index = hash(`${seed}:${salt}`) % pool.length;
    const item = pool[index];
    if (!picked.includes(item)) picked.push(item);
    salt++;
  }
  return picked;
}

/** 计算某用户某天的运势（纯函数，可重复调用） */
export function computeFortune(userId: string, date: string): FortuneInfo {
  const bucket = hash(`${userId}:${date}:fortune`) % 100;
  const entry = LEVELS.find((item) => bucket < item.until) ?? LEVELS[LEVELS.length - 1];
  return {
    level: entry.level,
    label: entry.label,
    goods: pick(GOOD_POOL, `${userId}:${date}:good`, 2),
    bads: pick(BAD_POOL, `${userId}:${date}:bad`, 2),
  };
}

/** 取 Asia/Shanghai 的今天，格式 YYYY-MM-DD */
export function shanghaiToday(now = new Date()): string {
  // 中国没有夏令时，固定 UTC+8 即可；直接做毫秒偏移比依赖 Intl 时区数据更稳。
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 日期加减（YYYY-MM-DD），只做整日偏移，不受时区影响 */
function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * 计算连续打卡天数
 *
 * 已打卡今天 → 从今天往前数；今天还没打 → 从昨天往前数（保留此前的连续记录，
 * 打卡后自然 +1）。断档一天就归零，和洛谷的连续打卡口径一致。
 */
function calcStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** 读取今天的打卡记录（没有则 null） */
async function getTodayRow(db: D1Database, userId: string, date: string) {
  return db
    .prepare(
      `SELECT level, goods, bads FROM user_checkin
       WHERE userId = ? AND checkinDate = ? LIMIT 1`
    )
    .bind(userId, date)
    .first<{ level: FortuneLevel; goods: string; bads: string }>();
}

/** 读取最近 90 天的打卡日期（足够覆盖任何连续记录） */
async function getRecentDates(db: D1Database, userId: string): Promise<string[]> {
  const rows = await db
    .prepare(
      `SELECT checkinDate FROM user_checkin
       WHERE userId = ? ORDER BY checkinDate DESC LIMIT 90`
    )
    .bind(userId)
    .all<{ checkinDate: string }>();
  return rows.results.map((row) => row.checkinDate);
}

/** 查询今日打卡状态（不写库） */
export async function getCheckinStatus(
  db: D1Database,
  userId: string
): Promise<CheckinStatus> {
  const date = shanghaiToday();
  const [row, dates, totalRow] = await Promise.all([
    getTodayRow(db, userId, date),
    getRecentDates(db, userId),
    db
      .prepare("SELECT COUNT(*) AS total FROM user_checkin WHERE userId = ?")
      .bind(userId)
      .first<{ total: number }>(),
  ]);

  let fortune = computeFortune(userId, date);
  if (row) {
    try {
      const goods = JSON.parse(row.goods) as string[];
      const bads = JSON.parse(row.bads) as string[];
      if (Array.isArray(goods) && Array.isArray(bads)) {
        fortune = {
          level: row.level,
          label: LEVELS.find((item) => item.level === row.level)?.label ?? fortune.label,
          goods,
          bads,
        };
      }
    } catch {
      // 存量数据损坏时回退到纯函数结果，不影响打卡
    }
  }

  return {
    date,
    checkedIn: Boolean(row),
    fortune,
    streak: calcStreak(dates, date),
    total: totalRow?.total ?? 0,
  };
}

/**
 * 今日打卡
 *
 * INSERT OR IGNORE + 唯一索引保证并发重复提交只会落一条；
 * 已打卡时直接返回当前状态，前端按 checkedIn 显示"今日已打卡"。
 */
export async function createCheckin(
  db: D1Database,
  userId: string
): Promise<{ status: CheckinStatus; alreadyChecked: boolean }> {
  const date = shanghaiToday();
  const existing = await getTodayRow(db, userId, date);
  if (existing) {
    return { status: await getCheckinStatus(db, userId), alreadyChecked: true };
  }

  const fortune = computeFortune(userId, date);
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_checkin
         (id, userId, checkinDate, level, goods, bads, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateUUID(),
      userId,
      date,
      fortune.level,
      JSON.stringify(fortune.goods),
      JSON.stringify(fortune.bads),
      nowISO()
    )
    .run();

  return { status: await getCheckinStatus(db, userId), alreadyChecked: false };
}
