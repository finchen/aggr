if (!pendingMarkers) {
    // runs only once
    pendingMarkers = [] 

    togglePerp = options.togglePerp || false
    
    moveTo = options.togglePerp ? 10 : -10
    bandSize = options.bandSize || 15

    maxVolume = options.maxVolume || (togglePerp ? 4000 : 1500)
    minVolume = options.minVolume || (togglePerp ? 500 : 200)

    level0 = options.level0 || (togglePerp ? 2000 : 800)
    level1 = options.level1 || (togglePerp ? 1000 : 400)

    startOpacity = options.startOpacity || 0.1

    colorLevel0 = options.colorLevel0.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    colorLevel1 = options.colorLevel1.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)
    colorLevel = options.colorLevel.match(/\(([\d.]+),([\d.]+),([\d.]+),?([\d.]+)?\)$/).slice(1,5).map(a => +a)

    colorOpacity0 = colorLevel0.pop()
    colorOpacity1 = colorLevel1.pop()
    colorOpacity2 = colorLevel.pop()

}

var levels = togglePerp ? ORDERBOOK:AGGRPERP-BTCUSDLEVELS.zlevels : ORDERBOOK:AGGRSPOT-BTCUSDLEVELS.zlevels

if( !levels || levels.bids.length < 5 || levels.asks.length < 5  ){
    return
}

var alpha1 = startOpacity + (1 - startOpacity) * ((levels.bids[0][1] - minVolume) / (maxVolume - minVolume))
var alpha1Rounded = Math.round(alpha1 * 100) / 100 
var color1base = levels.bids[0][1] > level0 ? colorLevel0 : levels.bids[0][1] > level1 ? colorLevel1 : colorLevel
var color1 = 'rgba(' + color1base.join(',') + ',' + alpha1Rounded + ')'

var alpha2 = startOpacity + (1 - startOpacity) * ((levels.bids[1][1] - minVolume) / (maxVolume - minVolume))
var alpha2Rounded = Math.round(alpha1 * 100) / 100 
var color2base = levels.bids[1][1] > level0 ? colorLevel0 : levels.bids[1][1] > level1 ? colorLevel1 : colorLevel
var color2 = 'rgba(' + color2base.join(',') + ',' + alpha2Rounded + ')'

var alpha3 = startOpacity + (1 - startOpacity) * ((levels.bids[2][1] - minVolume) / (maxVolume - minVolume))
var alpha3Rounded = Math.round(alpha1 * 100) / 100 
var color3base = levels.bids[2][1] > level0 ? colorLevel0 : levels.bids[2][1] > level1 ? colorLevel1 : colorLevel
var color3 = 'rgba(' + color3base.join(',') + ',' + alpha3Rounded + ')'

var alpha4 = startOpacity + (1 - startOpacity) * ((levels.bids[3][1] - minVolume) / (maxVolume - minVolume))
var alpha4Rounded = Math.round(alpha1 * 100) / 100 
var color4base = levels.bids[3][1] > level0 ? colorLevel0 : levels.bids[3][1] > level1 ? colorLevel1 : colorLevel
var color4 = 'rgba(' + color4base.join(',') + ',' + alpha4Rounded + ')'

var alpha5 = startOpacity + (1 - startOpacity) * ((levels.bids[4][1] - minVolume) / (maxVolume - minVolume))
var alpha5Rounded = Math.round(alpha1 * 100) / 100 
var color5base = levels.bids[4][1] > level0 ? colorLevel0 : levels.bids[4][1] > level1 ? colorLevel1 : colorLevel
var color5 = 'rgba(' + color5base.join(',') + ',' + alpha5Rounded + ')'

plotbrokenarea({ time: time, id: levels.bids[0][0], lowerValue: levels.bids[0][0] + moveTo, higherValue: levels.bids[0][0] + bandSize + moveTo, color: color1 } )
plotbrokenarea({ time: time, id: levels.bids[1][0], lowerValue: levels.bids[1][0] + moveTo, higherValue: levels.bids[1][0] + bandSize + moveTo, color: color2 } )
plotbrokenarea({ time: time, lowerValue: levels.bids[2][0] + moveTo, higherValue: levels.bids[2][0] + bandSize + moveTo, color: color3 } )
plotbrokenarea({ time: time, lowerValue: levels.bids[3][0] + moveTo, higherValue: levels.bids[3][0] + bandSize + moveTo, color: color4 } )
plotbrokenarea({ time: time, lowerValue: levels.bids[4][0] + moveTo, higherValue: levels.bids[4][0] + bandSize + moveTo, color: color5 } )


var alphaAsks1 = startOpacity + (1 - startOpacity) * ((levels.asks[0][1] - minVolume) / (maxVolume - minVolume))
var alphaAsks1Rounded = Math.round(alphaAsks1 * 100) / 100 
var colorAsks1base = levels.asks[0][1] > level0 ? colorLevel0 : levels.asks[0][1] > level1 ? colorLevel1 : colorLevel
var colorAsks1 = 'rgba(' + colorAsks1base.join(',') + ',' + alphaAsks1Rounded + ')'

var alphaAsks2 = startOpacity + (1 - startOpacity) * ((levels.asks[1][1] - minVolume) / (maxVolume - minVolume))
var alphaAsks2Rounded = Math.round(alphaAsks1 * 100) / 100 
var colorAsks2base = levels.asks[1][1] > level0 ? colorLevel0 : levels.asks[1][1] > level1 ? colorLevel1 : colorLevel
var colorAsks2 = 'rgba(' + colorAsks2base.join(',') + ',' + alphaAsks2Rounded + ')'

var alphaAsks3 = startOpacity + (1 - startOpacity) * ((levels.asks[2][1] - minVolume) / (maxVolume - minVolume))
var alphaAsks3Rounded = Math.round(alphaAsks1 * 100) / 100 
var colorAsks3base = levels.asks[2][1] > level0 ? colorLevel0 : levels.asks[2][1] > level1 ? colorLevel1 : colorLevel
var colorAsks3 = 'rgba(' + colorAsks3base.join(',') + ',' + alphaAsks3Rounded + ')'

var alphaAsks4 = startOpacity + (1 - startOpacity) * ((levels.asks[3][1] - minVolume) / (maxVolume - minVolume))
var alphaAsks4Rounded = Math.round(alphaAsks1 * 100) / 100 
var colorAsks4base = levels.asks[3][1] > level0 ? colorLevel0 : levels.asks[3][1] > level1 ? colorLevel1 : colorLevel
var colorAsks4 = 'rgba(' + colorAsks4base.join(',') + ',' + alphaAsks4Rounded + ')'

var alphaAsks5 = startOpacity + (1 - startOpacity) * ((levels.asks[4][1] - minVolume) / (maxVolume - minVolume))
var alphaAsks5Rounded = Math.round(alphaAsks1 * 100) / 100 
var colorAsks5base = levels.asks[4][1] > level0 ? colorLevel0 : levels.asks[4][1] > level1 ? colorLevel1 : colorLevel
var colorAsks5 = 'rgba(' + colorAsks5base.join(',') + ',' + alphaAsks5Rounded + ')'

plotbrokenarea({ time: time, lowerValue: levels.asks[0][0] + moveTo, higherValue: levels.asks[0][0] + bandSize + moveTo, color: colorAsks1 } )
plotbrokenarea({ time: time, lowerValue: levels.asks[1][0] + moveTo, higherValue: levels.asks[1][0] + bandSize + moveTo, color: colorAsks2 } )
plotbrokenarea({ time: time, lowerValue: levels.asks[2][0] + moveTo, higherValue: levels.asks[2][0] + bandSize + moveTo, color: colorAsks3 } )
plotbrokenarea({ time: time, lowerValue: levels.asks[3][0] + moveTo, higherValue: levels.asks[3][0] + bandSize + moveTo, color: colorAsks4 } )
plotbrokenarea({ time: time, lowerValue: levels.asks[4][0] + moveTo, higherValue: levels.asks[4][0] + bandSize + moveTo, color: colorAsks5 } )