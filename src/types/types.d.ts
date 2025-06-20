import 'vite/client'

export type SlippageMode = false | 'price' | 'bps'
export type AggregationLength = 0 | 1 | 10 | 100 | 1000 | -1

declare module 'test.worker' {
    // You need to change `Worker`, if you specified a different value for the `workerType` option
    class WebpackWorker extends Worker {
        constructor()
    }

    // Uncomment this if you set the `esModule` option to `false`
    // export = WebpackWorker;
    export default WebpackWorker
}

export interface AggregatorPayload {
    op: string
    data?: any
    trackingId?: string
}

export interface AggregatorSettings {
    aggregationLength: AggregationLength
    calculateSlippage?: SlippageMode
    preferQuoteCurrencySize?: boolean
    wsProxyUrl?: string
    buckets?: { [bucketId: string]: string[] }
}

export interface Market {
    id: string
    exchange: string
    pair: string
}

type PriceVolumeTuple = [number, number]

export interface Trade {
    exchange: string
    pair: string
    timestamp: number
    price: number
    size: number
    side: 'buy' | 'sell'
    originalPrice?: number
    avgPrice?: number
    amount?: number
    count?: number
    zlevels?: { bids: Array<PriceVolumeTuple>; asks: Array<PriceVolumeTuple> }
    zbids?: Array<number>
    zasks?: Array<number>
    zupdates?: number
    zalert?: Array<any>
    liquidation?: boolean
    slippage?: number
}

export interface AggregatedTrade extends Trade {
    value: number // cumulative price * size
}

export interface Volumes {
    timestamp: number
    vbuy: number
    vsell: number
    cbuy: number
    csell: number
    lbuy: number
    lsell: number
}

export interface Connection {
    exchange: string
    pair: string
    hit: number
    timestamp: number
    bucket?: Volumes
}

export interface ProductsStorage {
    exchange: string
    timestamp?: number
    data: ProductsData
}

export interface GifsStorage {
    slug: string
    keyword: string
    timestamp?: number
    data: string[]
}
export interface Workspace {
    version?: number
    createdAt: number
    updatedAt: number
    id: string
    name: string
    states: { [id: string]: any }
}

export interface Preset {
    name: string
    type?: 'preset'
    data: any
    createdAt: number
    updatedAt: number
    markets?: string[]
    version?: string
}

export interface ImportedSound {
    name: string
    data: any
}
export type ProductsData = string[] | { [prop: string]: any }

export interface PreviousSearchSelection {
    label: string
    count: number
    markets: string[]
}

export interface Ticker {
    updated?: boolean
    initialPrice?: number
    price: number
    volume?: number
    volumeDelta?: number
}
