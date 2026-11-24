<!--
  首页每日运势卡片

  对标洛谷首页：
    - 左侧：今日运势档位（大吉/中吉/小吉/中平/小凶）+ 连续打卡天数 + 打卡按钮
    - 右侧：宜 / 忌 各两条，内容固定由后端按 userId + 日期算出来
    - 未打卡也能看到今日运势；打完卡按钮变成"今日已打卡"，连续天数 +1

  数据一次拉取，打卡成功后用返回值原地更新，不再多打一次接口。
-->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { doCheckin, getCheckinStatus } from "../../api/checkin";
import type { CheckinStatus, FortuneLevel } from "../../api/checkin";
import { useAuthStore } from "../../stores/auth";
import { showToast } from "../../utils/toast";

const auth = useAuthStore();

const loading = ref(true);
const status = ref<CheckinStatus | null>(null);
const checking = ref(false);

/** 各档位的颜色：大吉红、中吉橙、小吉绿、中平灰、小凶蓝 */
const TONE: Record<FortuneLevel, string> = {
  great: "#EF4444",
  good: "#F59E0B",
  small: "#10B981",
  flat: "#64748B",
  bad: "#3B82F6",
};

const displayName = computed(() => auth.username || "同学");
const tone = computed(() => (status.value ? TONE[status.value.fortune.level] : TONE.flat));

async function load(): Promise<void> {
  loading.value = true;
  try {
    status.value = await getCheckinStatus();
  } catch {
    // 拉不到就隐藏卡片，不打断首页推荐流
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
  <div v-if="loading" class="card-base skeleton mb-3 h-28 !p-0" />

  <section
    v-else-if="status"
    class="card-base mb-3 overflow-hidden !p-0"
    data-tour="home-fortune"
  >
    <div class="flex items-stretch">
      <!-- 左：运势 + 打卡 -->
      <div class="flex min-w-0 flex-1 flex-col justify-between border-r border-line p-4">
        <div>
          <p class="truncate text-[11px] leading-none text-ink-soft">
            {{ displayName }} 的运势
          </p>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-bold leading-none" :style="{ color: tone }">
              {{ status.fortune.label }}
            </span>
            <span v-if="status.streak > 0" class="text-[11px] text-ink-soft">
              连续 {{ status.streak }} 天
            </span>
          </div>
        </div>

        <div class="mt-3">
          <button
            type="button"
            class="w-full rounded-lg px-3 py-1.5 text-xs font-medium pressable"
            :class="status.checkedIn ? 'bg-line text-ink-soft' : 'bg-primary text-white'"
            :disabled="status.checkedIn || checking"
            @click="check"
          >
            {{ status.checkedIn ? "今日已打卡" : checking ? "打卡中…" : "点击打卡" }}
          </button>
          <p class="mt-1.5 text-center text-[10px] text-ink-soft">
            累计 {{ status.total }} 天
          </p>
        </div>
      </div>

      <!-- 右：宜 / 忌 -->
      <div class="flex w-[54%] shrink-0 flex-col justify-center gap-2.5 p-4">
        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold"
            :style="{ color: '#10B981', background: 'color-mix(in srgb, #10B981 14%, transparent)' }"
          >宜</span>
          <div class="min-w-0 space-y-1">
            <p
              v-for="item in status.fortune.goods"
              :key="`good-${item}`"
              class="truncate text-xs leading-relaxed text-ink"
            >
              {{ item }}
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold"
            :style="{ color: '#EF4444', background: 'color-mix(in srgb, #EF4444 14%, transparent)' }"
          >忌</span>
          <div class="min-w-0 space-y-1">
            <p
              v-for="item in status.fortune.bads"
              :key="`bad-${item}`"
              class="truncate text-xs leading-relaxed text-ink"
            >
              {{ item }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
