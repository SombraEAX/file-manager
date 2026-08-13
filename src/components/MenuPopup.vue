<template>
  <div
    class="menu-popup"
    ref="popupRoot"
    tabindex="-1"
    :class="{ ready }"
    :style="popupStyle"
    @keydown="onKeydown"
  >
    <template v-for="(item, index) in items">
      <div
        v-if="item.type === 'separator'"
        :key="'sep-' + index"
        class="menu-separator"
      ></div>
      <div
        v-else-if="item.visible !== false"
        :key="'item-' + index"
        class="menu-item"
        :class="{ highlighted: highlightedIndex === index, disabled: item.enabled === false, 'has-submenu': item.submenu && item.submenu.length }"
        :data-index="index"
        :ref="(el: unknown) => setItemRef(el as HTMLElement | null, index)"
        @click.stop="onItemClick(item, index)"
        @mouseenter="onItemMouseEnter(item, index)"
      >
        <span class="menu-icon">
          <span v-if="item.checked && item.type === 'radio'" class="menu-radio"></span>
          <span v-else-if="item.checked" class="menu-check">✓</span>
        </span>
        <span class="menu-label">{{ item.label }}</span>
        <span v-if="item.submenu && item.submenu.length" class="menu-arrow">›</span>
      </div>
      <menu-popup
        v-if="openSubIndex === index"
        :key="'sub-' + index"
        :items="item.submenu || []"
        :parent="itemEls[index] || null"
        @select="select"
        @close="closeSub"
      />
    </template>
  </div>
</template>
<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import type { MenuItemSpec } from '../types/ipc'
  import type { MenuSelectPayload } from '../stores/menus'
  import { theme } from '../stores/theme'

  export default defineComponent({
    name: 'MenuPopup',

    props: {
      items: {
        type: Array as PropType<MenuItemSpec[]>,
        default: () => []
      },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      parent: {
        type: Object as PropType<HTMLElement | null>,
        default: null
      }
    },

    emits: ['select', 'close'],

    data() {
      return {
        theme,
        posX: this.x,
        posY: this.y,
        ready: false,
        openSubIndex: null as number | null,
        highlightedIndex: 0,
        itemEls: {} as Record<number, HTMLElement>
      }
    },

    computed: {
      popupStyle(): Record<string, string> {
        return {
          left: this.posX + 'px',
          top: this.posY + 'px'
        }
      }
    },

    mounted() {
      this.$nextTick(() => {
        const el = this.$refs.popupRoot as HTMLElement | undefined
        const width = el ? el.offsetWidth : 0
        const height = el ? el.offsetHeight : 0
        if (this.parent) {
          const rect = this.parent.getBoundingClientRect()
          if (rect.right + width + 4 > window.innerWidth) {
            this.posX = Math.max(4, rect.left - width - 2)
          } else {
            this.posX = rect.right + 2
          }
          this.posY = rect.top
        }
        if (this.posX + width > window.innerWidth - 4) {
          this.posX = Math.max(4, window.innerWidth - width - 4)
        }
        if (this.posY + height > window.innerHeight - 4) {
          this.posY = Math.max(4, window.innerHeight - height - 4)
        }
        this.ready = true
        if (this.parent) this.focusRoot()
        else document.addEventListener('click', this.onOutsideClick, true)
      })
    },

    beforeUnmount() {
      if (!this.parent) document.removeEventListener('click', this.onOutsideClick, true)
    },

    methods: {
      setItemRef(el: HTMLElement | null, index: number) {
        if (el) this.itemEls[index] = el
        else delete this.itemEls[index]
      },
      focusRoot() {
        const el = this.$refs.popupRoot as HTMLElement | undefined
        el && el.focus()
      },
      onOutsideClick(e: MouseEvent) {
        const el = this.$refs.popupRoot as HTMLElement | undefined
        if (el && !el.contains(e.target as Node)) {
          this.$emit('close')
        }
      },
      onItemMouseEnter(item: MenuItemSpec, index: number) {
        this.highlightedIndex = index
        if (item.submenu && item.submenu.length) this.openSub(index)
        else this.closeSub()
      },
      onItemClick(item: MenuItemSpec, index: number) {
        this.highlightedIndex = index
        if (item.enabled === false) return
        if (item.submenu && item.submenu.length) {
          this.openSub(index)
          return
        }
        this.select({ item, index })
      },
      select(payload: MenuSelectPayload) {
        this.$emit('select', payload)
      },
      openSub(index: number) {
        this.openSubIndex = index
      },
      closeSub() {
        this.openSubIndex = null
        this.$nextTick(() => this.focusRoot())
      },
      onKeydown(e: KeyboardEvent) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            this.moveHighlight(1)
            break
          case 'ArrowUp':
            e.preventDefault()
            this.moveHighlight(-1)
            break
          case 'ArrowRight':
            e.preventDefault()
            this.openHighlighted()
            break
          case 'ArrowLeft':
            e.preventDefault()
            this.collapse()
            break
          case 'Enter':
            e.preventDefault()
            this.activateHighlighted()
            break
          case 'Escape':
            e.preventDefault()
            this.collapse()
            break
          case 'Tab':
            e.preventDefault()
            this.$emit('close')
            break
        }
      },
      moveHighlight(dir: number) {
        const n = this.items.length
        if (!n) return
        let idx = (this.highlightedIndex + dir + n) % n
        let guard = n
        while (guard-- > 0) {
          const item = this.items[idx]
          if (item && item.visible !== false && item.type !== 'separator') break
          idx = (idx + dir + n) % n
        }
        this.highlightedIndex = idx
        this.$nextTick(() => {
          const el = (this.$refs.popupRoot as HTMLElement | undefined)?.querySelector(':scope > .menu-item.highlighted')
          el && el.scrollIntoView({ block: 'nearest' })
        })
      },
      openHighlighted() {
        const item = this.items[this.highlightedIndex]
        if (item && item.enabled !== false && item.submenu && item.submenu.length) {
          this.openSub(this.highlightedIndex)
        }
      },
      activateHighlighted() {
        const item = this.items[this.highlightedIndex]
        if (!item || item.enabled === false) return
        if (item.submenu && item.submenu.length) {
          this.openSub(this.highlightedIndex)
          return
        }
        this.select({ item, index: this.highlightedIndex })
      },
      collapse() {
        if (this.openSubIndex !== null) {
          this.closeSub()
        } else {
          this.$emit('close')
        }
      }
    }
  })
</script>
<style scoped>
  .menu-popup{
    position:fixed;
    z-index:3000;
    min-width:170px;
    background:v-bind('theme.menu.background');
    color:v-bind('theme.menu.textColor');
    border:1px solid v-bind('theme.menu.borderColor');
    border-radius:v-bind('theme.menu.borderRadius');
    box-shadow:0 2px 8px v-bind('theme.menu.shadowColor');
    font-family:v-bind('theme.menu.font');
    font-size:14px;
    padding:3px 0;
    outline:none;
    visibility:hidden;
    box-sizing:border-box;
  }
  .menu-popup.ready{
    visibility:visible;
  }
  .menu-separator{
    height:1px;
    margin:3px 6px;
    background:v-bind('theme.menu.separatorColor');
  }
  .menu-item{
    display:flex;
    flex-direction:row;
    align-items:center;
    padding:4px 10px;
    cursor:default;
    white-space:nowrap;
  }
  .menu-item.highlighted{
    background:v-bind('theme.menu.itemHoverBackground');
  }
  .menu-item.disabled{
    opacity:0.5;
  }
  .menu-item.disabled.highlighted{
    background:transparent;
  }
  .menu-icon{
    width:16px;
    flex-shrink:0;
    text-align:center;
    color:v-bind('theme.menu.accentColor');
    font-size:12px;
  }
  .menu-radio{
    display:inline-block;
    width:7px;
    height:7px;
    border-radius:50%;
    background:v-bind('theme.menu.accentColor');
    vertical-align:middle;
  }
  .menu-check{
    font-size:12px;
  }
  .menu-label{
    flex:1;
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .menu-arrow{
    flex-shrink:0;
    margin-left:14px;
    color:v-bind('theme.menu.textColor');
  }
</style>
