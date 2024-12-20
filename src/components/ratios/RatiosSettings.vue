<template>
  <div class="settings-ratios settings-section">
    <div class="column mb16">
    </div>
  </div>
</template>

<script lang="ts">
import dialogService from '@/services/dialogService'
import StatDialog from '@/components/ratios/RatiosDialog.vue'
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'RatiosSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class RatiosSettings extends Vue {
  paneId: string

  get enableChart() {
    return this.$store.state[this.paneId].enableChart
  }


  openStat(id) {
    dialogService.open(StatDialog, { bucketId: id, paneId: this.paneId })
  }
}
</script>
