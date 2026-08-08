<template>
  <div class="app-checkbox" :class="{ checked: modelValue }">
    <span v-if="modelValue" class="checkmark"></span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import theme from '../../theme.json';
export default defineComponent({
  props: {
    modelValue: Boolean
  },
  data() {
    return { theme }
  }
})
</script>

<style scoped>
.app-checkbox {
  width: 14px;
  height: 14px;
  border: 1px solid v-bind('theme.checkbox.borderColor');
  background: v-bind('theme.checkbox.background');
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  box-sizing: border-box;
  flex-shrink: 0;
  pointer-events: none;
}
.app-checkbox.checked {
  background: v-bind('theme.checkbox.checkedBackground');
  border-color: v-bind('theme.checkbox.checkedBackground');
}
.checkmark {
  display: block;
  width: 3px;
  height: 5px;
  border: solid v-bind('theme.checkbox.checkmarkColor');
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
  margin-top: -1px;
}
</style>
