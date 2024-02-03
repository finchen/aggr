<template>
  <Dialog @clickOutside="close" class="pane-dialog">
    <template v-slot:header>
      <div
        class="dialog__title -editable"
        @dblclick="renamePane"
        v-text="name"
      ></div>
      <div class="column -center"></div>
    </template>
    <ratios-settings :paneId="paneId" />
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import RatiosSettings from './RatiosSettings.vue'

export default {
  components: { RatiosSettings },
  mixins: [DialogMixin, PaneDialogMixin]
}
</script>
