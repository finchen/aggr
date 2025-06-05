import alertService, { MarketAlert } from '@/services/alertService'
import dialogService from '@/services/dialogService'
import { formatAmount, formatPrice } from '@/services/productsService'
import store from '@/store'
import { ChartPaneState } from '@/store/panesSettings/chart'
import {
    createComponent,
    floorTimestampToTimeframe,
    getEventCords,
    mountComponent,
    sleep
} from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'
import {
    IPriceLine,
    MouseEventParams,
    PriceLineOptions
} from 'lightweight-charts'
import Chart from './chart'
import AlertEventHandler from './controls/alertEventHandler'
import MeasurementEventHandler from './controls/measurementEventHandler'
import {
    getChartCustomColorsOptions,
    getChartGridlinesOptions,
    getChartBorderOptions,
    getChartLayoutOptions
} from './options'
import { components, controlledCharts, syncCrosshair } from './common'
import iframeService from '@/services/iframeService'

export default class ChartControl {
    chart: Chart

    private onPanTimeout: number
    private legendElements: { [id: string]: HTMLElement }
    private lastCrosshairX: number
    private activeEvent: any
    private isSyncingCrosshairs: boolean

    private clickHandler: (event: MouseEvent | TouchEvent) => void
    private contextMenuHandler: (event: MouseEvent | TouchEvent) => void
    private clearChartsCrosshairsHandler: (event: MouseEvent) => void
    private crosshairMoveHandler: (MouseEventParams) => void
    private onPanHandler: (MouseEventParams) => void
    private unsubscribeStore: () => void

    constructor(chart) {
        this.chart = chart
    }

    bindEvents() {
        this.subscribeStore()

        // bind pan
        this.onPanHandler = this.onPan.bind(this)
        this.chart.chartInstance
            .timeScale()
            .subscribeVisibleLogicalRangeChange(this.onPanHandler)
        const canvas = this.chart.chartElement

        // bind click
        if (import.meta.env.VITE_APP_PUBLIC_VAPID_KEY) {
            this.clickHandler = this.onClick.bind(this)
            canvas.addEventListener(
                isTouchSupported() ? 'touchstart' : 'mousedown',
                this.clickHandler
            )
        }
        this.contextMenuHandler = this.onContextMenu.bind(this)
        canvas.addEventListener('contextmenu', this.contextMenuHandler)

        bindEvents() {
            this.subscribeStore()

            // bind pan
            this.onPanHandler = this.onPan.bind(this)
            this.chart.chartInstance
                .timeScale()
                .subscribeVisibleLogicalRangeChange(this.onPanHandler)
            const canvas = this.chart.chartElement

            // bind click
            if (import.meta.env.VITE_APP_PUBLIC_VAPID_KEY) {
                this.clickHandler = this.onClick.bind(this)
                canvas.addEventListener(
                    isTouchSupported() ? 'touchstart' : 'mousedown',
                    this.clickHandler
                )
                this.contextMenuHandler = this.onContextMenu.bind(this)
                canvas.addEventListener('contextmenu', this.contextMenuHandler)
            }

            // bind crosshair
            this.crosshairMoveHandler = this.onCrosshairMove.bind(this)
            this.chart.chartInstance.subscribeCrosshairMove(this.crosshairMoveHandler)
            this.clearChartsCrosshairsHandler = this.clearChartsCrosshairs.bind(this)
            canvas.addEventListener('mouseleave', this.clearChartsCrosshairsHandler)

            // unbind pan
            this.chart.chartInstance
                .timeScale()
                .unsubscribeVisibleLogicalRangeChange(this.onPan)

            // unbind click / context menu
            const canvas = this.chart.chartElement

            if (import.meta.env.VITE_APP_PUBLIC_VAPID_KEY) {
                const clickEventName = isTouchSupported() ? 'touchstart' : 'mousedown'
                canvas.removeEventListener(clickEventName, this.clickHandler)
                this.clickHandler = null
            }
            canvas.removeEventListener('contextmenu', this.contextMenuHandler)
            this.contextMenuHandler = null

            // unbind crosshair
            this.chart.chartInstance.unsubscribeCrosshairMove(this.crosshairMoveHandler)
            this.crosshairMoveHandler = null

            // remove from sync
            const index = controlledCharts.indexOf(this.chart)
            if (index !== -1) {
                controlledCharts.splice(index, 1)
            }
        }

        subscribeStore() {
            this.unsubscribeStore = store.subscribe(mutation => {
                switch (mutation.type) {
                    case this.chart.paneId + '/FLAG_INDICATOR_AS_SAVED':
                        this.chart.saveIndicatorPreview(mutation.payload)
                        break
                    case 'settings/SET_CHART_THEME':
                    case 'settings/SET_TEXT_COLOR':
                    case 'settings/SET_BACKGROUND_COLOR':
                        this.chart.chartInstance.applyOptions(
                            getChartCustomColorsOptions(this.chart.paneId)
                        )
                        break
                    case 'settings/TOGGLE_NORMAMIZE_WATERMARKS':
                        this.chart.refreshMarkets()
                        break
                    case 'settings/SET_TIMEZONE_OFFSET':
                        this.chart.setTimezoneOffset(store.state.settings.timezoneOffset)
                        this.chart.clearChart()
                        this.chart.renderAll()
                        break
                    case 'panes/SET_PANE_MARKETS':
                        if (mutation.payload.id === this.chart.paneId) {
                            store.state[this.chart.paneId].hiddenMarkets = {}
                            this.chart.refreshMarkets()

                            this.chart.clear()
                            this.chart.fetch()
                        }
                        break
                    case 'panes/SET_PANE_ZOOM':
                        if (mutation.payload.id === this.chart.paneId) {
                            this.chart.updateFontSize()
                        }
                        break
                    case this.chart.paneId + '/SET_TIMEFRAME':
                        this.chart.clear()
                        this.chart.fetch()
                        break
                    case 'settings/TOGGLE_ALERTS':
                    case this.chart.paneId + '/TOGGLE_ALERTS':
                    case this.chart.paneId + '/TOGGLE_ALERTS_LABEL':
                    case 'settings/SET_ALERTS_COLOR':
                    case 'settings/SET_ALERTS_LINESTYLE':
                    case 'settings/SET_ALERTS_LINEWIDTH':
                    case 'app/EXCHANGE_UPDATED':
                    case this.chart.paneId + '/TOGGLE_MARKET':
                        this.chart.refreshMarkets()
                        this.chart.refreshAllIndicatorAdapters()
                        this.chart.renderAll()
                        break
                    case this.chart.paneId + '/SET_REFRESH_RATE':
                        this.chart.clearQueue()
                        this.chart.setupQueue()
                        break
                    case this.chart.paneId + '/TOGGLE_LEGEND':
                    case this.chart.paneId + '/TOGGLE_INDICATORS':
                        if (
                            store.state[this.chart.paneId].showIndicators &&
                            store.state[this.chart.paneId].showLegend
                        ) {
                            this.bindLegend()
                        }

                        controlledCharts.push(this.chart)
                }

                unbindEvents() {
                    this.unsubscribeStore()
                    this.unbindLegend()

                    // unbind pan
                    this.chart.chartInstance
                        .timeScale()
                        .unsubscribeVisibleLogicalRangeChange(this.onPan)

                    // unbind click / context menu
                    if (import.meta.env.VITE_APP_PUBLIC_VAPID_KEY) {
                        const canvas = this.chart.chartElement
                        const clickEventName = isTouchSupported() ? 'touchstart' : 'mousedown'
                        canvas.removeEventListener(clickEventName, this.clickHandler)
                        this.clickHandler = null
                        canvas.removeEventListener('contextmenu', this.contextMenuHandler)
                        this.contextMenuHandler = null
                    }

                    // unbind crosshair
                    this.chart.chartInstance.unsubscribeCrosshairMove(this.crosshairMoveHandler)
                    this.crosshairMoveHandler = null

                    // remove from sync
                    const index = controlledCharts.indexOf(this.chart)
                    if (index !== -1) {
                        controlledCharts.splice(index, 1)
                    }
                }

                subscribeStore() {
                    this.unsubscribeStore = store.subscribe(mutation => {
                        switch (mutation.type) {
                            case this.chart.paneId + '/FLAG_INDICATOR_AS_SAVED':
                                this.chart.saveIndicatorPreview(mutation.payload)
                                break
                            case 'settings/SET_CHART_THEME':
                            case 'settings/SET_TEXT_COLOR':
                            case 'settings/SET_BACKGROUND_COLOR':
                                this.chart.chartInstance.applyOptions(
                                    getChartCustomColorsOptions(this.chart.paneId)
                                )
                                break
                            case 'settings/TOGGLE_NORMAMIZE_WATERMARKS':
                                this.chart.refreshMarkets()
                                break
                            case 'settings/SET_TIMEZONE_OFFSET':
                                this.chart.setTimezoneOffset(store.state.settings.timezoneOffset)
                                this.chart.clearChart()
                                this.chart.renderAll()
                                break
                            case 'panes/SET_PANE_MARKETS':
                                if (mutation.payload.id === this.chart.paneId) {
                                    store.state[this.chart.paneId].hiddenMarkets = {}
                                    this.chart.refreshMarkets()

                                    this.chart.clear()
                                    this.chart.fetch()
                                }
                                break
                            case 'panes/SET_PANE_ZOOM':
                                if (mutation.payload.id === this.chart.paneId) {
                                    this.chart.updateFontSize()
                                }
                                break
                            case this.chart.paneId + '/SET_TIMEFRAME':
                                this.chart.clear()
                                this.chart.fetch()
                                break
                            case 'settings/TOGGLE_ALERTS':
                            case this.chart.paneId + '/TOGGLE_ALERTS':
                            case this.chart.paneId + '/TOGGLE_ALERTS_LABEL':
                            case 'settings/SET_ALERTS_COLOR':
                            case 'settings/SET_ALERTS_LINESTYLE':
                            case 'settings/SET_ALERTS_LINEWIDTH':
                            case 'app/EXCHANGE_UPDATED':
                            case this.chart.paneId + '/TOGGLE_MARKET':
                                this.chart.refreshMarkets()
                                this.chart.refreshAllIndicatorAdapters()
                                this.chart.renderAll()
                                break
                            case this.chart.paneId + '/SET_REFRESH_RATE':
                                this.chart.clearQueue()
                                this.chart.setupQueue()
                                break
                            case this.chart.paneId + '/TOGGLE_LEGEND':
                            case this.chart.paneId + '/TOGGLE_INDICATORS':
                                if (
                                    store.state[this.chart.paneId].showIndicators &&
                                    store.state[this.chart.paneId].showLegend
                                ) {
                                    this.bindLegend()
                                } else {
                                    this.unbindLegend()
                                }
                                break
                            case this.chart.paneId + '/SET_GRIDLINES':
                                this.chart.chartInstance.applyOptions(
                                    getChartGridlinesOptions(this.chart.paneId)
                                )
                                break
                            case this.chart.paneId + '/SET_BORDER':
                            case this.chart.paneId + '/TOGGLE_AXIS':
                                this.chart.chartInstance.applyOptions(
                                    getChartLayoutOptions(this.chart.paneId)
                                )
                                this.chart.chartInstance.applyOptions(
                                    getChartBorderOptions(this.chart.paneId)
                                )
                                break
                            case this.chart.paneId + '/SET_TEXT_COLOR':
                                this.chart.chartInstance.applyOptions(
                                    getChartLayoutOptions(this.chart.paneId)
                                )
                                break
                            case this.chart.paneId + '/SET_WATERMARK':
                            case this.chart.paneId + '/TOGGLE_NORMAMIZE_WATERMARKS':
                                this.chart.updateWatermark()
                                break
                            case this.chart.paneId + '/SET_INDICATOR_OPTION':
                                this.chart.setIndicatorOption(
                                    mutation.payload.id,
                                    mutation.payload.key,
                                    mutation.payload.value,
                                    mutation.payload.silent
                                )
                                break
                            case this.chart.paneId + '/SET_PRICE_SCALE':
                                if (mutation.payload.priceScale) {
                                    this.chart.refreshPriceScale(mutation.payload.id)
                                }
                                break
                            case this.chart.paneId + '/SET_INDICATOR_SCRIPT':
                                this.chart.rebuildIndicator(mutation.payload.id)
                                break
                            case this.chart.paneId + '/ADD_INDICATOR':
                                if (this.chart.addIndicator(mutation.payload.id)) {
                                    this.chart.redrawIndicator(mutation.payload.id)

                                    if (
                                        store.state[this.chart.paneId].showIndicators &&
                                        store.state[this.chart.paneId].showLegend
                                    ) {
                                        this.bindLegend(mutation.payload.id)
                                    }
                                }
                                break
                            case this.chart.paneId + '/UPDATE_INDICATOR_ORDER':
                                this.chart.moveIndicator(
                                    mutation.payload.id,
                                    mutation.payload.position
                                )
                                break
                            case this.chart.paneId + '/REMOVE_INDICATOR':
                                this.unbindLegend(mutation.payload)
                                this.chart.removeIndicator(mutation.payload)
                                break
                            case this.chart.paneId + '/TOGGLE_FILL_GAPS_WITH_EMPTY':
                                this.chart.toggleFillGapsWithEmpty()
                                break
                            case 'settings/TOGGLE_AUTO_HIDE_HEADERS':
                                this.chart.refreshChartDimensions()
                                break
                        }
                    })
                }

                onContextMenu(event) {
                    if (window.innerWidth < 375) {
                        return
                    }

                    const canvas = event.currentTarget as HTMLCanvasElement

                    event.preventDefault()
                    const { x, y } = getEventCords(event, true)
                    const { top, left } = canvas.getBoundingClientRect()
                    const api = this.chart.getPriceApi()
                    const market = this.chart.mainIndex

                    let price
                    let alert
                    if (api) {
                        const pricedCoordinate = api.coordinateToPrice(y - top)

                        if (pricedCoordinate) {
                            price = alertService.formatPrice(pricedCoordinate)
                        }

                        const timeScale = this.chart.chartInstance.timeScale()

                        const priceline = api.getPriceLine(
                            price,
                            timeScale ? timeScale.coordinateToLogical(x - left) : null
                        ) as IPriceLine

                        if (priceline) {
                            const pricelineOptions = priceline.options() as PriceLineOptions &
                                MarketAlert

                            alert = {
                                price: pricelineOptions.price,
                                market: pricelineOptions.market,
                                message: pricelineOptions.message
                            }
                        }
                    }

                    const timestamp = floorTimestampToTimeframe(
                        Date.now() / 1000,
                        this.chart.timeframe
                    )
                    const timeframe = store.state[this.chart.paneId].timeframe.toString()
                    const paneId = this.chart.paneId

                    this.createContextMenu({
                        value: {
                            top: y - 1,
                            left: x - 1,
                            width: 2,
                            height: 2
                        },
                        market,
                        price,
                        timeframe,
                        timestamp,
                        paneId,
                        alert,
                        getPrice: this.chart.getPrice.bind(this.chart)
                    })
                }

    async createContextMenu(propsData) {
                    if (components.contextMenu) {
                        components.contextMenu.$off('cmd')
                        for (const key in propsData) {
                            components.contextMenu[key] = propsData[key]
                        }
                    } else {
                        document.body.style.cursor = 'progress'
                        const module = await import(`@/components/chart/ChartContextMenu.vue`)
                        document.body.style.cursor = ''

                        components.contextMenu = createComponent(module.default, propsData)

                        mountComponent(components.contextMenu)
                    }

                    components.contextMenu.$on('cmd', args => {
                        if (this.chart[args[0]] instanceof Function) {
                            this.chart[args[0]](...args.slice(1))
                        } else {
                            throw new Error(
                                `[chart/control] ContextMenu->chart->${args[0]} is not a function`
                            )
                        }
                    })
                }

                onClick(event: MouseEvent | TouchEvent) {
                    if (dialogService.hasDialogOpened) {
                        return
                    }

                    mountComponent(components.timeframeDropdown)

                    components.timeframeDropdown.$on('input', value => {
                        components.timeframeDropdown.value = value
                    })
                } else {
                    if (components.timeframeDropdown.value === event.currentTarget) {
                        components.timeframeDropdown.value = null
                    } else {
                        components.timeframeDropdown.paneId = propsData.paneId
                        components.timeframeDropdown.value = propsData.value
                    }
                }
            }
