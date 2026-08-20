<template>
  <div :class="{'breadcrumbs-wrapper': true, debug, responsive: isResponsive}" ref="root" :data-mode="mode">
    <div class="breadcrumbs">
      <div
        :class="{breadcrumb: true, fixed: (part.width || 0) < minSegmentWidth}"
        v-for="(part,index) in visibleSegments"
        :key="part.collapse ? 'collapse' : part.path"
      >
        <div
          :class="{label: true, active: part.collapse && collapseButtonActive}"
          ref="labelsRef"
          :data-index="index"
          @click="segmentClick(part)"
        >{{part.caption}}</div>
        <div
          :class="{'triangle-wrap': true, active: activeDelimiter === index}"
          v-if="index != visibleSegments.length - 1"
          :style="{width: delimiterWidth + 'px', minWidth: delimiterWidth + 'px'}"
          @click="delimiterClick(part, index)"
        >
          <div class="triangle"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import {
  defineComponent,
  nextTick,
  ref,
  onMounted,
  onBeforeUnmount,
  PropType
} from 'vue'
import { theme } from '../stores/theme';

interface Segment {
  caption: string
  path?: string
  collapse: boolean,
  width?: number
}

export default defineComponent({
  setup(){
    const labelsRef = ref<HTMLElement[]>([])
    const root = ref(null)
    const width = ref(0)
    
    const onResize = (entries: ResizeObserverEntry[]) => {
      width.value = entries[0]?.contentRect.width ?? 0
    }

    let observer: ResizeObserver | undefined

    onMounted(() => {
      if (!root.value) return
      observer = new ResizeObserver(onResize)
      observer.observe(root.value)
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
    })

    return {labelsRef,root,width}
  },
  props: {
    address: {
      type: String,
      default: '/',
    },
    activeDelimiter: {
      type: Number as PropType<number | null>,
      default: null,
    },
    collapseButtonActive: {
    	type: Boolean,
    	default:false
    }
  },
  methods:{
    delimiterClick(segment : Segment, index : number){
      this.$emit('delimiterClick',{path: segment.path, index})
    },
    segmentClick(segment: Segment){
      if(segment.collapse){
        const collapsedSegments = []
        for(let i = this.segmentsBeforeCollapse; i<this.segments.length-this.segmentsAfterCollapse; i++)
          collapsedSegments.push(this.segments[i])
          
        this.$emit('ellipsisClick',collapsedSegments)
      }else{
        this.$emit('segmentClick',segment.path)
      }
    }
  },
  data(){
    return {
      delimiterWidth: 16,
      minSegmentWidth: 32,
      segments: [] as Segment[],
      oldSegments: [] as Segment[],
      theme,
      collapseButtonWidth: 0,
      fullPathWidth: 0,
      debug: false,
      forceFullMode: false,
      segmentsBeforeCollapse: 2,
      segmentsAfterCollapseMin: 2
    }
  },
  computed:{
    isResponsive(){
      if(this.mode === 'ultra-compact') return true
      if(this.mode === 'compact')
        return this.segmentsAfterCollapse === this.segmentsAfterCollapseMin
      return false
    },
    collapseThreshold(){
      return this.segmentsBeforeCollapse +
        this.segmentsAfterCollapseMin +
        1
    },
    visibleSegments(){
      if(this.mode === 'ultra-compact'){
      	const lastSegment = this.segments[this.segments.length - 1]
      	if(lastSegment) return [lastSegment]
      	return []
      }
      if(this.mode === 'full' || this.segments.length < this.collapseThreshold) return [...this.segments]
      return [
        ...this.segments.slice(0, this.segmentsBeforeCollapse),
        {
          caption: '...',
          collapse: true,
          path: this.segments[this.segments.length-1-this.segmentsAfterCollapse]?.path
        },
        ...this.segments.slice(-this.segmentsAfterCollapse)
      ]
    },
    mode(){
      if(this.forceFullMode) return 'full'
      if(this.width<250) return 'ultra-compact'
      if(this.fullPathWidth > this.width) return 'compact'
      return 'full'
    },
    segmentsAfterCollapse(){
      console.log('segmentsAfterCollapse')
      const defaultValue = this.segmentsAfterCollapseMin
      
      if(this.mode !== 'compact')   return defaultValue
      if(!this.collapseButtonWidth) return defaultValue
      if(this.segments.length < this.collapseThreshold) return defaultValue

      let visiblePathWidth = this.collapseButtonWidth + this.segmentsBeforeCollapse * this.delimiterWidth
      for(let index = 0; index < this.segmentsBeforeCollapse; index++)
        visiblePathWidth += (this.segments[index].width || 0)

      let segmentsAfterCollapse = 0

      for(let index = this.segments.length-1; index>this.segmentsBeforeCollapse; index--){
        const segment = this.segments[index]
        if(segment?.width) visiblePathWidth += segment.width + this.delimiterWidth
        if(visiblePathWidth>this.width) break
        segmentsAfterCollapse++
      }

      return Math.max(segmentsAfterCollapse, defaultValue)
    }
  },
  watch: {
    async mode(newMode){
      console.log(newMode,this.collapseButtonWidth)
      if(newMode === 'compact' && (!this.collapseButtonWidth)){
        console.log('calculate collapseButtonWidth')
        await nextTick()
        const collapseLabel = this.labelsRef.find(
          label => Number(label.dataset.index) === this.segmentsBeforeCollapse
        )

        if (collapseLabel) {
          this.collapseButtonWidth = collapseLabel.scrollWidth
          console.log('collapseButtonWidth:',this.collapseButtonWidth)
        }else{
          console.log('collapseLabel not found')
        }          
      }    	
    },
    address: {
      immediate: true,
      async handler() {
        this.oldSegments = [...this.segments]
        this.segments = []
        let path = ''

        if(this.address === '/'){
          this.segments.push({
            caption: 'root',
            path: '/',
            collapse: false
          })      	
        }else{
          for(const segment of this.address.split('/')){
            path += segment + '/'
            this.segments.push({
              caption: segment || 'root',
              path,
              collapse: false
            })
          }
        }
      
        await nextTick()
 
        // If the new path is a parent path of the old path or is identical to it,
        // we reuse the breadcrumb dimensions from the previous data.
        if(
          this.oldSegments.length &&
          this.segments.length <= this.oldSegments.length &&
          this.segments[this.segments.length-1].path ===
          this.oldSegments[this.segments.length-1].path
        ){
          for(const index in this.segments)
            this.segments[index].width = this.oldSegments[index].width

        // If the new path is a subdirectory of the old path,
        // we reuse the breadcrumb dimensions from the previous data
        // and measure the breadcrumb size for the last path segment.
        }else if(
          this.oldSegments.length &&
          this.segments.length === this.oldSegments.length + 1 &&
          this.segments[this.oldSegments.length-1].path ===
          this.oldSegments[this.oldSegments.length-1].path      	
        ){
          for(const index in this.oldSegments)
            this.segments[index].width = this.oldSegments[index].width

          const lastLabel = this.labelsRef.find(label => Number(label.dataset.index) === this.labelsRef.length-1)

          if(lastLabel)
            this.segments[this.segments.length-1].width = lastLabel.scrollWidth          
          else
            console.log('warning: lastLabel not found')
            
        // For unrelated or non-adjacent paths,
        // switch to full display mode and measure all segments.
        }else{
          this.forceFullMode = true
      	  await nextTick()

          const sortedLabels = [...this.labelsRef].sort((a, b) => {
            const aIndex = Number(a.dataset.index)
            const bIndex = Number(b.dataset.index)
            return aIndex - bIndex
          })

          for(const index in this.segments)
            this.segments[index].width = 
              sortedLabels[index].scrollWidth
          this.forceFullMode = false
        }
        
        let fullPathWidth = 0
        for(const index in this.segments){
          fullPathWidth += this.segments[index].width ?? 0
          if(index!='0') fullPathWidth += this.delimiterWidth
        }

        this.fullPathWidth = fullPathWidth
      }
    }
  }
})
</script>
<style scoped>
  .breadcrumbs{
    display:flex;
    white-space: nowrap;
    flex-direction:row;
  }
  .breadcrumb{
    line-height:16px;
  	font-size:14px;
    display:flex;
    flex-direction:row;
  }
  .breadcrumb .label{
    cursor:pointer;
  }
  .breadcrumb .label.active,
  .breadcrumb .label:hover{
    color: v-bind('theme.linkHover');
  }
  .triangle-wrap{
    position:relative;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    height:16px;
    padding:0;
    cursor:pointer;
  }
  .breadcrumbs-wrapper {
  	overflow-x:hidden
  }
  .triangle{
    cursor:pointer;
    transition: transform 0.2s;
    width:0;
    height:0;
    border-left:5px solid currentColor;
    border-top:4px solid transparent;
    border-bottom:4px solid transparent;
  }
  .triangle-wrap.active .triangle{
    transform: rotate(90deg);
  }
  
  .triangle-wrap.active .triangle,
  .triangle-wrap:hover .triangle{
    color: v-bind('theme.linkHover');
  }
  .breadcrumbs-wrapper.responsive .breadcrumb:not(.fixed) {
    min-width: calc((v-bind('minSegmentWidth') + v-bind('delimiterWidth')) * 1px);
  }

  .breadcrumbs-wrapper.responsive .breadcrumb:not(.fixed) .label {
    min-width: calc(v-bind('minSegmentWidth') * 1px);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .breadcrumbs-wrapper.responsive .breadcrumbs {
    min-width: 0;
  }
  .debug{
  	background:grey
  } 
  .debug .breadcrumbs{
    background:pink
  } 
  .debug .breadcrumb {
  	background:blue
  }
  .debug .triangle-wrap{
  	background:green
  }
</style>
