<template>
  <div v-if="tabs.length > 1" class="tab-bar">
    <template v-for="(tab, i) in tabs" :key="tab.id">
      <div
        class="tab"
        :class="{ active: i === activeIndex }"
        @click="$emit('select', i)"
      >
        <span class="tab-title">{{ tabTitle(tab) }}</span>
        <span class="tab-close" @click.stop="$emit('close', i)">&times;</span>
      </div>
      <div
        v-if="i < tabs.length - 1 && i !== activeIndex && i + 1 !== activeIndex"
        class="divider"
        :key="'d' + tab.id"
      ></div>
    </template>
  </div>
</template>

<script>
import theme from '../../theme.json';
export default {
  props: {
    tabs: Array,
    activeIndex: Number
  },
  emits: ['select', 'close'],
  data() {
    return { theme }
  },
  methods: {
    tabTitle(tab) {
      let path = tab.history[tab.historyIndex];
      if (!path || path === '/') return '/';
      return path.split('/').filter(Boolean).pop();
    }
  }
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 0 7px;
  min-height: v-bind('theme.tabBar.height');
  gap: 0;
}
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  cursor: pointer;
  font-family: v-bind('theme.tabBar.font');
  font-size: 14px;
  height: v-bind('theme.tabBar.height');
  box-sizing: border-box;
  background: v-bind('theme.tabBar.inactiveBackground');
  color: v-bind('theme.tabBar.inactiveTextColor');
  border-radius: v-bind('theme.tabBar.borderRadius');
  min-width: 0;
}
.tab.active {
  background: v-bind('theme.tabBar.activeBackground');
  color: v-bind('theme.tabBar.activeTextColor');
}
.tab:not(.active):hover {
  background: v-bind('theme.tabBar.inactiveHoverBackground');
}
.divider {
  width: 1px;
  flex-shrink: 0;
  background: v-bind('theme.tabBar.dividerColor');
  margin: 4px 0;
  align-self: stretch;
}
.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-close {
  display: none;
  margin-left: 6px;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}
.tab:hover .tab-close {
  display: block;
}
.tab-close:hover {
  color: v-bind('theme.tabBar.closeHoverColor');
}
</style>
