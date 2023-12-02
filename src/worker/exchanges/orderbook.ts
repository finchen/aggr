import Exchange from '../exchange'

const isDev = false;
const API_PORT = isDev ? 3001 : 3000;
const WS_PORT = isDev ? 3013 : 3012;

export const ORDERBOOK_API_URL = `http://localhost:${API_PORT}/api/orderbook`

export default class ORDERBOOK extends Exchange {
  id = 'ORDERBOOK'

  protected endpoints = {
    PRODUCTS: [`http://localhost:${API_PORT}/api/orderbook/products`]
  }

  /*products = [
    'BTCUSD-AGGRPERP-0','BTCUSD-AGGRPERP-1','BTCUSD-AGGRPERP-2','BTCUSD-AGGRPERP-3',
    'BTCUSD-AGGRSPOT-0','BTCUSD-AGGRSPOT-1','BTCUSD-AGGRSPOT-2','BTCUSD-AGGRSPOT-3',
    'BTCUSD-AGGRPERP-BIDS','BTCUSD-AGGRPERP-ASKS',
    'BTCUSD-AGGRSPOT-BIDS','BTCUSD-AGGRSPOT-ASKS',
    'BTCUSD-BINANCE-0','BTCUSDT-BINANCE-1','BTCUSDT-BINANCE-2','BTCUSDT-BINANCE-3',
    'BTCUSD-COINBASE-0','BTCUSD-COINBASE-1','BTCUSD-COINBASE-2','BTCUSD-COINBASE-3',
    'BTCUSD-BINANCEPERP-0','BTCUSD-BINANCEPERP-1','BTCUSD-BINANCEPERP-2','BTCUSD-BINANCEPERP-3',
]*/

  async getUrl() {
    return `ws://localhost:${WS_PORT}`
  }

  formatProducts(response) {
    const products = []
    const types = {}

    for (const product of response) {
      // For each exchange/pair we add the ratios, bids and asks
      for (const obType of ['RATIO', 'BIDS', 'ASKS']) {
        for (const obTypeIndex of [0, 1, 2, 3]) {
          const symbol = `${product.exchange}-${product.symbol}${obType}${obTypeIndex}`
          products.push(symbol)
          //types[symbol] = product.type
        }
      }
    }

    products.push(`AGGRSPOT-BTCUSDLEVELS`)
    types[`AGGRSPOT-BTCUSDLEVELS`] = 'spot'
    products.push(`AGGRPERP-BTCUSDLEVELS`)
    //types[`AGGRPERP-BTCUSDLEVELS`] = 'perp'

    return {
      products
      //types
    }
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async subscribe(api, pair) {
    if (!(await super.subscribe(api, pair))) {
      return
    }

    api.send(
      JSON.stringify({
        event: 'subscribe',
        data: pair
      })
    )

    return true
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} pair
   */
  async unsubscribe(api, pair) {
    if (!(await super.unsubscribe(api, pair))) {
      return
    }

    api.send(
      JSON.stringify({
        event: 'unsubscribe',
        data: pair
      })
    )

    return true
  }

  formatTrade(trade, channel) {
    return {
      exchange: this.id,
      pair: channel,
      timestamp: +trade.timestamp,
      price: +trade.price,
      size: +trade.volume,
      side: trade.side,
      zlevels: trade.zlevels ? trade.zlevels : undefined,
      zratios: trade.zratios ? trade.zratios : undefined,
      zbids: trade.zbids ? trade.zbids : undefined,
      zasks: trade.zasks ? trade.zasks : undefined,
      zupdates: trade.zupdates ? trade.zupdates : undefined,
      zalert: trade.zalert ? trade.zalert : []
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)

    return this.emitTrades(api.id, [this.formatTrade(json.data, json.channel)])
  }
}
