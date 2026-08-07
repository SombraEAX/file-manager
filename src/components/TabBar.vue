<template>
  <div v-if="tabs.length > 1" class="tab-bar">
    <button
      class       = "tab-nav-btn"
      v-if        = "overflows"
      :disabled   = "!canScrollLeft"
      @mousedown  = "startScroll(-1)"
      @mouseleave = "stopScroll"
      @click      = "onClick(-1)"
      @keydown.enter.prevent = "scrollBy(-1)"
      @keydown.space.prevent = "scrollBy(-1)"
    >&#8249;</button>
    <div
      class = "tab-scroll"
      ref   = "scroll"
      @scroll = "updateScroll"
    >
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
    <button
      class       = "tab-nav-btn"
      v-if        = "overflows"
      :disabled   = "!canScrollRight"
      @mousedown  = "startScroll(1)"
      @mouseleave = "stopScroll"
      @click      = "onClick(1)"
      @keydown.enter.prevent = "scrollBy(1)"
      @keydown.space.prevent = "scrollBy(1)"
    >&#8250;</button>
    <button
      class  = "tab-nav-btn tab-menu-btn"
      @click = "openTabMenu"
    >&#9662;</button>
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
    return {
      theme,
      overflows: false,
      canScrollLeft: false,
      canScrollRight: false,
      holdTimer: null,
      scrollDir: 0,
      scrollRAF: null,
      scrollSpeed: 400,
      lastTime: null,
      longPress: false
    }
  },
  watch: {
    tabs() {
      this.$nextTick(() => {
        this.scrollToActive();
        this.updateScroll();
      });
    },
    activeIndex() {
      this.$nextTick(() => this.scrollToActive());
    }
  },
  mounted() {
    window.addEventListener('resize', this.updateScroll);
    this.$nextTick(() => {
      this.scrollToActive();
      this.updateScroll();
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateScroll);
    this.stopScroll();
  },
  methods: {
    tabTitle(tab) {
      let path = tab.history[tab.historyIndex];
      if (!path || path === '/') return '/';
      return path.split('/').filter(Boolean).pop();
    },
    updateScroll() {
      const el = this.$refs.scroll;
      if (!el) {
        this.overflows = false;
        this.canScrollLeft = false;
        this.canScrollRight = false;
        return;
      }
      this.overflows = el.scrollWidth > el.clientWidth + 1;
      this.canScrollLeft = el.scrollLeft > 1;
      this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    },
    scrollStep() {
      const el = this.$refs.scroll;
      if (!el) return 200;
      return Math.min(el.clientWidth * 0.8, 220);
    },
    scrollBy(dir) {
      const el = this.$refs.scroll;
      if (!el) return;
      el.scrollBy({ left: dir * this.scrollStep(), behavior: 'smooth' });
    },
    onClick(dir) {
      if (this.longPress) {
        this.longPress = false;
        return;
      }
      this.scrollBy(dir);
    },
    startScroll(dir) {
      this.stopScroll();
      this.longPress = false;
      this.holdTimer = setTimeout(() => {
        this.longPress = true;
        this.scrollDir = dir;
        this.lastTime = null;
        this.scrollRAF = requestAnimationFrame((t) => this.tickScroll(t));
      }, 250);
      window.addEventListener('mouseup', this.stopScroll);
      window.addEventListener('blur', this.stopScroll);
    },
    tickScroll(timestamp) {
      const el = this.$refs.scroll;
      if (!el) {
        this.stopScroll();
        return;
      }
      if ((this.scrollDir < 0 && !this.canScrollLeft) || (this.scrollDir > 0 && !this.canScrollRight)) {
        this.stopScroll();
        return;
      }
      if (this.lastTime == null) this.lastTime = timestamp;
      const dt = Math.min(timestamp - this.lastTime, 50);
      this.lastTime = timestamp;
      el.scrollLeft += (this.scrollDir * this.scrollSpeed * dt) / 1000;
      this.scrollRAF = requestAnimationFrame((t) => this.tickScroll(t));
    },
    stopScroll() {
      clearTimeout(this.holdTimer);
      cancelAnimationFrame(this.scrollRAF);
      this.holdTimer = null;
      this.scrollDir = 0;
      this.scrollRAF = null;
      this.lastTime = null;
      window.removeEventListener('mouseup', this.stopScroll);
      window.removeEventListener('blur', this.stopScroll);
    },
    scrollToActive() {
      const el = this.$refs.scroll;
      if (!el) return;
      const active = el.querySelector('.tab.active');
      if (!active) return;
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < el.scrollLeft) {
        el.scrollLeft = left;
      } else if (right > el.scrollLeft + el.clientWidth) {
        el.scrollLeft = right - el.clientWidth;
      }
    },
    openTabMenu(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const items = this.tabs.map((tab, i) => ({
        label: this.tabTitle(tab) || '/',
        type: 'radio',
        checked: i === this.activeIndex
      }));
      window.electron.ipcRenderer.send('show-menu', {
        items,
        x: Math.floor(rect.left),
        y: Math.floor(rect.bottom)
      });
      window.electron.ipcRenderer.once('show-menu-reply', (_, index) => {
        if (index >= 0 && index < this.tabs.length) this.$emit('select', index);
      });
    }
  }
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 4px 7px 0 7px;
  min-height: v-bind('theme.tabBar.height');
  gap: 2px;
}
.tab-scroll {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  scrollbar-width: none;
}
.tab-scroll::-webkit-scrollbar {
  display: none;
}
.tab {
  flex: 1 1 auto;
  min-width: 80px;
  max-width: 220px;
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
.tab-nav-btn {
  flex-shrink: 0;
  align-self: flex-end;
  width: 22px;
  height: v-bind('theme.tabBar.height');
  box-sizing: border-box;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: v-bind('theme.tabBar.inactiveBackground');
  color: v-bind('theme.tabBar.inactiveTextColor');
  border-radius: v-bind('theme.tabBar.borderRadius');
}
.tab-nav-btn:hover:not(:disabled) {
  background: v-bind('theme.tabBar.inactiveHoverBackground');
}
.tab-nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.tab-menu-btn {
  width: 26px;
}
</style>
