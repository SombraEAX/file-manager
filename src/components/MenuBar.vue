<template>
  <div class="menu-bar" v-if="items.length">
    <div
      class="menu-item"
      v-for="item in items"
      :key="item.label"
      @click="openMenu(item, $event)"
    >
      {{ item.label }}
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'

  let clickHandler

  const { ipcRenderer } = window.electron

  ipcRenderer.on('show-menu-bar-submenu-reply', (_,id) => clickHandler && clickHandler(id))

  export default {
    name: 'MenuBar',

    props: {
      view:       String,
      sortColumn: String,
      sortOrder:  String,
      groupBy:    String,
      isDev:      Boolean,
      autohideLeftPanel: Boolean,
      autohideTopPanel: Boolean,
      showHidden: Boolean
    },

    emits: [
      'changeView', 
      'changeSortColumn', 
      'changeSortOrder',
      'changeGroup',
      'toggleAutohideLeftPanel',
      'toggleAutohideTopPanel',
      'toggleShowHidden',
      'selectAll',
      'invertSelection'
    ],

    data(){
      return { theme }
    },

    mounted() {
      clickHandler = this.itemClick.bind(this)
    },
   
    methods: {
      openMenu(menuItem, event){
        let rect = event.currentTarget.getBoundingClientRect()
        ipcRenderer.send('show-menu-bar-submenu', {
          items: menuItem.submenu,
          x: rect.x,
          y: rect.y + rect.height
        })
      },

      itemClick(id){
        switch(id){
          case 'icons':
          case 'table':
          case 'list': {
            this.$emit('changeView', id)
            break
          }
          case 'sort-by-name':
          case 'sort-by-type':
          case 'sort-by-modified':
          case 'sort-by-size': {
            let field = id.split('-')[2]
            this.$emit('changeSortColumn', field)
            break
          }
          case 'asc':
          case 'desc': {
            this.$emit('changeSortOrder', id)          
            break
          }
          case 'group-by-name':
          case 'group-by-type':
          case 'group-by-modified':
          case 'group-by-size': {
            let field = id.split('-')[2]
            this.$emit('changeGroup', field)          
            break
          }
          case 'no-group': {
            this.$emit('changeGroup', null)          
            break
          }
          case 'autohide-left-panel': {
            this.$emit('toggleAutohideLeftPanel')
            break
          }
          case 'autohide-top-panel': {
            this.$emit('toggleAutohideTopPanel')
            break
          }
          case 'show-hidden': {
            this.$emit('toggleShowHidden')
            break
          }
          case 'select-all': {
            this.$emit('selectAll')
            break
          }
          case 'invert-selection': {
            this.$emit('invertSelection')
            break
          }
        }
      }
    },

    computed: {
      items(){
        return [
          {
            label: 'Edit',
            submenu: [
              {
                label: 'Select All',
                id: 'select-all'
              },
              {
                label: 'Invert Selection',
                id: 'invert-selection'
              }
            ]
          },
          {
            label: 'View',
            submenu:[
              {
                type: 'radio', 
                label: 'Icons', 
                id: 'icons', 
                checked: this.view === 'icons' 
              },
              {
                type: 'radio', 
                label: 'List',  
                id: 'list',
                checked: this.view === 'list' 
              },
              {
                type: 'radio', 
                label: 'Table', 
                id: 'table',
                checked: this.view === 'table' 
              },
              { type: 'separator' },
              {
                label: 'Sort by',
                submenu:[
                  {
                    label:   'Name',
                    id:      'sort-by-name',
                    type:    'radio',
                    checked: this.sortColumn === 'name'
                  },
                  {
                    label:   'Modified',
                    id:      'sort-by-modified',
                    type:    'radio',
                    checked: this.sortColumn === 'modified'
                  },
                  {
                    label:   'Size',
                    id:      'sort-by-size',
                    type:    'radio',
                    checked: this.sortColumn === 'size'
                  },
                  {
                    label:   'Type',
                    id:      'sort-by-type',
                    type:    'radio',
                    checked: this.sortColumn === 'type'
                  },
                  { type: 'separator' },
                  {
                    label:   'Ascending order',
                    id:      'asc',
                    type:    'radio',
                    checked: this.sortOrder === 'asc'
                  },
                  {
                    label:   'Descending order',
                    id:      'desc',
                    type:    'radio',
                    checked: this.sortOrder === 'desc'
                  },                  
                ]
              },
              {
                label: 'Group by',
                submenu:[
                  {
                    label:   'Name',
                    id:      'group-by-name',
                    type:    'radio',
                    checked: this.groupBy === 'name'
                  },
                  {
                    label:   'Modified',
                    id:      'group-by-modified',
                    type:    'radio',
                    checked: this.groupBy === 'modified'
                  },
                  {
                    label:   'Size',
                    id:      'group-by-size',
                    type:    'radio',
                    checked: this.groupBy === 'size'
                  },
                  {
                    label:   'Type',
                    id:      'group-by-type',
                    type:    'radio',
                    checked: this.groupBy === 'type'
                  },
                  {
                    label:   'None',
                    id:      'no-group',
                    type:    'radio',
                    checked: this.groupBy === null
                  }
                ]                
              },
              { type: 'separator' },
              {
                label: 'Show hidden files',
                id: 'show-hidden',
                type: 'checkbox',
                checked: this.showHidden
              },
              { type: 'separator' },
              {
                label: 'Autohide left panel',
                id: 'autohide-left-panel',
                type: 'checkbox',
                checked: this.autohideLeftPanel
              },
              {
                label: 'Autohide top panel',
                id: 'autohide-top-panel',
                type: 'checkbox',
                checked: this.autohideTopPanel
              },
              { role: 'toggleDevTools', visible: this.isDev }              
            ]
          }
        ]
      }
    }
  }
</script>
<style scoped>
  .menu-bar{
    display:flex;
    height:22px;
    background:transparent;
    flex-shrink:0
  }
  .menu-item{
    padding:2px 10px;
    font-size:15px;
    font-family:sans-serif;
    cursor:default;
    display:flex;
    align-items:center;
    border-radius:3px
  }
  .menu-item:hover{
    background:rgba(0,0,0,0.08)
  }
</style>
