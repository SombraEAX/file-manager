<template>
  <div></div>
</template>
<script>
  // vue wrapper around the standard electron menu bar

  let clickHandler

  const { ipcRenderer } = window.electron

  ipcRenderer.on('menu-bar-click', (_,id) => clickHandler && clickHandler(id))

  export default {
    name: 'MenuBar',

    props: {
      view:       String,
      sortColumn: String,
      sortOrder:  String,
      groupBy:    String,
      isDev:      Boolean
    },

    emits: [
      'changeView', 
      'changeSortColumn', 
      'changeSortOrder',
      'changeGroup'
    ],

    mounted() {
      this.updateMenu(this.items)
      clickHandler = this.itemClick.bind(this)
    },
  
    methods: {
      // handler for clicking on a menu item
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
        }
      },

      // updates the menu state
      updateMenu(newValue){
        ipcRenderer.send(
          'update-menu-bar',
          JSON.parse(JSON.stringify(newValue))
        )
      }
    },

    computed: {
      items(){
        return [
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
              { role: 'toggleDevTools', visible: this.isDev }              
            ]
          }
        ]
      }
    },

    watch: {
      items: {
        deep:true,
        handler(newValue){
          this.updateMenu(newValue)
        }
      }
    }
    
  }
</script>
