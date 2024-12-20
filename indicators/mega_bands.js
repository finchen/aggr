if (!pendingMarkers) {
    // runs only once
    pendingMarkers = []
    spotColor = options.spotColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    perpColor = options.perpColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    binanceColor = options.binanceColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    coinbaseColor = options.coinbaseColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    allOnColor = options.allOnColor

    spotOpacity = buyColor.pop()
    perpOpacity = sellColor.pop()
    binanceOpacity = binanceColor.pop()
    coinbaseOpacity = coinbaseColor.pop()
  
    startOpacity = options.startOpacity || 0.5
  
    
    spotBuyAlerts  = [40, 63, 46, 60]
    spotSellAlerts = [-40, -63, -46, -60]

    perpBuyAlerts  = [38, 27, 36, 35]
    perpSellAlerts = [-20, -27, -36, -35]

    binanceBuyAlerts  = [70, 70, 70, 70]
    binanceSellAlerts = [-70, -70, -70, -70]

    coinbaseBuyAlerts  = [50, 50, 50, 50]
    coinbaseSellAlerts = [-50, -50, -50, -50]

    lowerPercent = [0.3, 1, 2.5, 5]
    upperPercent = [1, 2.5, 5, 10]

    /*
    function calculateOpacity (y, min, max, start, stop) {
      const x = start + (stop - start) * ((y - min) / (max - min));
      return x;
    }
    ${calculateOpacity(param.data[2], 500, 800, 0.2, 0.4)})
    */

        // lowerPercent = ratioIndex === 0 ? 0.3 : ratioIndex === 1 ? 1 : ratioIndex === 2 ? 2.5 : 5 
    // upperPercent = ratioIndex === 0 ? 1 : ratioIndex === 1 ? 2.5 : ratioIndex === 2 ? 5 : 10 
    // change band so we can overlay above agg
    /*if( toggleCoinbase ){
      lowerPercent = ratioIndex === 0 ? 0.4 : ratioIndex === 1 ? 1.2 : ratioIndex === 2 ? 3 : 6 
      upperPercent = ratioIndex === 0 ? 0.6 : ratioIndex === 1 ? 1.7 : ratioIndex === 2 ? 3.5 : 7 
    }else{
      lowerPercent = ratioIndex === 0 ? 0.6 : ratioIndex === 1 ? 1.9 : ratioIndex === 2 ? 4 : 8 
      upperPercent = ratioIndex === 0 ? 0.8 : ratioIndex === 1 ? 2.3 : ratioIndex === 2 ? 4.5 : 9 
    }*/
  }
  // </STARTUP SCRIPT> 
  
  var perps = []
  var spots = []
  var binance = []
  var coinbase = []

  var ratio = 0

  for(let ratioIndex = 0; ratioIndex < 4; ratioIndex++){
  
    var ratioPerp = ORDERBOOK:AGGRPERP-BTCUSDLEVELS.zratios[ratioIndex]
    var ratioSpot = ORDERBOOK:AGGRSPOT-BTCUSDLEVELS.zratios[ratioIndex]
    var ratioBinance = ORDERBOOK:BINANCE-BTCUSDLEVELS.zratios[ratioIndex]
    var ratioCoinbase = ORDERBOOK:COINBASE-BTCUSDLEVELS.zratios[ratioIndex]

    var directionPerp = Math.sign(ratio)
    var thresholdPerp = directionPerp > 0 ? perpBuyAlerts[ratioIndex] : perpSellAlerts[ratioIndex]
    var thresholdPerpAbs = Math.abs(thresholdPerp)
  
    if( Math.abs(ratioPerp) < thresholdPerpAbs ){
        perps.push([0, 0, '']) 
    }
    
    var lower = $price.close + -1 * directionPerp * (($price.close  * lowerPercent[ratioIndex]) / 100)
    var upper = $price.close + -1 * directionPerp * (($price.close  * upperPercent[ratioIndex] ) / 100);
    
    var alphaRatio = Math.abs(ratioPerp) < thresholdPerpAbs ? 0 : startOpacity + (1 - startOpacity) * ((Math.abs(ratioPerp) - thresholdPerpAbs) / (100 - thresholdPerpAbs))
    var alphaRatioRounded = Math.round(alphaRatio * 100) / 100 
    var colorRatio = 'rgba(' + perpColor.join(',') + ',' + alphaRatioRounded + ')'
    
    perps.push([lower, upper, colorRatio])
  }
  
  if( perps[0][0] !== 0 ){
    brokenarea({
        time: time, 
        lowerValue: values[0][0],
        higherValue: values[0][1],
        color:  values[0][2]
      })
  }
  if( values[1][0] !== 0  ){
    brokenarea({
        time: time, 
        lowerValue: values[1][0],
        higherValue: values[1][1],
        color:  values[1][2]
      })
  }
  if( values[2][0] !== 0 ){
    brokenarea({
        time: time, 
        lowerValue: values[2][0],
        higherValue: values[2][1],
        color:  values[2][2]
      })
  }
  if( values[3][0] !== 0 ){
    brokenarea({
        time: time, 
        lowerValue: values[3][0],
        higherValue: values[3][1],
        color:  values[3][2]
      })
  }