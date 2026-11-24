<!--
  首页每日运势卡片（对齐洛谷首页）

  结构：
    - 顶部：昵称 + "的运势"（右侧连续天数）
    - 中间：大号「§ 档位 §」，未打卡显示「§ ? §」
    - 宜 / 忌：左右两列，每条主项 + 一句结果说明
    - 大吉：两宜 + "万事皆宜"；大凶："诸事不宜" + 两忌
    - 底部："你已经在 XXX 连续打卡了 N 天" + 橙色打卡按钮

  行为：
    - 未打卡只显示占位，不返回运势（后端 fortune=null）
    - 点击打卡后原地揭晓；断签按 2^(n-1) 扣减，不归零
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

/** 档位颜色：大吉红、中吉橙、小吉/中平绿、凶灰、大凶红 */
const TONE: Record<FortuneLevel, string> = {
  great: "#F53F3F",
  good: "#FF7D00",
  small: "#00B42A",
  flat: "#00B42A",
  bad: "#4E5969",
  terrible: "#F53F3F",
};

const displayName = computed(() => auth.username || "同学");
const siteName = computed(() => theme.siteName || "本站");
const tone = computed(() =>
  status.value?.fortune ? TONE[status.value.fortune.level] : "#4E5969"
);

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
    <!-- 顶部：昵称 -->
    <div class="flex items-center justify-between gap-2">
      <p class="truncate text-xs text-ink-soft">{{ displayName }} 的运势</p>
      <p v-if="status.fortune && status.streak > 0" class="shrink-0 text-[11px] text-ink-soft">
        连续 {{ status.streak }} 天
      </p>
    </div>

    <!-- 大号档位 -->
    <div class="mt-1 text-center">
      <p
        v-if="status.fortune"
        class="text-[32px] font-bold leading-tight tracking-[0.06em]"
        :style="{ color: tone }"
      >
        § {{ status.fortune.label }} §
      </p>
      <p v-else class="text-[32px] font-bold leading-tight tracking-[0.06em] text-ink-soft">
        § ? §
      </p>
    </div>

    <!-- 宜 / 忌 -->
    <div v-if="status.fortune" class="mt-2 grid grid-cols-2 items-start gap-x-4 gap-y-2 text-xs">
      <div v-if="status.fortune.goods.length > 0" class="space-y-2">
        <div v-for="item in status.fortune.goods" :key="`good-${item.text}`">
          <p class="truncate">
            <span class="text-[#F53F3F]">宜：</span><span class="text-ink">{{ item.text }}</span>
          </p>
          <p class="truncate pl-[1.6em] text-[10px] leading-snug text-ink-soft">{{ item.note }}</p>
        </div>
      </div>
      <!-- 大凶：左边显示"诸事不宜" -->
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
      <!-- 大吉：右边显示"万事皆宜" -->
      <div v-else class="flex h-full items-center justify-center py-3 text-sm font-medium text-ink-soft">
        {{ status.fortune.summary }}
      </div>
    </div>

    <!-- 未打卡占位 -->
    <div v-else class="mt-2 grid grid-cols-2 gap-x-4 text-xs leading-relaxed text-ink-soft">
      <div class="space-y-1.5">
        <p>宜：?</p>
        <p>宜：?</p>
      </div>
      <div class="space-y-1.5">
        <p>忌：?</p>
        <p>忌：?</p>
      </div>
    </div>

    <!-- 连续打卡文案 -->
    <p class="mt-3 text-center text-xs text-ink-soft">
      <template v-if="status.streak > 0">
        你已经在 {{ siteName }} 连续打卡了 {{ status.streak }} 天
      </template>
      <template v-else>今天还没打卡，点一下揭晓今日运势</template>
    </p>

    <!-- 打卡按钮（洛谷同款橙色） -->
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
