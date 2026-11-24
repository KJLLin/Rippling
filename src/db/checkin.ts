/**
 * 每日运势打卡数据访问层（对齐洛谷规则，不含经验/活跃值奖励）
 *
 * 底层表：user_checkin
 *
 * 对齐点：
 *   1. 六档运势：大吉 / 中吉 / 小吉 / 中平 / 凶 / 大凶
 *   2. 大吉：两宜 + 万事皆宜（无忌）；大凶：诸事不宜 + 两忌（无宜）
 *   3. 中吉 / 小吉 / 中平 / 凶：两宜 + 两忌
 *   4. 每条宜忌都带一句结果说明（前端两行展示）
 *   5. 断签不清零：连续漏签 n 天，连续天数减 2^(n-1)，最低到 0
 *   6. 日期按 UTC+8 切分，次日 0:00 刷新
 *
 * 未包含：洛谷的经验/活跃值奖励。
 */

import { generateUUID } from "../utils/uuid";
import { nowISO } from "../utils/time";

/** 运势档位 */
export type FortuneLevel = "great" | "good" | "small" | "flat" | "bad" | "terrible";

/** 单条宜 / 忌 */
export interface FortuneItem {
  /** 主项，如"刷题" */
  text: string;
  /** 结果说明，如"成为刷题狂魔" */
  note: string;
}

/** 运势结果 */
export interface FortuneInfo {
  level: FortuneLevel;
  /** 中文档位名（大吉 / 中吉 / 小吉 / 中平 / 凶 / 大凶） */
  label: string;
  /** 宜（大凶时为空） */
  goods: FortuneItem[];
  /** 忌（大吉时为空） */
  bads: FortuneItem[];
  /** 大吉"万事皆宜" / 大凶"诸事不宜"，其余为 null */
  summary: string | null;
}

/** 打卡状态（接口直接返回给前端） */
export interface CheckinStatus {
  /** 今天（Asia/Shanghai）的日期，YYYY-MM-DD */
  date: string;
  /** 今天是否已打卡 */
  checkedIn: boolean;
  /** 今日运势；未打卡时为 null（打卡后才揭晓） */
  fortune: FortuneInfo | null;
  /** 当前连续打卡天数（未打卡时算到上一次打卡为止） */
  streak: number;
  /** 累计打卡天数 */
  total: number;
}

/** 六档及分桶（0-99）：大吉与大凶各 5%，中段更常见 */
const LEVELS: ReadonlyArray<{ level: FortuneLevel; label: string; until: number }> = [
  { level: "great", label: "大吉", until: 5 },
  { level: "good", label: "中吉", until: 25 },
  { level: "small", label: "小吉", until: 55 },
  { level: "flat", label: "中平", until: 85 },
  { level: "bad", label: "凶", until: 95 },
  { level: "terrible", label: "大凶", until: 100 },
];

/** 宜事项池：主项 + 结果说明 */
const GOOD_POOL: ReadonlyArray<FortuneItem> = [
  { text: "刷题", note: "成为刷题狂魔" },
  { text: "去食堂", note: "爱吃的菜刚好没卖完" },
  { text: "打球", note: "手感火热，怎么投怎么有" },
  { text: "早睡", note: "第二天精神满满" },
  { text: "背单词", note: "过目不忘" },
  { text: "问老师", note: "一点就通" },
  { text: "整理错题", note: "考试少踩一个坑" },
  { text: "和同学聊天", note: "心情变好" },
  { text: "去操场跑两圈", note: "跑完一身轻" },
  { text: "看一集番", note: "刚好是神回" },
  { text: "提前写作业", note: "晚上一点都不慌" },
  { text: "喝热水", note: "嗓子舒服一整天" },
  { text: "上洛谷", note: "全方位提升" },
  { text: "膜拜大神", note: "接受神犇光环照耀" },
  { text: "写作文", note: "非常有文采" },
  { text: "唱歌", note: "成为歌神" },
  { text: "网购", note: "买到历史最低价" },
  { text: "看视频网站", note: "愉悦身心" },
  { text: "扶老奶奶过马路", note: "增加 RP" },
  { text: "背课文", note: "看一遍就背下来了" },
];

/** 忌事项池：主项 + 结果说明 */
const BAD_POOL: ReadonlyArray<FortuneItem> = [
  { text: "熬夜", note: "第二天上课困成狗" },
  { text: "抄作业", note: "被老师当场抓获" },
  { text: "上课打瞌睡", note: "错过最重要的那一步" },
  { text: "对答案", note: "越对越慌" },
  { text: "忘带作业", note: "被点名的那一个就是你" },
  { text: "空腹上学", note: "第三节课饿到走神" },
  { text: "临时抱佛脚", note: "考场大脑一片空白" },
  { text: "和同学抬杠", note: "友谊 -1" },
  { text: "刷手机到半夜", note: "视力 -1" },
  { text: "拖到最后一天", note: "质量直线下降" },
  { text: "把水杯落在教室", note: "下午没水喝" },
  { text: "中午不吃饭", note: "下午没力气" },
  { text: "重构代码", note: "越改越乱" },
  { text: "交朋友", note: "交友不慎" },
  { text: "请教问题", note: "被当成伸手党" },
  { text: "上洛谷", note: "你谷日爆" },
  { text: "打线上公开赛", note: "掉大分" },
  { text: "抽卡", note: "只有保底" },
  { text: "玩我的世界", note: "转角遇到苦力怕" },
  { text: "抢最优解", note: "越卡常越慢" },
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
function pick(pool: ReadonlyArray<FortuneItem>, seed: string, count: number): FortuneItem[] {
  const picked: FortuneItem[] = [];
  let salt = 0;
  while (picked.length < count && salt < pool.length * 4) {
    const item = pool[hash(`${seed}:${salt}`) % pool.length];
    if (item && !picked.some((p) => p.text === item.text)) picked.push(item);
    salt++;
  }
  return picked;
}

/** 档位中文名 */
function labelOf(level: FortuneLevel): string {
  return LEVELS.find((item) => item.level === level)?.label ?? "中平";
}

/** 计算某用户某天的运势（纯函数，可重复调用） */
export function computeFortune(userId: string, date: string): FortuneInfo {
  const bucket = hash(`${userId}:${date}:fortune`) % 100;
  const entry = LEVELS.find((item) => bucket < item.until) ?? LEVELS[LEVELS.length - 1];
  const level = entry?.level ?? "flat";

  // 大吉没有忌，大凶没有宜
  const goods = level === "terrible" ? [] : pick(GOOD_POOL, `${userId}:${date}:good`, 2);
  const bads = level === "great" ? [] : pick(BAD_POOL, `${userId}:${date}:bad`, 2);
  const summary = level === "great" ? "万事皆宜" : level === "terrible" ? "诸事不宜" : null;

  return { level, label: labelOf(level), goods, bads, summary };
}

/** 取 UTC+8 的今天，格式 YYYY-MM-DD（中国无夏令时） */
export function shanghaiToday(now = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 日期转"第几天"，方便算间隔 */
function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / 86400000);
}

/**
 * 计算连续打卡天数（洛谷口径，断签只扣不归零）
 *
 * 按时间顺序重放：每两次打卡之间漏了 n 天，先扣 2^(n-1) 天，再加当天 1 天。
 * 这样无论查历史还是刚打完卡，结果都一致。
 */
function calcStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let streak = 0;
  let prev: string | null = null;

  for (const date of sorted) {
    if (prev !== null) {
      const missed = dayNumber(date) - dayNumber(prev) - 1;
      if (missed > 0) {
        // 2^(missed-1) 可能很大，直接扣到 0 即可
        const penalty = missed > 31 ? streak : 2 ** (missed - 1);
        streak = Math.max(0, streak - penalty);
      }
    }
    streak += 1;
    prev = date;
  }

  return streak;
}

/** 把库里存的 JSON 转成带说明的宜忌（兼容早期纯字符串格式） */
function parseItems(raw: string): FortuneItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return { text: item, note: "" };
        if (item && typeof item === "object") {
          const obj = item as { text?: unknown; note?: unknown };
          return {
            text: typeof obj.text === "string" ? obj.text : "",
            note: typeof obj.note === "string" ? obj.note : "",
          };
        }
        return null;
      })
      .filter((item): item is FortuneItem => Boolean(item && item.text));
  } catch {
    return [];
  }
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

/** 读取全部打卡日期（上限 1000 条，足够算多年连续记录） */
async function getCheckinDates(db: D1Database, userId: string): Promise<string[]> {
  const rows = await db
    .prepare(
      `SELECT checkinDate FROM user_checkin
       WHERE userId = ? ORDER BY checkinDate ASC LIMIT 1000`
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
    getCheckinDates(db, userId),
    db
      .prepare("SELECT COUNT(*) AS total FROM user_checkin WHERE userId = ?")
      .bind(userId)
      .first<{ total: number }>(),
  ]);

  // 未打卡不返回运势：不然直接请求接口就能提前看到，打卡就没有"揭晓"感了
  let fortune: FortuneInfo | null = null;
  if (row) {
    const goods = parseItems(row.goods);
    const bads = parseItems(row.bads);
    fortune = {
      level: row.level,
      label: labelOf(row.level),
      goods,
      bads,
      summary: row.level === "great" ? "万事皆宜" : row.level === "terrible" ? "诸事不宜" : null,
    };
  }

  return {
    date,
    checkedIn: Boolean(row),
    fortune,
    streak: calcStreak(dates),
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
