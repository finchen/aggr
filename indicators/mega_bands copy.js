if (!pendingMarkers) {
    // runs only once
    pendingMarkers = []
    spotColor = options.spotColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    perpColor = options.perpColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    binanceColor = options.binanceColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    coinbaseColor = options.coinbaseColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    allOnColor = options.allOnColor.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)

    spotOpacity = spotColor.pop()
    perpOpacity = perpColor.pop()
    binanceOpacity = binanceColor.pop()
    coinbaseOpacity = coinbaseColor.pop()
    allOnColorOpacity = allOnColor.pop()

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

  }
  // </STARTUP SCRIPT> 
  
   ORDERBOOK:AGGRPERP-BTCUSDLEVELS.zratios
   
  var perps = []
  var spots = []
  var binance = []
  var coinbase = []

  var ratio = 0

  for(let ratioIndex = 0; ratioIndex < 4; ratioIndex++){
  
    var ratioPerp = 0// ORDERBOOK:AGGRPERP-BTCUSDLEVELS.zratios[ratioIndex]
    var ratioSpot = 0 //ORDERBOOK:AGGRSPOT-BTCUSDLEVELS.zratios[ratioIndex]
    var ratioBinance = 0 //ORDERBOOK:BINANCE-BTCUSDLEVELS.zratios[ratioIndex]
    var ratioCoinbase = 0 //ORDERBOOK:COINBASE-BTCUSDLEVELS.zratios[ratioIndex]

    var directionPerp = Math.sign(ratioPerp)
    var thresholdPerp = directionPerp > 0 ? perpBuyAlerts[ratioIndex] : perpSellAlerts[ratioIndex]
    var thresholdPerpAbs = Math.abs(thresholdPerp)
  
    if( Math.abs(ratioPerp) < thresholdPerpAbs ){
        perps.push([0, 0, '']) 
    }else{
    
        var lower = $price.close + -1 * directionPerp * (($price.close  * lowerPercent[ratioIndex]) / 100)
        var upper = $price.close + -1 * directionPerp * (($price.close  * upperPercent[ratioIndex] ) / 100);
        
        var alphaRatio = Math.abs(ratioPerp) < thresholdPerpAbs ? 0 : startOpacity + (1 - startOpacity) * ((Math.abs(ratioPerp) - thresholdPerpAbs) / (100 - thresholdPerpAbs))
        var alphaRatioRounded = Math.round(alphaRatio * 100) / 100 
       // var colorRatio = 'rgba(' + perpColor.join(',') + ',' + alphaRatioRounded + ')'
        
        perps.push([lower, upper, 'red'])
    }
    
  }
  
  /*if( perps[0][0] !== 0 ){
    brokenarea({
        time: time, 
        lowerValue: perps[0][0],
        higherValue: perps[0][1],
        color:  perps[0][2]
      })
  }
  if( perps[1][0] !== 0  ){
    brokenarea({
        time: time, 
        lowerValue: perps[1][0],
        higherValue: perps[1][1],
        color:  perps[1][2]
      })
  }
  if( perps[2][0] !== 0 ){
    brokenarea({
        time: time, 
        lowerValue: perps[2][0],
        higherValue: perps[2][1],
        color:  perps[2][2]
      })
  }
  if( perps[3][0] !== 0 ){
    brokenarea({
        time: time, 
        lowerValue: perps[3][0],
        higherValue: perps[3][1],
        color:  perps[3][2]
      })
  }*/