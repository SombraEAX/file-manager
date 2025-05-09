<template>
  <div
    class="sidebar"
    :class="{ 'sidebar-left': position === 'left', 'sidebar-right': position === 'right' }"
    :style="{width: width+'px', minWidth: width+'px'}"
    :data-position="position"
  >
    <div class="sidebar-content">
      <slot></slot>
    </div>
    <div class="line" @mousedown="mousedown"></div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  export default {
    props: {
      position: {
        type: String,
        default: 'left',
        validator: (value) => ['left', 'right'].includes(value)
      },
      width: {
        type: Number,
        default: 200
      },
      minWidth: {
        type: Number,
        default: 0
      }
    },
    data(){
      return {theme, isResizing: false, startX: 0, initialWidth: 0}
    },
    methods: {
      mousedown(ev) {
        this.isResizing = true;
        this.startX = ev.clientX;
        this.initialWidth = this.width;
        document.addEventListener('mousemove', this.mousemove);
        document.addEventListener('mouseup', this.mouseup);
      },
      mousemove(ev) {
        if (!this.isResizing) return;

        let delta = ev.clientX - this.startX;

        if (this.position === 'right') {
          delta = -delta;
        }

        let newWidth = this.initialWidth + delta;

        newWidth = Math.max(newWidth, this.minWidth);

        this.$emit('resize', newWidth);

      },
      mouseup() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.mousemove);
        document.removeEventListener('mouseup', this.mouseup);
      },
    }
  }
</script>
<style scoped>
  .sidebar{
    display: flex;
    border-color: v-bind('theme.borderColor');
    border-style: solid;
    border-width:0px;
    position: relative; 
  }

  .sidebar-left { 
    border-right-width: 1px;
    flex-direction: row; 
  }

  .sidebar-right { 
    border-left-width: 1px;
    flex-direction: row-reverse; 
  }

  .sidebar-content {
    flex-grow: 1;
    overflow: auto; 
  }

  .line{
    width:8px;
    cursor:col-resize;
    z-index:300;
    height:100%;
    background-color: rgba(0,0,0,0); 
    position: absolute; 
    top: 0;
  }

  .sidebar-left .line { 
    right: -4px; 
  }

  .sidebar-right .line {
    left: -4px; 
  }
</style>
