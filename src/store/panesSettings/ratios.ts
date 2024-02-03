import { MutationTree, ActionTree, GetterTree, Module } from 'vuex'


export interface RatioBucket {
  id: string
  name: string
  input: string
  enabled: boolean
  precision?: number
  color?: string
  type?: string
  conditionnalColor?: boolean
}

export interface RatiosPaneState {
  _id?: string
  granularity?: number
}

const getters = {} as GetterTree<RatiosPaneState, RatiosPaneState>

const state = {
  granularity: 5000,
  enableChart: false
} as RatiosPaneState

const actions = {

} as ActionTree<RatiosPaneState, RatiosPaneState>

const mutations = {

} as MutationTree<RatiosPaneState>

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<RatiosPaneState, RatiosPaneState>
