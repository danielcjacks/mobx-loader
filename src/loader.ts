import {
    deepGet,
    deepGetAllNumbers,
    deepGetWithWilcard,
    deepSet,
    hasProp,
    rightPadArray,
} from './helpers'

/**
 has a fixed number of args, so will never have a case like
 state = {
     add: {
         // called with no args
         1: {
             // and called with arg 1
         }
     }
 }
state = {
    add: {
        1: {
            2: 1,
            3: 2
        },
        2: {
            3: 4
        }
    }
}

 */

export type LoaderState = {
    [functionName: string]: LoaderStateArgs
}

// the number value is the currently running functions with these args
export type LoaderStateArgs =
    | number
    | Map<any | typeof loaderWildcard, number & LoaderStateArgs>

// we use a symbol to represent a function argument wildcard. This ensures that a real function argument will never
// be accidentally interpreted as a wilcard (this might happen if we used something like undefined or '*')
export const loaderWildcard = Symbol('loaderWildcard')

export const wrapLoader = <A extends any[], R>(
    loaderState: LoaderState,
    fn: (...args: A) => R
) => {
    const wrappedFunction: typeof fn = (...args: A) => {
        const result = fn(...args)
        if (hasProp(result, 'then') && typeof result.then === 'function') {
            // pad array in case the function was called with fewer arguments than the definition. Padding ensures that
            // fn(1, undefined) and fn(1) are treated as the same arguments
            const paddedArgs = rightPadArray(args, fn.length, undefined)

            setLoader(loaderState, fn.name, paddedArgs, true)

            loaderState[fn.name]
            return result
                .then((val: R) => {
                    setLoader(loaderState, fn.name, paddedArgs, false)
                    return val
                })
                .catch((error: any) => {
                    setLoader(loaderState, fn.name, paddedArgs, false)
                    return error
                })
        } else {
            return result
        }
    }

    // set the wrapped function to have the same name as the original one. This keeps the functions the same (e.g.
    // for debugging) and also lets us figure out which function this is wrapping
    Object.defineProperty(wrappedFunction, 'name', { value: fn.name })

    return wrappedFunction
}

/**
 * Sets the laoder state to indicate that a given function, called with a specific set of arguments,
 * is running / finished. This function should be called every time a tracked function is started or finishes.
 * @param loaderState An object where loading information is persisted
 * @param fn The function to be tracked
 * @param functionArgs The arguments that the tracked function was called with. The length of this should be the same
 *                     as the number of arguments that fn was defined with - if fn was called with fewer arguments than
 *                     there are in the definition, then pad the end of functionArgs with undefined to get the
 *                     right length
 * @param isLoading True when the function starts and false when it ends
 */
export const setLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: string | ((...args: A) => any),
    functionArgs: A,
    isLoading: boolean
) => {
    const functionName = typeof fn === 'string' ? fn : fn.name

    if (!loaderState[functionName]) {
        loaderState[functionName] = functionArgs.length === 0 ? 0 : new Map()
    }

    // we keep track of the number of instances of the function running with these args. The function is only considered
    // not loading when all these instances are finished (counter is back to 0). This prevents incorrectly saying the
    // loader is finished when a second call of the function finishes while the first call is still running.
    const runningCount = deepGet(loaderState[functionName], functionArgs) ?? 0

    const newRunningCount = isLoading ? runningCount + 1 : runningCount - 1

    if (functionArgs.length === 0) {
        // we have to do it like this since we cant change the top level value by passing it into a function
        // since js doesnt have primitive pointers
        loaderState[functionName] = newRunningCount
    } else {
        deepSet(loaderState[functionName], functionArgs, newRunningCount)
    }
}

export const getLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: string | ((...args: A) => any),
    functionArgs: A | undefined = undefined
) => {
    const functionName = typeof fn === 'string' ? fn : fn.name

    const currentlyRunningCounts =
        functionArgs === undefined
            ? deepGetAllNumbers([loaderState[functionName]])
            : deepGetWithWilcard(
                  loaderState[functionName],
                  functionArgs,
                  loaderWildcard
              )

    const currentlyRunningCount = currentlyRunningCounts.reduce(
        (countSum, countVal) => countSum + countVal,
        0
    )

    return currentlyRunningCount > 0
}

export const makeAutoLoader = (
    obj: object,
    loaderState: object,
    overrides: { [propName: string]: boolean } = {}
) => {
    Object.keys(obj).forEach((prop) => {
        // @ts-ignore
        const val = obj[prop]

        if (val instanceof Function && overrides[prop] !== false) {
            // @ts-ignore
            obj[prop] = wrapLoader(loaderState, val)
        }
    })
}
