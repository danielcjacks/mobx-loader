import { runInAction, toJS } from 'mobx'
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

export type LoaderState = Map<Function, LoaderStateArgs>

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
            setLoader(loaderState, wrappedFunction, args, true)

            return result
                .then((val: R) => {
                    setLoader(loaderState, wrappedFunction, args, false)
                    return val
                })
                .catch((error: any) => {
                    setLoader(loaderState, wrappedFunction, args, false)
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
 * Sets the loader state to indicate that a given function, called with a specific set of arguments,
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
    fn: (...args: A) => any,
    functionArgs: A,
    isLoading: boolean
) => {
    const a = toJS(loaderState)
    // pad array in case the function was called with fewer arguments than the definition. Padding ensures that
    // fn(1, undefined) and fn(1) are treated as the same arguments.
    // This will only happen in non-typed environments like raw js, so we just force undefined to fit with the
    // args type even though the type isn't techincally correct
    const paddedArgs = rightPadArray(functionArgs, fn.length, undefined)
    
    const path = [fn, ...paddedArgs]

    // we keep track of the number of instances of the function running with these args. The function is only considered
    // not loading when all these instances are finished (counter is back to 0). This prevents incorrectly saying the
    // loader is finished when a second call of the function finishes while the first call is still running.
    const runningCount = deepGet(loaderState, path) ?? 0

    const newRunningCount = isLoading ? runningCount + 1 : runningCount - 1

    runInAction(() => {
        deepSet(loaderState, path, newRunningCount)
    })
}

/**
 * Returns true if the function with given arguments is loading and false otherwise. Use {@link loaderWildcard} to
 * find a match for any argument in that position. 
 * 
 * @example <caption>if ```fn('a', 'b')``` is currently loading, then </caption>
 * ```
 * getLoader(loaderState, fn, ['a', 'b']) // true
 * getLoader(loaderState, fn, ['x', 'b']) // false
 * getLoader(loaderState, fn, [loaderWildcard, 'b']) //true
 * ```
 */
export const getLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: (...args: A) => any,
    functionArgs: A | undefined = undefined
) => {

    let currentlyRunningCounts: number[]

    if (functionArgs === undefined) {
        currentlyRunningCounts = deepGetAllNumbers([loaderState.get(fn) ?? new Map()])
    } else {
        const paddedArgs = rightPadArray(functionArgs, fn.length, undefined)
        const path = [fn, ...paddedArgs]
        currentlyRunningCounts = deepGetWithWilcard(
            loaderState,
            path,
            loaderWildcard
        )
    }

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
