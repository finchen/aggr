import seriesUtils from './serieUtils'

import {
  IndicatorRealtimeAdapter,
  IndicatorTranspilationResult,
  IndicatorPlot,
  IndicatorVariable,
  IndicatorFunction,
  LoadedIndicator,
  IndicatorReference,
  IndicatorMarkets,
  IndicatorSource,
  MarketsFilters,
  IndicatorSourceFilters,
  IndicatorOption
} from './chart.d'
import store from '@/store'
import {
  findClosingBracketMatchIndex,
  parseFunctionArguments,
  randomString,
  uniqueName
} from '@/utils/helpers'
import { plotTypesMap } from './options'

export enum ALLOWED_OPTION_TYPES {
  text,
  number,
  range,
  list,
  lineType,
  lineStyle,
  color,
  checkbox,
  exchange
}

const VARIABLES_VAR_NAME = 'vars'
const FUNCTIONS_VAR_NAME = 'fns'
export const DATA_PROPS = ['vbuy', 'vsell', 'cbuy', 'csell', 'lbuy', 'lsell']
export const SERIE_TYPES = {
  candlestick: 'ohlc',
  bar: 'ohlc',
  line: 'number',
  histogram: 'number',
  area: 'number',
  cloudarea: 'range',
  brokenarea: 'range',
  baseline: 'number'
}
const REGEX_REGEX = /^\/.+\/\w?$/
const allowedOptionsTypes = Object.values(ALLOWED_OPTION_TYPES)

/**
 * build indicator
 * parse variable, functions referenced sources and indicator used in it
 * prepare dedicated state for each variables and functions
 * @param indicator indicator to build
 * @param serieIndicatorsMap serieId => { indicatorId, plotIndex } of activated indicators for dependency matching
 * @param paneId paneId that trigged the build
 * @returns {IndicatorTranspilationResult} build result
 */
export function build(
  indicator: LoadedIndicator,
  serieIndicatorsMap: { [serieId: string]: IndicatorReference }
) {
  const { id: indicatorId, libraryId } = indicator
  const result = parse(
    indicator.script,
    indicatorId,
    libraryId,
    serieIndicatorsMap
  )

  // guess the initial state of each function/variable in the code
  for (const instruction of result.functions) {
    determineFunctionState(instruction)
  }

  for (const instruction of result.variables) {
    determineVariableState(instruction)
  }

  return {
    output: result.output,
    functions: result.functions,
    variables: result.variables,
    references: result.references,
    markets: result.markets,
    sources: result.sources,
    options: result.options,
    plots: result.plots
  }
}

function normalizeCommonVariables(input, indicatorId) {
  input = input.replace(/([^.])?\b(indicatorId)\b/gi, `$1'${indicatorId}'`)
  input = input.replace(/([^.])?\b(bar)\b/gi, '$1renderer')
  input = input.replace(
    /([^.]|^)\b(vbuy|vsell|cbuy|csell|lbuy|lsell|zlevels|zratios|zbids|zasks|zupdates|zalert)\b/gi,
    '$1renderer.bar.$2'
  )
  input = input.replace(
    /([^.]|^)\b(time)\b([^:])/gi,
    '$1renderer.localTimestamp$3'
  )
  // retro compatibility
  input = input.replace(
    /renderer\.indicators\[[\w\d_\-'"` ]+\]\.series\[([\w\d_\-'"`.\][ ]+)\]/g,
    'renderer.series[series[$1].id]'
  )

  return input
}

/**
 * use default state instruction defined in seriesUtils for each functions
 * @param instruction
 * @returns void
 */
function determineFunctionState(instruction: IndicatorFunction) {
  if (
    typeof seriesUtils[instruction.name] &&
    typeof seriesUtils[instruction.name].state === 'object'
  ) {
    instruction.state = {}

    for (const prop in seriesUtils[instruction.name].state) {
      try {
        instruction.state[prop] = JSON.parse(
          JSON.stringify(seriesUtils[instruction.name].state[prop])
        )
      } catch (error) {
        instruction.state[prop] = seriesUtils[instruction.name].state[prop]
      }
    }

    return
  }

  instruction.state = {}
}

/**
 * use instruction.length to know how much values the variables need to keep track of
 * no state needed if variable history are never called in the script
 * @param instruction
 */
function determineVariableState(instruction: IndicatorVariable) {
  if (instruction.length > 1) {
    instruction.state = [0]
  } else {
    instruction.state = 0
  }
}

/**
 * parse variable, functions referenced sources and external indicators used in it
 * @param input
 * @returns
 */
function parse(
  input,
  indicatorId,
  libraryId,
  serieIndicatorsMap
): IndicatorTranspilationResult {
  const functions: IndicatorFunction[] = []
  const variables: IndicatorVariable[] = []
  const plots: IndicatorPlot[] = []
  const markets: IndicatorMarkets = {}
  const sources: IndicatorSource[] = []
  const options: { [key: string]: IndicatorOption } = {}
  const references: IndicatorReference[] = []
  const strings = []

  let output = input.replace(/\/\/.*/g, '')

  output = parseOptions(output, options)
  output = parseSources(output, sources)
  output = normalizeCommonVariables(output, indicatorId)
  output = parseStrings(output, strings)
  output = parseVariables(output, variables)
  output = parseMarkets(output, markets)

  for (let i = 0; i < strings.length; i++) {
    output = output.replace(
      new RegExp('#STRING_' + i + '#', 'g'),
      strings[i].replace(/\$/g, '$$$')
    )
  }

  // remove all spaces between comma and names
  output = parseFunctions(
    output,
    functions,
    plots,
    libraryId,
    serieIndicatorsMap
  )

  output = parseReferences(
    output,
    references,
    plots,
    indicatorId,
    serieIndicatorsMap
  )

  output = formatOutput(output)

  return {
    output,
    functions,
    variables,
    plots,
    markets,
    references,
    options,
    sources
  }
}

function parseStrings(input, strings) {
  const STRING_REGEX = /'([^']*)'|"([^"]*)"|`([^`]*)`/
  let stringMatch = null
  let iterations = 0

  do {
    if ((stringMatch = STRING_REGEX.exec(input))) {
      let refIndex = strings.indexOf(stringMatch[0])

      if (refIndex === -1) {
        refIndex = strings.push(stringMatch[0]) - 1
      }
      input =
        input.slice(0, stringMatch.index) +
        '#STRING_' +
        refIndex +
        '#' +
        input.slice(stringMatch.index + stringMatch[0].length)
    }
  } while (stringMatch && ++iterations < 1000)

  const PARANTHESIS_REGEX = /\(/g
  let paranthesisMatch
  iterations = 0

  do {
    if ((paranthesisMatch = PARANTHESIS_REGEX.exec(input))) {
      const closingParenthesisIndex = findClosingBracketMatchIndex(
        input,
        paranthesisMatch.index,
        /\(|{|\[/,
        /\)|}|\]/
      )

      if (closingParenthesisIndex !== -1) {
        const contentWithinParenthesis = input
          .slice(paranthesisMatch.index + 1, closingParenthesisIndex)
          .replace(/\n/g, ' ')

        input =
          input.slice(0, paranthesisMatch.index) +
          input.slice(paranthesisMatch.index, paranthesisMatch.index + 1) +
          contentWithinParenthesis.replace(/\n/g, '') +
          input.slice(closingParenthesisIndex, closingParenthesisIndex + 1) +
          '\n' +
          input.slice(closingParenthesisIndex + 1, input.length)

        PARANTHESIS_REGEX.lastIndex = closingParenthesisIndex
      }
    }
  } while (paranthesisMatch && ++iterations < 1000)

  return input
}

function formatOutput(input) {
  const PARANTHESIS_REGEX = /\(|{|\[/g

  let paranthesisMatch
  let iterations = 0

  do {
    if ((paranthesisMatch = PARANTHESIS_REGEX.exec(input))) {
      const lineBreakIt = paranthesisMatch[0] === '('

      const closingParenthesisIndex = findClosingBracketMatchIndex(
        input,
        paranthesisMatch.index,
        /\(|{|\[/,
        /\)|}|\]/
      )
      const contentWithinParenthesis = input
        .slice(paranthesisMatch.index + 1, closingParenthesisIndex)
        .replace(/\n/g, ' ')

      if (/if|for|else/.test(input.slice(paranthesisMatch.index - 2, 2))) {
        input =
          input.slice(0, paranthesisMatch.index) +
          input.slice(paranthesisMatch.index, paranthesisMatch.index + 1) +
          contentWithinParenthesis +
          input.slice(closingParenthesisIndex, closingParenthesisIndex + 1) +
          (lineBreakIt ? '\n' : '') +
          input.slice(closingParenthesisIndex + 1, input.length)
      }

      PARANTHESIS_REGEX.lastIndex = closingParenthesisIndex
    }
  } while (paranthesisMatch && ++iterations < 1000)

  const lines = input.trim().split(/\n/)

  return lines.join('\n').replace(/\n\n/g, '\n')
}

function parseVariables(output, variables): string {
  const VARIABLE_REGEX =
    /(?:^|\n)\s*((?:var )?[a-zA-Z0-9_]+)\(?(\d*)\)?\s*=\s*([^\n;,]*)?/
  let variableMatch = null
  let iterations = 0

  const nonPersistentVariables = []

  do {
    if ((variableMatch = VARIABLE_REGEX.exec(output))) {
      let variableName = variableMatch[1]
      const isNonPersistent = /^var/.test(variableName)

      if (
        nonPersistentVariables.indexOf(variableName) !== -1 ||
        isNonPersistent
      ) {
        if (isNonPersistent) {
          variableName = variableName.replace(/var\s*/, '')
          output = output.replace(
            variableMatch[0],
            '\nvar ' + variableName + '=' + variableMatch[3]
          )
          nonPersistentVariables.push(variableName)
        }

        // eslint-disable-next-line no-useless-escape
        output = output.replace(
          new RegExp(
            '([^.$]|^)\\b(' + variableName + ')\\b(?!:)(?!\\()(?!\\$)',
            'ig'
          ),
          `$1${variableName}$`
        )
        continue
      }

      const variableLength = +variableMatch[2] || 1

      output = output.replace(
        new RegExp('([^.]|^)\\b(' + variableName + ')\\b(?!:)', 'ig'),
        `$1${VARIABLES_VAR_NAME}[${variables.length}]`
      )

      const variable: IndicatorVariable = {
        length: variableLength
      }

      variables.push(variable)
      output = output.replace(
        new RegExp(
          `(${VARIABLES_VAR_NAME}\\[${variables.length - 1}\\])\\(${
            variable.length
          }\\)\\s*=\\s*`
        ),
        '$1='
      )
    }
  } while (variableMatch && ++iterations < 1000)

  output = determineVariablesType(output, variables)

  return output
}

function parseSerie(
  output: string,
  match: RegExpExecArray,
  plots: IndicatorPlot[],
  libraryId: string,
  serieIndicatorsMap
) {
  // absolute serie type eg. plotline -> line)
  const serieType = match[1].replace(/^plot/, '')

  // serie arguments eg. sma($price.close,options.smaLength),color=red
  const closingBracketIndex = findClosingBracketMatchIndex(
    output,
    match.index + match[1].length
  )
  const rawFunctionArguments = output.slice(
    match.index + match[1].length + 1,
    closingBracketIndex
  )

  // full function call eg. line(sma($price.close,options.smaLength),color=red)
  const rawFunctionInstruction = match[1] + '(' + rawFunctionArguments + ')'

  // plot function arguments ['sma($price.close,options.smaLength)','color=red']
  const args = parseFunctionArguments(rawFunctionArguments).filter(
    arg => arg.length
  )

  // parse and store serie options in dedicated object (eg. color=red in line arguments)
  const serieOptions = parseCustomArguments(args)

  // series id are unique within a chart, allowing indicators to communicate series data between them
  const idsInUse = Object.keys(serieIndicatorsMap).concat(
    plots.map(plot => plot.id)
  )

  let id: string

  if (typeof serieOptions.id === 'string' && serieOptions.id.length) {
    id = serieOptions.id

    delete serieOptions.id
  } else if (plots.length === 0) {
    id = libraryId
  } else {
    id = randomString(8)
  }

  id = uniqueName(id, idsInUse, false, '2')

  // prepare final input that goes in line (store it for reference)
  const pointVariable = `renderer.series['${id}']`

  let seriePoint = `${pointVariable} = `

  const expectedInput = SERIE_TYPES[serieType]
  let timeProperty = `renderer.localTimestamp`

  if (serieOptions.offset) {
    timeProperty += `+renderer.timeframe*${serieOptions.offset}`
  }

  // tranform input into valid lightweight-charts data point
  const argIsObject = /{/.test(args[0]) && /}/.test(args[0])
  const argContainSpecialChars = /^[\w_$]+\$/.test(args[0])
  if (!args.length) {
    seriePoint = ``
  } else if (
    args.length === 1 &&
    (argIsObject || (serieType !== 'line' && argContainSpecialChars))
  ) {
    seriePoint += args[0]
  } else if (expectedInput === 'ohlc') {
    if (args.length === 4) {
      seriePoint += `{ time: ${timeProperty}, open: ${args[0]}, high: ${args[1]}, low: ${args[2]}, close: ${args[3]} }`
    } else if (args.length === 1) {
      if (/^[A-Z_]+:\w+/.test(args[0])) {
        seriePoint += `${args[0]}.close === null ? { time: ${timeProperty} } : { time: ${timeProperty}, open: ${args[0]}.open, high: ${args[0]}.high, low: ${args[0]}.low, close: ${args[0]}.close }`
      } else {
        seriePoint += args[0]
      }
    } else {
      throw new Error(
        `Invalid input for function ${match[1]}, expected a ohlc object or 4 number`
      )
    }
  } else if (expectedInput === 'range') {
    if (args.length === 2) {
      seriePoint += `{ time: ${timeProperty}, lowerValue: ${args[0]}, higherValue: ${args[1]} }`
    } else {
      throw new Error(
        `Invalid input for function ${match[1]}, expected 2 arguments (lowerValue and higherValue)`
      )
    }
  } else if (expectedInput === 'number') {
    if (args.length === 1) {
      seriePoint += `{ time: ${timeProperty}, value: ${args[0]} }`
    } else {
      throw new Error(
        `Invalid input for function ${match[1]}, expected 1 value (number)`
      )
    }
  }

  output = output.replace(rawFunctionInstruction, seriePoint)

  // register plot
  plots.push({
    id,
    type: plotTypesMap[serieType] || serieType,
    expectedInput: expectedInput,
    options: serieOptions
  })

  return {
    output,
    offset: seriePoint.length ? match[0].length : 0
  }
}

function parseCustomArguments(args, startIndex = 0): { [key: string]: any } {
  const output: { [key: string]: any } = {}

  for (let i = startIndex; i < args.length; i++) {
    try {
      const [, key, value] = args[i].match(/^(\w+)\s*=([\S\s]*)/)

      if (!key || !value.length) {
        continue
      }

      let parsedValue = value.trim()

      try {
        parsedValue = JSON.parse(parsedValue)
      } catch (error) {
        // value a string
        parsedValue = parsedValue.replace(/^'(.*)'$|^"(.*)"$/, '$1$2')
      }

      output[key.trim()] = parsedValue

      args.splice(i, 1)
      i--
    } catch (error) {
      continue
    }
  }

  return output
}

function parseFunctions(
  output: string,
  instructions: IndicatorFunction[],
  plots: IndicatorPlot[],
  indicatorId: string,
  serieIndicatorsMap: { [serieId: string]: IndicatorReference }
): string {
  const FUNCTION_LOOKUP_REGEX = new RegExp(`([a-zA-Z0_9_]+)\\(`, 'g')

  let functionMatch = null
  let iterations = 0

  do {
    if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(output))) {
      const functionName = functionMatch[1]

      if (output[functionMatch.index - 1] === '.') {
        // is a method -> ignore
        FUNCTION_LOOKUP_REGEX.lastIndex =
          functionMatch.index + functionMatch[0].length
        continue
      }

      if (SERIE_TYPES[functionName.replace(/^plot/, '')]) {
        // is a serie definition -> parse serie
        const result = parseSerie(
          output,
          functionMatch,
          plots,
          indicatorId,
          serieIndicatorsMap
        )
        output = result.output
        FUNCTION_LOOKUP_REGEX.lastIndex = functionMatch.index + result.offset
        continue
      }

      const targetFunction = seriesUtils[functionName]

      if (!targetFunction) {
        FUNCTION_LOOKUP_REGEX.lastIndex =
          functionMatch.index + functionMatch[0].length
        continue
      }

      const instruction: IndicatorFunction = {
        name: functionName,
        args: []
      }

      const customArgsStartIndex = functionMatch.index
      const customArgsEndIndex = findClosingBracketMatchIndex(
        output,
        customArgsStartIndex + functionMatch[1].length
      )
      const customArgs = parseFunctionArguments(
        output.slice(
          customArgsStartIndex + functionMatch[1].length + 1,
          customArgsEndIndex
        )
      ).filter(arg => arg.length)

      if (typeof seriesUtils[functionName] === 'function') {
        output = `${output.slice(
          0,
          customArgsStartIndex
        )}utils.${functionName}(${customArgs.join(',')})${output.slice(
          customArgsEndIndex + 1,
          output.length
        )}`
        continue
      }

      let injectedArgCount = 0
      let totalArgsCount =
        (targetFunction.args ? targetFunction.args.length : 0) +
        customArgs.length

      for (let i = 0; i < totalArgsCount; i++) {
        const argDefinition = targetFunction.args
          ? targetFunction.args[i]
          : null

        const arg = {
          ...(argDefinition || {})
        }

        if (argDefinition) {
          if (argDefinition.injected) {
            injectedArgCount++

            instruction.args.push(arg)

            continue
          } else if (targetFunction.args[i]) {
            totalArgsCount--
          }
        }

        const customArg = customArgs[i - injectedArgCount]

        if (typeof customArg !== 'undefined') {
          arg.instruction = customArg
        }

        instruction.args.push(arg)
      }

      const caller = `utils.${functionName}.update`
      const replacement = `${caller}(${FUNCTIONS_VAR_NAME}[${
        instructions.length
      }].state,${instruction.args.map(a => a.instruction).join(',')})`

      output = `${output.slice(
        0,
        customArgsStartIndex
      )}${replacement}${output.slice(customArgsEndIndex + 1, output.length)}`

      instructions.push(instruction)

      FUNCTION_LOOKUP_REGEX.lastIndex = functionMatch.index + caller.length
    }
  } while (functionMatch && ++iterations < 1000)

  return output
}

function parseOptions(output, options: { [key: string]: IndicatorOption }) {
  const OPTION_FUNCTION_REGEX = new RegExp(
    `[\\s\\n]*(\\w[\\d\\w]+)[\\s\\n]*=[\\s\\n]*option\\(`,
    'g'
  )
  let functionMatch = null
  let iterations = 0

  do {
    if ((functionMatch = OPTION_FUNCTION_REGEX.exec(output))) {
      const customArgsStartIndex = functionMatch.index
      const customArgsEndIndex = findClosingBracketMatchIndex(
        output,
        customArgsStartIndex + functionMatch[0].length - 1
      )

      const optionOptions = parseCustomArguments(
        parseFunctionArguments(
          output.slice(
            customArgsStartIndex + functionMatch[0].length,
            customArgsEndIndex
          )
        ).filter(arg => arg.length)
      )

      output = output.replace(
        output.slice(customArgsStartIndex, customArgsEndIndex + 1),
        ''
      )

      if (!optionOptions.type) {
        optionOptions.type = 'number'
      } else if (optionOptions.type === 'exchange') {
        optionOptions.rebuild = true
      }

      if (!optionOptions.default) {
        optionOptions.default =
          optionOptions.type === 'text'
            ? ''
            : Math.max(optionOptions.min || 0, 0)
      }

      if (!allowedOptionsTypes.includes(optionOptions.type)) {
        throw new Error(`Unknown option type ${optionOptions.type}`)
      }

      options[functionMatch[1]] = optionOptions

      OPTION_FUNCTION_REGEX.lastIndex -= functionMatch[0].length
    }
  } while (functionMatch && ++iterations < 1000)

  for (const key in options) {
    output = output.replace(
      new RegExp('([^.]|^)\\b(' + key + ')\\b(?!:|=)', 'ig'),
      `$1options.${key}`
    )
  }

  return output
}

function parseSources(output, sources) {
  const SOURCE_FUNCTION_REGEX = new RegExp(`source\\(`, 'g')
  let functionMatch = null
  let iterations = 0

  do {
    if ((functionMatch = SOURCE_FUNCTION_REGEX.exec(output))) {
      const customArgsStartIndex = functionMatch.index
      const customArgsEndIndex = findClosingBracketMatchIndex(
        output,
        customArgsStartIndex + functionMatch[0].length - 1
      )
      const options = parseFunctionArguments(
        output.slice(
          customArgsStartIndex + functionMatch[0].length,
          customArgsEndIndex
        )
      ).filter(arg => arg.length)

      let prop

      if (options[0].indexOf('=') === -1) {
        prop = options.shift().replace(/\W/g, '')
      }

      const filters = parseCustomArguments(options)

      output = output.replace(
        output.slice(customArgsStartIndex, customArgsEndIndex + 1),
        `#SOURCE${sources.length}#`
      )
      sources.push({
        prop,
        filters
      })
    }
  } while (functionMatch && ++iterations < 1000)

  return output
}

function parseMarkets(output: string, markets: IndicatorMarkets): string {
  const EXCHANGE_REGEX =
    /\b([A-Z_]{3,}:[a-zA-Z0-9/_-]{5,})(:[\w]{4,})?\.?([a-z]{3,})?\b/g

  let marketMatch = null
  let iterations = 0

  do {
    if ((marketMatch = EXCHANGE_REGEX.exec(output))) {
      const marketName = marketMatch[1] + (marketMatch[2] ? marketMatch[2] : '')
      const marketDataKey = marketMatch[3]

      if (!markets[marketName]) {
        markets[marketName] = []
      }

      if (marketDataKey) {
        if (markets[marketName].indexOf(marketDataKey) === -1) {
          markets[marketName].push(marketDataKey)
        }
      }

      const replacement = `renderer.sources['${marketName}']${
        marketDataKey ? '.' + marketDataKey : ''
      }`

      EXCHANGE_REGEX.lastIndex = marketMatch.index + replacement.length

      output =
        output.slice(0, marketMatch.index) +
        replacement +
        output.slice(marketMatch.index + marketMatch[0].length)
    }
  } while (marketMatch && ++iterations < 1000)

  return output
}
function parseReferences(
  output: string,
  references: IndicatorReference[],
  plots: IndicatorPlot[],
  buildingIndicatorId: string,
  serieIndicatorsMap: { [serieId: string]: IndicatorReference }
): string {
  const REFERENCE_REGEX = new RegExp('\\$(\\w+[a-z_\\-0-9]+)\\b')

  let referenceMatch = null
  let iterations = 0

  do {
    if ((referenceMatch = REFERENCE_REGEX.exec(output))) {
      const serieId = referenceMatch[1]

      try {
        const [indicatorId, plotIndex] = getSeriePath(
          serieId,
          plots,
          buildingIndicatorId,
          serieIndicatorsMap
        )

        if (
          !references.find(
            reference =>
              reference.indicatorId === indicatorId &&
              reference.plotIndex === plotIndex
          )
        ) {
          references.push({
            indicatorId,
            serieId,
            plotIndex,
            plotType: 'unknown'
          })
        }

        output = output.replace(
          new RegExp('\\$(' + serieId + ')\\b', 'ig'),
          `renderer.series['${serieId}']`
        )
      } catch (error) {
        throw {
          message: `The serie "${serieId}" was not found in the current indicators`,
          status: 'indicator-required',
          serieId: serieId
        }
      }
    }
  } while (referenceMatch && ++iterations < 1000)

  return output
}

function getSeriePath(
  serieId: string,
  plots: IndicatorPlot[],
  buildingIndicatorId: string,
  serieIndicatorsMap: { [serieId: string]: IndicatorReference }
): [string, number] {
  let indicatorId: string
  let plotIndex: number

  // see if we can find the serie in the plots that are already processed
  const reference = plots.find(
    plot =>
      plot.id === serieId ||
      plot.id.replace(/\W/g, '') === serieId.replace(/\W/g, '')
  )

  if (reference) {
    indicatorId = buildingIndicatorId
    plotIndex = plots.indexOf(reference)
  }

  // or in the others indicator that are already in
  if (!indicatorId && serieIndicatorsMap[serieId]) {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({ indicatorId, plotIndex } = serieIndicatorsMap[serieId])
  }

  // or match with indicatorId, taking first serie as result
  if (
    !indicatorId &&
    Object.values(serieIndicatorsMap)
      .map(a => a.indicatorId)
      .indexOf(serieId) !== -1
  ) {
    indicatorId = serieId
    plotIndex = 0
  }

  if (indicatorId) {
    return [indicatorId, plotIndex]
  }
}

function determineVariablesType(output, variables: IndicatorVariable[]) {
  for (const variable of variables) {
    const index = variables.indexOf(variable)
    const VARIABLE_LENGTH_REGEX = new RegExp(
      `${VARIABLES_VAR_NAME}\\[${index}\\](?:\\[(\\d+)\\])?`,
      'g'
    )

    let lengthMatch = null
    let iterations = 0

    do {
      if ((lengthMatch = VARIABLE_LENGTH_REGEX.exec(output))) {
        const variableLength = lengthMatch[1]
        const position = lengthMatch.index + lengthMatch[0].length

        if (typeof variableLength === 'undefined') {
          const hasSpecifiedIndex = output[position] === '['
          output =
            output.substring(0, position) +
            '.state' +
            (!hasSpecifiedIndex ? '[0]' : '') +
            output.substring(position)
        } else {
          const beforeVariable = output.substring(0, lengthMatch.index)
          const variableReplacement = `${VARIABLES_VAR_NAME}[${index}].state[Math.min(${VARIABLES_VAR_NAME}[${index}].state.length-1,${variableLength})]`
          const afterVariable = output.substring(
            lengthMatch.index + lengthMatch[0].length
          )
          output = `${beforeVariable}${variableReplacement}${afterVariable}`

          VARIABLE_LENGTH_REGEX.lastIndex =
            beforeVariable.length + variableReplacement.length
        }

        variable.length = Math.max(variable.length, (+variableLength || 0) + 1)
      }
    } while (lengthMatch && ++iterations < 1000)

    if (!variable.length) {
      throw new Error('Unexpected no length on var')
    }

    if (variable.length === 1) {
      output = output.replace(
        new RegExp(
          `${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`,
          'g'
        ),
        `${VARIABLES_VAR_NAME}[${index}].state`
      )
    }

    output = output.replace(
      new RegExp(`#${VARIABLES_VAR_NAME}\\[${index}\\]\\.state\\[\\d+\\]`, 'g'),
      `${VARIABLES_VAR_NAME}[${index}].state`
    )
  }

  return output
}

function getSourcedOutput(
  model: IndicatorTranspilationResult,
  marketFilters: MarketsFilters,
  options: any
) {
  const products = store.state.panes.marketsListeners
  let output = model.output

  const shouldAvgProps = ['open', 'high', 'low', 'close']

  for (let i = 0; i < model.sources.length; i++) {
    const markets = []

    const sourceId = `#SOURCE${i}#`

    const prop = model.sources[i].prop
    const filters = Object.keys(model.sources[i].filters).reduce((acc, key) => {
      const value = model.sources[i].filters[key]

      const [optionVar, optionKey] = value.split('.')

      if (optionVar === 'options' && optionKey) {
        acc[key] = options[optionKey]
      } else {
        acc[key] = value
      }

      if (REGEX_REGEX.test(acc[key])) {
        acc[key] = new RegExp(acc[key].slice(1, -1))
      }

      return acc
    }, {} as IndicatorSourceFilters)

    for (const marketId in marketFilters) {
      if (marketFilters[marketId] === false) {
        continue
      }
      if (filters.type && products[marketId].type !== filters.type) {
        continue
      }
      if (
        filters.exchange &&
        products[marketId].exchange !== filters.exchange
      ) {
        continue
      }
      if (filters.quote && products[marketId].quote !== filters.quote) {
        continue
      }
      if (
        filters.name &&
        ((filters.name instanceof RegExp &&
          !filters.name.test(products[marketId].local)) ||
          (typeof filters.name === 'string' &&
            products[marketId].local !== filters.name))
      ) {
        continue
      }

      markets.push(marketId)
    }

    if (!markets.length) {
      output = output.replace(
        sourceId,
        prop
          ? '0'
          : `{
          timestamp: renderer.timestamp,
          localTimestamp: renderer.localTimestamp,
          sources: {}
        }`
      )
      continue
    }

    if (prop) {
      if (shouldAvgProps.indexOf(prop) !== -1) {
        output = output.replace(
          sourceId,
          `(() => {
              let count = 0;
              let sum = 0;
              ${markets
                .map(
                  market => `if (renderer.sources['${market}'].${prop}) {
                count++;
                sum += renderer.sources['${market}'].${prop}
              }`
                )
                .join(';')}
              return sum / count
            })()`
        )
      } else {
        output = output.replace(
          sourceId,
          `(${markets
            .map(market => `renderer.sources['${market}'].${prop}`)
            .join('+')})`
        )
      }
    } else {
      output = output.replace(
        sourceId,
        `{
            timestamp: renderer.timestamp,
            localTimestamp: renderer.localTimestamp,
            sources: {
              ${markets
                .map(market => `'${market}': renderer.sources['${market}']`)
                .join(',')}
            },
          }`
      )
    }
  }

  return output
}

export function getBuildedIndicator(
  model: IndicatorTranspilationResult,
  marketFilters: MarketsFilters,
  options: any
) {
  let sourcedOutput = model.output

  if (model.sources.length) {
    sourcedOutput = getSourcedOutput(model, marketFilters, options)
  }

  return new Function(
    'renderer',
    FUNCTIONS_VAR_NAME,
    VARIABLES_VAR_NAME,
    'series',
    'options',
    'utils',
    '"use strict"; ' + sourcedOutput
  ) as IndicatorRealtimeAdapter
}

/**
 * get fresh state of indicator for the renderer
 * @param indicator
 */
export function getRendererIndicatorData(indicator: LoadedIndicator) {
  const { functions, variables, plots } = JSON.parse(
    JSON.stringify(indicator.model)
  ) as IndicatorTranspilationResult

  indicator.options.minLength = 0

  // update functions arguments from script input
  for (const instruction of functions) {
    instruction.length = 0

    for (let i = 0; i < instruction.args.length; i++) {
      if (
        typeof instruction.args[i].instruction === 'undefined' ||
        instruction.args[i].instruction === ''
      ) {
        continue
      }

      try {
        instruction.args[i].instruction = new Function(
          'options',
          `'use strict'; return ${instruction.args[i].instruction}`
        )(indicator.options)

        if (
          instruction.args[i].length &&
          !isNaN(instruction.args[i].instruction)
        ) {
          instruction.length += instruction.args[i].instruction
        }
      } catch (error) {
        // nothing to see here
      }
    }

    indicator.options.minLength = Math.max(
      indicator.options.minLength,
      instruction.length * 2
    )
  }

  const plotsOptions = []

  // update plot options from script input
  for (const plot of plots) {
    plotsOptions.push(getCustomPlotOptions(indicator, plot))
  }

  return {
    canRender: indicator.options.minLength <= 1,
    functions,
    variables,
    plotsOptions,
    minLength: indicator.options.minLength
  }
}

export function getCustomPlotOptions(indicator, plot, key = null) {
  const options = {}

  for (const prop in plot.options) {
    if (key && key !== prop) {
      continue
    }

    try {
      options[prop] = new Function(
        'options',
        `'use strict'; return ${plot.options[prop]}`
      )(indicator.options)
    } catch (error) {
      options[prop] = plot.options[prop]
    }
  }

  if (key) {
    return options[key]
  }

  return options
}
