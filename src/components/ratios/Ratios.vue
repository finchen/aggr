<template>
  <div class="pane-ratios">
    <pane-header
      :paneId="paneId"
      :settings="() => import('@/components/ratios/RatiosDialog.vue')"
    />
    <div v-if="enableChart" class="ratios-chart" ref="chart"></div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import * as TV from 'lightweight-charts'
import aggregatorService from '@/services/aggregatorService'


import RatioDialog from './RatioDialog.vue'
import dialogService from '@/services/dialogService'

import { formatAmount } from '@/services/productsService'
import PaneMixin from '@/mixins/paneMixin'
import PaneHeader from '../panes/PaneHeader.vue'

@Component({
  components: { PaneHeader },
  name: 'Ratios'
})
export default class Ratios extends Mixins(PaneMixin) {
  data = {}

  $refs!: {
    chart: HTMLElement
  }

  private _refreshChartDimensionsTimeout: number
  private _chart: TV.IChartApi
  private _feed: string = null

  get enableChart() {
    return this.$store.state[this.paneId].enableChart
  }

  created() {
    this._onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_TEXT_COLOR':
          if (this._chart && mutation.payload) {
            this._chart.applyOptions(getChartCustomColorsOptions(this.paneId))
          }
          break
        case 'settings/SET_CHART_THEME':
          if (this._chart) {
            this._chart.applyOptions(getChartCustomColorsOptions(this.paneId))
          }
          break
        case 'panes/SET_PANE_MARKETS':
        case this.paneId + '/SET_WINDOW':
          if (mutation.payload.id && mutation.payload.id !== this.paneId) {
            break
          }
          this.prepareBuckets()
          break
        case this.paneId + '/SET_BUCKET_COLOR':
          this.recolorBucket(mutation.payload.id, mutation.payload.value)
          break
        case this.paneId + '/SET_BUCKET_TYPE':
          if (this._chart) {
            this.reloadBucketSerie(mutation.payload.id, mutation.payload.value)
          }
          break
        case this.paneId + '/TOGGLE_CHART':
          if (mutation.payload) {
            this.createChart()
          } else {
            this.removeChart()
          }
          break
        case this.paneId + '/TOGGLE_BUCKET':
          if (mutation.payload.value) {
            this.createBucket(this.buckets[mutation.payload.id])
          } else {
            this.removeBucket(mutation.payload.id)
          }
          break
        case 'panes/SET_PANE_ZOOM':
          if (mutation.payload.id === this.paneId) {
            this.updateFontSize()
          }
          break
        case this.paneId + '/REMOVE_BUCKET':
          this.removeBucket(mutation.payload)
          break
        case this.paneId + '/SET_BUCKET_WINDOW':
        case this.paneId + '/SET_BUCKET_INPUT':
        case this.paneId + '/SET_BUCKET_PRECISION':
          this.refreshBucket(mutation.payload.id)
          break
        case this.paneId + '/RENAME_BUCKET':
          this.refreshBucketName(mutation.payload)
          break
      }
    })
  }

  mounted() {

  }

  beforeDestroy() {
    if (this._feed) {
      aggregatorService.off(this._feed, this.onVolume)
    }
  }

  updateFontSize() {
    if (!this._chart) {
      return
    }

    this._chart.applyOptions({
      layout: {
        fontSize: getChartFontSize(this.paneId)
      }
    })
  }

  async refreshChartDimensions(debounceTime = 500) {

    clearTimeout(this._refreshChartDimensionsTimeout)

    this._refreshChartDimensionsTimeout = setTimeout(() => {
      this._chart &&
        this._chart.resize(this.$el.clientWidth, this.$el.clientHeight)
    }, debounceTime) as unknown as number
  }

  onVolume(sums) {
    for (const id in this._buckets) {
      this._buckets[id].onStats(sums)

      if (this._buckets[id].stacks.length) {
        const value = this._buckets[id].getValue()

        this.$set(
          this.data[id],
          'value',
          formatAmount(value, this._buckets[id].precision)
        )
      }

      if (this._chart) {
        this._buckets[id].updateSerie()
      }
    }
  }

  editStat(id) {
    dialogService.open(RatioDialog, { paneId: this.paneId, bucketId: id })
  }

}
</script>

<style lang="scss">
.pane-ratios {
  position: relative;
}

.ratios-chart {
  display: static;

  &:before {
    content: '';
    display: block;
  }

  > * {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}

.ratios-buckets {
  padding: 0;
  margin: 0;
  list-style: none;
  top: 0;
  position: relative;
  width: 0;

  .tv-lightweight-charts canvas {
    z-index: auto;
  }

  .stat-bucket {
    flex-direction: column;
    align-items: flex-start;
    width: 0;
    white-space: nowrap;
  }

  &:last-child {
    width: auto;
    .stat-bucket {
      flex-direction: row;
      align-items: center;
      width: auto;
    }
  }
}

.stat-bucket {
  display: flex;
  align-items: center;
  padding: 0.75em;
  cursor: pointer;

  + .stat-bucket {
    padding-top: 0;
  }

  &__name {
    letter-spacing: 0.4px;
    transition: opacity 0.2s $ease-out-expo;
    font-size: 80%;
  }

  &__value {
    text-align: right;
    white-space: nowrap;
    font-family: $font-condensed;
    z-index: 1;
    flex-grow: 1;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
}
</style>
