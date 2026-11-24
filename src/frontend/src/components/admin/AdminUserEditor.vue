<!--
  管理面板 — 用户资料 / 权限编辑页

  全屏抽屉式页面：
  - 昵称、学号可以直接改（后端会同步登录邮箱）
  - 权限按「基础 / 社区 / 申请 / 管理 / 系统」分组，全部是开关
  - 顶部提供普通用户 / 认证用户 / 管理员 / 站长四个预设
  - 不再需要管理员手算或输入十进制权限码
-->
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { updateAdminUser } from "../../api/admin";
import { showToast } from "../../utils/toast";
import {
  countPermissions,
  maskFromBits,
  PERMISSION_GROUPS,
  PERMISSION_PRESETS,
} from "../../utils/sitePermissions";
import type { AdminUserInfo } from "../../types";

const props = defineProps<{ user: AdminUserInfo }>();
const emit = defineEmits<{ close: []; saved: [user: AdminUserInfo] }>();

/** 基本资料 */
const username = ref(props.user.username);
const studentId = ref(props.user.studentId ?? "");

/** 权限开关状态 */
const selected = reactive<Record<number, boolean>>({});
for (const item of PERMISSION_GROUPS.flatMap((group) => group.items)) {
  selected[item.bit] = (BigInt(props.user.permissions) & (1n << BigInt(item.bit))) !== 0n;
}

const saving = ref(false);

/** 当前选中的权限位 → 十进制掩码 */
const currentMask = computed(() => {
  const bits = PERMISSION_GROUPS.flatMap((group) => group.items)
    .filter((item) => selected[item.bit])
    .map((item) => item.bit);
  return maskFromBits(bits);
});

const selectedCount = computed(() => countPermissions(currentMask.value));

/** 命中哪个预设；不命中就是自定义 */
const activePreset = computed(() => {
  const preset = PERMISSION_PRESETS.find((p) => maskFromBits(p.bits) === currentMask.value);
  return preset?.key ?? "custom";
});

/** 每个分组的已选数量 */
function groupSelectedCount(groupKey: string): number {
  const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
  if (!group) return 0;
  return group.items.filter((item) => selected[item.bit]).length;
}

function toggle(bit: number) {
  selected[bit] = !selected[bit];
}

function applyPreset(bits: number[]) {
  for (const item of PERMISSION_GROUPS.flatMap((group) => group.items)) {
    selected[item.bit] = bits.includes(item.bit);
  }
}

async function submit() {
  const name = username.value.trim();
  const sid = studentId.value.trim();

  if (!name) {
    showToast("昵称不能为空");
    return;
  }
  if (!sid) {
    showToast("学号不能为空");
    return;
  }

  saving.value = true;
  try {
    const updated = await updateAdminUser({
      userId: props.user.id,
      username: name,
      studentId: sid,
      permissions: currentMask.value,
    });
    showToast("已保存");
    emit("saved", updated);
  } catch {
    // api client 已经弹出后端返回的具体原因
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/40" @click.self="emit('close')">
    <div class="flex min-h-full items-end justify-center sm:items-center">
      <div
        class="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface px-4 pb-4 sm:max-w-[560px] sm:rounded-2xl"
      >
        <!-- 顶部 -->
        <div class="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft"
            aria-label="关闭"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </button>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-base font-semibold text-ink">权限管理</h2>
            <p class="truncate text-xs text-ink-soft">
              {{ user.username }} · 当前 {{ selectedCount }} 项权限
            </p>
          </div>
        </div>

        <!-- 基本资料 -->
        <section class="mt-4">
          <div class="mb-2 flex items-baseline justify-between">
            <h3 class="text-sm font-semibold text-ink">基本资料</h3>
            <span class="text-[11px] text-ink-soft">改学号后旧学号立即失效</span>
          </div>
          <div class="card-base space-y-3">
            <label class="block">
              <span class="mb-1 block text-xs text-ink-soft">昵称</span>
              <input v-model="username" class="input-base w-full" maxlength="24" placeholder="用户昵称" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-ink-soft">学号</span>
              <input
                v-model="studentId"
                class="input-base w-full font-mono"
                maxlength="32"
                placeholder="例如 20250001"
                inputmode="numeric"
              />
              <span class="mt-1 block text-[11px] leading-4 text-ink-soft">
                登录邮箱会同步改为「学号@rippling.local」，请确认新学号能正常登录。
              </span>
            </label>
          </div>
        </section>

        <!-- 角色预设 -->
        <section class="mt-5">
          <div class="mb-2 flex items-baseline justify-between">
            <h3 class="text-sm font-semibold text-ink">角色预设</h3>
            <span class="text-[11px] text-ink-soft">点一下套用整组权限</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in PERMISSION_PRESETS"
              :key="preset.key"
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs transition-colors"
              :class="
                activePreset === preset.key
                  ? 'border-primary bg-primary font-medium text-white'
                  : 'border-line bg-surface text-ink-soft'
              "
              :title="preset.desc"
              @click="applyPreset(preset.bits)"
            >
              {{ preset.label }}
            </button>
            <span
              v-if="activePreset === 'custom'"
              class="rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-ink-soft"
            >
              自定义组合
            </span>
          </div>
          <p class="mt-2 text-[11px] leading-4 text-ink-soft">
            {{
              PERMISSION_PRESETS.find((p) => p.key === activePreset)?.desc ??
              "当前是手动调整的组合，保存时会原样写入。"
            }}
          </p>
        </section>

        <!-- 权限分组 -->
        <section class="mt-5 space-y-3">
          <div
            v-for="group in PERMISSION_GROUPS"
            :key="group.key"
            class="card-base overflow-hidden !p-0"
          >
            <div class="border-b border-line px-3.5 py-2.5">
              <div class="flex items-center justify-between gap-2">
                <h4
                  class="text-sm font-semibold"
                  :class="group.key === 'system' ? 'text-red-500' : 'text-ink'"
                >
                  {{ group.title }}
                </h4>
                <span class="shrink-0 text-[11px] text-ink-soft">
                  {{ groupSelectedCount(group.key) }}/{{ group.items.length }}
                </span>
              </div>
              <p class="mt-0.5 text-[11px] leading-4 text-ink-soft">{{ group.desc }}</p>
            </div>
            <div class="divide-y divide-line">
              <div
                v-for="item in group.items"
                :key="item.bit"
                class="flex items-center gap-3 px-3.5 py-2.5"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-ink">{{ item.label }}</p>
                  <p class="mt-0.5 text-[11px] leading-4 text-ink-soft">{{ item.desc }}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="!!selected[item.bit]"
                  :aria-label="item.label"
                  class="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  :class="selected[item.bit] ? 'bg-primary' : 'bg-line'"
                  @click="toggle(item.bit)"
                >
                  <span
                    class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
                    :class="selected[item.bit] ? 'translate-x-[1.1rem]' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 底部保存 -->
        <div class="sticky bottom-0 -mx-4 mt-5 border-t border-line bg-surface px-4 pb-1 pt-3">
          <button
            type="button"
            class="btn-primary w-full"
            :disabled="saving"
            @click="submit"
          >
            {{ saving ? "保存中…" : `保存修改（${selectedCount} 项权限）` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
