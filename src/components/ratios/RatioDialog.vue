<template>
  <Dialog @clickOutside="close">
  </Dialog>
</template>

<script>
import store from '@/store'

import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

export default {
  props: ['paneId', 'bucketId'],
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  computed: {
    color: function () {
      return store.state[this.paneId].buckets[this.bucketId].color
    },
    conditionnalColor: function () {
      const bucket = store.state[this.paneId].buckets[this.bucketId]

      if (typeof bucket.conditionnalColor === 'undefined') {
        this.setConditionnalColor(false)
      }
      return bucket.conditionnalColor
    },
    enabled: function () {
      return store.state[this.paneId].buckets[this.bucketId].enabled
    },
    name: function () {
      return store.state[this.paneId].buckets[this.bucketId].name
    },
    type: function () {
      return store.state[this.paneId].buckets[this.bucketId].type
    },
    input: function () {
      return store.state[this.paneId].buckets[this.bucketId].input
    },
    precision: function () {
      return store.state[this.paneId].buckets[this.bucketId].precision || null
    }
  }
}
</script>