-- 每日运势打卡
--
-- 每人每天只允许一条记录，(userId, checkinDate) 唯一约束保证并发重复提交也只会成功一次。
-- checkinDate 使用 Asia/Shanghai 的 YYYY-MM-DD，跨时区不会把一天算错。

CREATE TABLE IF NOT EXISTS user_checkin (
    id          TEXT PRIMARY KEY,
    userId      TEXT NOT NULL REFERENCES user(id),
    checkinDate TEXT NOT NULL,
    level       TEXT NOT NULL,
    goods       TEXT NOT NULL DEFAULT '[]',
    bads        TEXT NOT NULL DEFAULT '[]',
    createdAt   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_checkin_user_date
    ON user_checkin(userId, checkinDate);

CREATE INDEX IF NOT EXISTS idx_user_checkin_user_created
    ON user_checkin(userId, createdAt DESC);
