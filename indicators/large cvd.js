//-------------BUY SIZE---------------
    buySize = vbuy / cbuy
    
    
    //Bolliger bands around Buy Size
    a_buy = sma(Math.pow(buySize, 2), options.length)
    b_buy = Math.pow(sum(buySize, options.length),2) / Math.pow(options.length, 2)
    stdev_buy = Math.sqrt(a_buy - b_buy)
    
    basis_buy = sma(buySize, options.length)
    dev_buy = options.mult * stdev_buy
    upper_buy = basis_buy + dev_buy
    lower_buy = basis_buy - dev_buy
    
    
    //-----------------SELL SIZE------------------
    sellSize = vsell / csell
    
    
    //Bolliger bands around Sell Size
    a_sell = sma(Math.pow(sellSize, 2), options.length)
    b_sell = Math.pow(sum(sellSize, options.length),2) / Math.pow(options.length, 2)
    stdev_sell = Math.sqrt(a_sell - b_sell)
    
    
    basis_sell = sma(sellSize, options.length)
    dev_sell = options.mult * stdev_sell
    upper_sell = basis_sell + dev_sell
    lower_sell = basis_sell - dev_sell
    
    
    
    //---------------BIG ORDER CVD------------------
    bigOrderBuyVol = buySize > upper_buy ? vbuy: 0
    bigOrderSellVol = sellSize > upper_sell ? vsell: 0
    
    bigOrderDelta = bigOrderBuyVol - bigOrderSellVol
    
    bigOrderCVD = cum(bigOrderDelta)
    
    line(bigOrderCVD, title=B)