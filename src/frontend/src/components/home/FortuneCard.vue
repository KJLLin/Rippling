<!--
  首页每日运势卡片（对齐洛谷首页两态）

  未打卡：欢迎卡 —— "欢迎回来，昵称" + 大号日期 + 星期 + 橙色「点击打卡」
  已打卡：运势卡 —— "§ 档位 §" + 两列宜忌（每条带一句说明）+ 连续打卡文案

  对齐点：
    - 六档：大吉 / 中吉 / 小吉 / 中平 / 凶 / 大凶
    - 大吉两宜 + 万事皆宜；大凶诸事不宜 + 两忌
    - 断签按 2^(n-1) 扣减，不清零
    - 未打卡不返回运势，点完才揭晓
-->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { doCheckin, getCheckinStatus } from "../../api/checkin";
import type { CheckinStatus, FortuneLevel } from "../../api/checkin";
import { useAuthStore } from "../../stores/auth";
import { useThemeStore } from "../../stores/theme";
import { showToast } from "../../utils/toast";

const auth = useAuthStore();
const theme = useThemeStore();

const loading = ref(true);
const status = ref<CheckinStatus | null>(null);
const checking = ref(false);

/** 档位颜色（对齐洛谷）：各种吉为红色，中平绿色，各种凶为灰黑色 */
const TONE: Record<FortuneLevel, string> = {
  great: "#CB2634",
  good: "#E60012",
  small: "#F53F3F",
  flat: "#00B42A",
  bad: "#4E5969",
  terrible: "#1D2129",
};

const displayName = computed(() => auth.username || "同学");
const siteName = computed(() => theme.siteName || "本站");
const tone = computed(() =>
  status.value?.fortune ? TONE[status.value.fortune.level] : "#4E5969"
);

/** 把 YYYY-MM-DD 拆成大号日期需要的月 / 日 / 星期 */
const today = computed(() => {
  const raw = status.value?.date;
  if (!raw) return { month: "", day: "", weekday: "" };
  // date 已经是 UTC+8 的日历日，按 UTC 读出来即可，避免浏览器本地时区再偏一次
  const d = new Date(`${raw}T00:00:00Z`);
  const week = "日一二三四五六"[d.getUTCDay()] ?? "日";
  return {
    month: `${d.getUTCMonth() + 1}月`,
    day: String(d.getUTCDate()),
    weekday: `星期${week}`,
  };
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    status.value = await getCheckinStatus();
  } catch {
    status.value = null;
  } finally {
    loading.value = false;
  }
}

async function check(): Promise<void> {
  if (!status.value || status.value.checkedIn || checking.value) return;
  checking.value = true;
  try {
    const next = await doCheckin();
    status.value = next;
    showToast(
      next.alreadyChecked ? "今天已经打过卡啦" : `打卡成功，已连续 ${next.streak} 天`,
      next.alreadyChecked ? "info" : "success"
    );
  } catch {
    showToast("打卡失败，请稍后重试", "error");
  } finally {
    checking.value = false;
  }
}

onMounted(() => {
  if (auth.isLoggedIn) void load();
});
</script>

<template>
  <div v-if="loading" class="card-base skeleton mb-3 h-56 !p-0" />

  <section
    v-else-if="status"
    class="card-base mb-3 !p-4"
    data-tour="home-fortune"
  >
    <!-- ========== 已打卡：运势卡 ========== -->
    <template v-if="status.fortune">
      <div class="flex items-center justify-between gap-2">
        <p class="truncate text-xs text-ink-soft">{{ displayName }} 的运势</p>
        <p v-if="status.streak > 0" class="shrink-0 text-[11px] text-ink-soft">
          连续 {{ status.streak }} 天
        </p>
      </div>

      <div class="mt-1 text-center">
        <p
          class="text-[32px] font-bold leading-tight tracking-[0.06em]"
          :style="{ color: tone }"
        >
          § {{ status.fortune.label }} §
        </p>
      </div>

      <div class="mt-2 grid grid-cols-2 items-start gap-x-4 gap-y-2 text-xs">
        <div v-if="status.fortune.goods.length > 0" class="space-y-2">
          <div v-for="item in status.fortune.goods" :key="`good-${item.text}`">
            <p class="truncate">
              <span class="text-[#F53F3F]">宜：</span><span class="text-ink">{{ item.text }}</span>
            </p>
            <p class="truncate pl-[1.6em] text-[10px] leading-snug text-ink-soft">{{ item.note }}</p>
          </div>
        </div>
        <div v-else class="flex h-full items-center justify-center py-3 text-sm font-medium text-ink-soft">
          {{ status.fortune.summary }}
        </div>

        <div v-if="status.fortune.bads.length > 0" class="space-y-2">
          <div v-for="item in status.fortune.bads" :key="`bad-${item.text}`">
            <p class="truncate">
              <span class="text-ink-soft">忌：</span><span class="text-ink">{{ item.text }}</span>
            </p>
            <p class="truncate pl-[1.6em] text-[10px] leading-snug text-ink-soft">{{ item.note }}</p>
          </div>
        </div>
        <div v-else class="flex h-full items-center justify-center py-3 text-sm font-medium text-ink-soft">
          {{ status.fortune.summary }}
        </div>
      </div>

      <p class="mt-3 text-center text-xs text-ink-soft">
        你已经在 {{ siteName }} 连续打卡了 {{ status.streak }} 天
      </p>
    </template>

    <!-- ========== 未打卡：欢迎卡 ========== -->
    <template v-else>
      <p class="text-xs text-ink-soft">欢迎回来</p>
      <p class="mt-0.5 truncate text-xl font-semibold text-ink">{{ displayName }}</p>

      <div class="mt-4 flex items-end gap-3">
        <div class="pb-1 text-[11px] leading-tight text-ink-soft">
          {{ today.month }}<br />小
        </div>
        <p class="text-5xl font-bold leading-none text-ink">{{ today.day }}</p>
        <p class="pb-1 text-xs text-ink-soft">{{ today.weekday }}</p>
      </div>

      <p class="mt-4 text-center text-xs text-ink-soft">
        今天还没打卡，点一下揭晓今日运势
      </p>
    </template>

    <!-- 打卡按钮 -->
    <button
      type="button"
      class="mt-2 w-full rounded-lg py-2 text-sm font-medium pressable"
      :class="status.checkedIn ? 'bg-line text-ink-soft' : 'text-white'"
      :style="status.checkedIn ? undefined : { backgroundColor: '#F97316' }"
      :disabled="status.checkedIn || checking"
      @click="check"
    >
      {{ status.checkedIn ? "今日已打卡" : checking ? "打卡中…" : "点击打卡" }}
    </button>

    <p class="mt-1.5 text-center text-[10px] text-ink-soft">累计打卡 {{ status.total }} 天</p>
  </section>
</template>
