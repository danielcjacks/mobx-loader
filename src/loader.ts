import {
    deepGet,
    deepGetWithWilcard,
    deepSet,
    hasOwnProperty,
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
    | Map<string, number>
    | Map<typeof loaderWildcard, number>

// we use a symbol to represent a function argument wildcard. This ensures that a real function argument will never
// be accidentally interpreted as a wilcard (this might happen if we used something like undefined or '*')
export const loaderWildcard = Symbol('loaderWildcard')

export const wrapLoader = <A extends any[], R>(
    loaderState: LoaderState,
    fn: (...args: A) => R | Promise<R>
) => {
    const wrappedFunction: typeof fn = (...args: A) => {
        const result = fn(...args)
        if (
            hasOwnProperty(result, 'then') &&
            typeof result.then === 'function'
        ) {
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
                .catch((error) => {
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
}

const setLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: string | ((...args: A) => any),
    functionArgs: A,
    isLoading: boolean
) => {
    const functionName = typeof fn === 'string' ? fn : fn.name
    const path = [functionName, ...functionArgs]

    // we keep track of the number of instances of the function running with these args. The function is only considered
    // not loading when all these instances are finished (counter is back to 0). This prevents incorrectly saying the
    // loader is finished when a second call of the function finishes while the first call is still running.
    const runningCount = deepGet(loaderState, path) ?? 0

    const newRunningCount = isLoading ? runningCount + 1 : runningCount - 1

    if (newRunningCount < 0) throw new Error('something is really wrong')

    deepSet(loaderState, path, newRunningCount)
}

const getLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: string | ((...args: A) => any),
    functionArgs: A
) => {
    const functionName = typeof fn === 'string' ? fn : fn.name
    const path = [functionName, ...functionArgs]

    const currentlyRunningCounts = deepGetWithWilcard(
        loaderState,
        path,
        loaderWildcard
    ).filter((el) => el !== undefined)

    const currentlyRunningCount = currentlyRunningCounts.reduce(
        (countSum, countVal) => countSum + countVal,
        0
    )

    return currentlyRunningCount > 0
}
