<template>
  <menu-popup
    v-if="menuState.open"
    :items="menuState.items"
    :x="menuState.x"
    :y="menuState.y"
    @select="selectMenuPopup"
    @close="closeHtmlMenu"
  />
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import MenuPopup from './MenuPopup.vue'
  import { menuState, selectMenuPopup, closeHtmlMenu } from '../stores/menus'

  export default defineComponent({
    name: 'MenuHost',
    components: { MenuPopup },
    computed: {
      menuState() {
        return menuState
      }
    },
    methods: {
      selectMenuPopup,
      closeHtmlMenu
    }
  })
</script>
