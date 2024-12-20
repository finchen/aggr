import Exchange from '../exchange'

const isDev = false;
const API_PORT = isDev ? 3001 : 3000;
const WS_PORT = isDev ? 3013 : 3012;

export const ORDERBOOK_API_URL = import.meta.env.VITE_APP_PROXY_URL + `http://localhost:${API_PORT}/api/orderbook`

export default class ORDERBOOK extends Exchange {
  id = 'ORDERBOOK'

  protected endpoints = {
    PRODUCTS: [import.meta.env.VITE_APP_PROXY_URL + `http://localhost:${API_PORT}/api/orderbook/products`]
  }



  async getUrl() {
    return `ws://localhost:${WS_PORT}`
  }

  formatProducts(response) {
    const products = []
    const types = {}

    for (const product of response) {
      products.push(`${product.exchange}-${product.symbol}`)
    }

    products.push(`AGGRSPOT-BTCUSD`)
    products.push(`AGGRPERP-BTCUSD`)
    products.push(`AGGRSPOT-BTCUSDALERTS`)

    types[`AGGRSPOT-BTCUSD`] = 'spot'
    types[`AGGRPERP-BTCUSD`] = 'perp'

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
