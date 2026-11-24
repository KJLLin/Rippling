/**
 * 每日运势打卡 API
 *
 * 挂载前缀 /api/checkin
 *
 *   GET  /status   今日运势 + 是否已打卡 + 连续天数（只读，不产生记录）
 *   POST /         今日打卡（重复提交幂等）
 *
 * 所有接口都在登录墙之后，游客拿不到。
 */

import { Hono } from "hono";
import type { CloudflareEnv } from "../auth";
import type { AppContextVars } from "../middleware/auth";
import { createCheckin, getCheckinStatus } from "../db";
import { UNAUTHORIZED } from "../utils/errors";

type E = { Bindings: CloudflareEnv; Variables: AppContextVars };

const checkinRoutes = new Hono<E>();

/** GET /status — 今日运势与打卡状态 */
checkinRoutes.get("/status", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { success: false, error: { code: UNAUTHORIZED.code, message: UNAUTHORIZED.message } },
      UNAUTHORIZED.statusCode as any
    );
  }

  const data = await getCheckinStatus(c.env.DB, user.id);
  return c.json({ success: true, data });
});

/** POST / — 今日打卡 */
checkinRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { success: false, error: { code: UNAUTHORIZED.code, message: UNAUTHORIZED.message } },
      UNAUTHORIZED.statusCode as any
    );
  }

  const result = await createCheckin(c.env.DB, user.id);
  return c.json({
    success: true,
    data: { ...result.status, alreadyChecked: result.alreadyChecked },
  });
});

export default checkinRoutes;
