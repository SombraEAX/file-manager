<template>
  <span class="entry-icon-wrap" :class="{ 'entry-icon-clip': hasFold }">
    <div
      class="entry-icon"
      :class="{ 'entry-icon--txt': hasFold }"
      :style="{
        width: size + 'px',
        height: size + 'px',
        background: !isDir && preview && preview.length ? `url(${preview[0]}) center/cover` : (isDir ? 'transparent' : bgColor),
        color: iconColor,
      }"
    >
      <div v-if="isDir" class="folder-back" :class="{ 'folder-back--root': type === 'root' }" :style="{ background: bgColor }"></div>
      <div v-if="isDir" class="folder-front" :style="{ background: bgColor }">
        <span v-if="type === 'root'" class="root-dot"></span>
        <div v-if="preview && preview.length && size >= 32" class="preview-grid">
          <div v-for="(src, i) in preview.slice(0, 4)" :key="i" class="preview-cell">
            <img :src="src" class="preview-img" />
          </div>
        </div>
        <span v-else-if="iconChar" class="nerd-icon" :style="{ fontSize: iconFontSize + 'px' }">{{ iconChar }}</span>
      </div>
      <template v-if="!isDir">
        <template v-if="preview && preview.length"></template>
        <template v-else>
          <div v-if="type === 'exe'" class="exe-container">
            <div class="exe-block"></div>
          </div>
          <div v-else-if="iconChar || type === 'pdf' || officeLetter" class="file-layout">
            <span v-if="iconChar" class="nerd-icon" :style="{ fontSize: iconFontSize + 'px' }">{{ iconChar }}</span>
            <span v-else-if="type === 'pdf'" class="nerd-icon nerd-icon--pdf" :style="{ fontSize: iconFontSize + 'px' }"></span>
            <span v-else-if="officeLetter" class="office-letter" :style="{ fontSize: iconFontSize + 'px' }">{{ officeLetter }}</span>
            <span v-if="size >= 32 && type !== 'txt' && type !== 'js' && type !== 'ts' && !officeLetter && !(type === 'dotfile' && size < 44)" class="file-ext" :style="{ fontSize: extFontSize + 'px' }">{{ type }}</span>
          </div>
          <span v-else-if="type" class="ext-text" :style="{ fontSize: iconSize + 'px' }">{{ type }}</span>
        </template>
      </template>
    </div>
  </span>
</template>
<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import filetypes from '../../filetypes.json'
  const imageTypes = new Set(filetypes.image)
  const audioTypes = new Set(filetypes.audio)
  const videoTypes = new Set(filetypes.video)
  const object3dTypes = new Set(filetypes['3d object'])
  const documentTypes = new Set(filetypes.document)
  const archiveTypes = new Set(['zip','rar','7z','tar','gz','bz2','xz','zst','tgz','lz','lzma','arj','cab','z'])

  export default defineComponent({
    props: {
      size: {
        type: Number,
        default: 16,
      },
      isDir: Boolean,
      type: String,
      preview: {
        type: Array as PropType<string[]>,
        default: () => [],
      },
    },
    computed: {
      bgColor(): string {
        if (this.isDir) {
          if (this.type === 'root') return '#a0a0a0'
          return '#ffc966'
        }
        const map: Record<string, string> = {
          txt: '#ccc',
          pdf: '#e74c3c',
          js: '#d4a017',
          py: '#3776ab',
          json: '#5cb85c',
          css: '#264de4',

          ts: '#3178c6',
          zip: '#f39c12',
          doc: '#2b579a',
          docx: '#2b579a',
          dot: '#2b579a',
          dotx: '#2b579a',
          rtf: '#2b579a',
          xls: '#217346',
          xlsx: '#217346',
          xlsm: '#217346',
          csv: '#217346',
          ppt: '#d24726',
          pptx: '#d24726',
          pps: '#d24726',
          ppsx: '#d24726',
          odt: '#2b579a',
          ods: '#217346',
          odp: '#d24726',
          sql: '#00758f',
          iso: '#555',
          cfg: '#7f8c8d',
          dotfile: '#7f8c8d',
          bin: '#2c3e50',
          xml: '#2980b9',
          music: '#9b59b6',
          videos: '#c0392b',
          exe: '#3498db',
          trash: '#95a5a6',
          desktop: '#27ae60',
          documents: '#2980b9',
          downloads: '#f39c12',
          public: '#16a085',
          home: '#3498db',
          npm: '#cc3534',
          content_copy: '#7f8c8d',
        }
        if (!this.type) return '#95a5a6'
        if (map[this.type]) return map[this.type]
        if (imageTypes.has(this.type)) return '#8e44ad'
        if (audioTypes.has(this.type)) return '#9b59b6'
        if (videoTypes.has(this.type)) return '#c0392b'
        if (object3dTypes.has(this.type)) return '#e67e22'
        if (archiveTypes.has(this.type)) return '#f39c12'
        if (this.hasFold) return '#ccc'
        let hash = 0
        for (let i = 0; i < this.type.length; i++) {
          hash = this.type.charCodeAt(i) + ((hash << 5) - hash)
        }
        return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`
      },
      iconColor() {
        if (this.type === 'html') return '#3498db'
        if (this.type === 'md') return '#607d8b'
        if (this.bgColor === '#ccc') return '#222'
        return '#fff'
      },
      hasFold() {
        return !!this.type && documentTypes.has(this.type) && !this.officeLetter && this.type !== 'pdf' && this.type !== 'xml'
      },
      hasIcon() {
        return !!this.iconChar
      },
      iconFontSize() {
        const base = Math.round(this.size * 0.55)
        if (this.type === 'txt') return Math.round(base * 1.8)
        if (this.type === 'npm') return Math.round(base * 1.6)
        return base
      },
      extFontSize() {
        return Math.max(9, Math.round(this.size * 0.15))
      },
      iconSize() {
        if (this.hasIcon) return Math.round(this.size * 0.68)
        return Math.round(this.size * 0.3)
      },
      officeLetter(): string {
        if (!this.type) return ''
        const word = new Set(['doc','docx','dot','dotx','rtf','odt'])
        const xls = new Set(['xls','xlsx','xlsm','csv','ods'])
        const ppt = new Set(['ppt','pptx','pps','ppsx','odp'])
        if (word.has(this.type)) return 'W'
        if (xls.has(this.type)) return 'X'
        if (ppt.has(this.type)) return 'P'
        return ''
      },
      iconChar(): string {
        const map: Record<string, string> = {
          desktop: '\u{f4a9}',
          documents: '\u{f018f}',
          downloads: '\u{f01da}',
          music: '\u{f075a}',
          pictures: '\u{f02f5}',
          public: '\u{f0497}',
          videos: '\uf03d',
          home: '\uf007',
          npm: '\u{f06f7}',
          trash: '\u{f48e}',
          txt: '\u{f09aa}',
          md: '\ue609',
          html: '\uf0ac',
          xml: '\u{f05c0}',
          js: '\ue60c',
          content_copy: '\u{f018f}',
          pdf: '',

          doc: '',
          docx: '',
          dot: '',
          dotx: '',
          rtf: '',
          xls: '',
          xlsx: '',
          xlsm: '',
          csv: '',
          ppt: '',
          pptx: '',
          pps: '',
          ppsx: '',
          odt: '',
          ods: '',
          odp: '',
          sql: '\uf1c0',
          iso: '\uf0c8',
          cfg: '\uf013',
          dotfile: '\uf013',
          bin: '\uf085',
          py: '\ue606',
          json: '\ue60b',
          css: '\ue614',
          ts: '\ue628',
        }
        if (!this.type) return ''
        if (map[this.type]) return map[this.type]
        if (imageTypes.has(this.type)) return map.pictures
        if (audioTypes.has(this.type)) return '\u{f025}'
        if (videoTypes.has(this.type)) return '\uf03d'
        if (object3dTypes.has(this.type)) return '\uf1b2'
        if (archiveTypes.has(this.type)) return ''
        return ''
      },
    },
  })
</script>
<style>
  @font-face{
    font-family:PureNerdFont;
    src:url('~@azurity/pure-nerd-font/PureNerdFont.woff2') format('woff2');
  }
</style>
<style scoped>
  .entry-icon{
    position:relative;
    border-radius:12.5%;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .entry-icon-wrap{
    display:inline-flex;
    align-items:center;
  }
  .entry-icon-clip{
    overflow:hidden;
  }
  .entry-icon--txt::before{
    content:'';
    position:absolute;
    top:-3.66%;
    right:-3.66%;
    width:25%;
    height:25%;
    border-radius:50%;
    background:linear-gradient(to top right, #b3b3b3 50%, #fff 50%);
    z-index:1;
  }
  .folder-back{
    position:absolute;
    top:0;
    left:5%;
    width:90%;
    height:65%;
    border-radius:12.5%;
    z-index:0;
    filter:brightness(0.75);
  }
  .folder-back--root{
    width:100%;
    left:0;
    border-radius:12.5% / 17.31%;
    filter:brightness(1.2);
  }
  .folder-front{
    position:absolute;
    bottom:0;
    left:0;
    width:100%;
    height:90%;
    border-radius:12.5%;
    z-index:0;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .root-dot{
    position:absolute;
    top:7%;
    right:7%;
    width:22%;
    height:22%;
    border-radius:50%;
    background:#2ecc71;
    z-index:2;
  }
  .preview-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    grid-template-rows:1fr 1fr;
    gap:7.5%;
    width:85%;
    height:85%;
  }
  .preview-grid.single{
    grid-template-columns:1fr;
    grid-template-rows:1fr;
    gap:0;
  }
  .preview-cell{
    border-radius:20%;
    overflow:hidden;
  }
  .preview-img{
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
  }
  .file-layout{
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    line-height:1;
  }
  .file-ext{
    font-family:sans-serif;
    line-height:1;
    text-transform:uppercase;
    font-weight:600;
    color:inherit;
  }
  .nerd-icon{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    line-height:1;
    font-size:inherit;
    color:inherit;
  }
  .nerd-icon--pdf::before{
    content:"\e67d";
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
  }
  .office-letter{
    font-family:sans-serif;
    line-height:1;
    font-size:inherit;
    font-weight:700;
    color:inherit;
  }
  .ext-text{
    font-family:sans-serif;
    font-size:inherit;
    line-height:1;
    text-transform:uppercase;
    font-weight:600;
    color:inherit;
  }
  .exe-container{
    width:100%;
    height:100%;
    padding:18.75% 6.25% 6.25% 6.25%;
    box-sizing:border-box;
  }
  .exe-block{
    width:100%;
    height:100%;
    border-radius:0;
    background:white;
  }
</style>
