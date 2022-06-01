import { runInAction } from 'mobx'
import {
    deepGet,
    deepGetAllNumbers,
    deepGetWithWilcard,
    deepSet,
    deep_for_each,
    hasProp,
    rightPadArray
} from './helpers'

export type LoaderState = Map<Function, LoaderStateArgs>

// the number value is the currently running functions with these args
type LoaderStateArgs =
    | number
    | Map<any | typeof loaderWildcard, number & LoaderStateArgs>

// we use a symbol to represent a function argument wildcard. This ensures that a real function argument will never
// be accidentally interpreted as a wilcard (this might happen if we used something like undefined or '*')
/**
 * Using a this as an argument in the arguments list of {@link getLoader} will match any argument in that position
 */
export const loaderWildcard = Symbol('loaderWildcard')

/**
 * Wraps a function so that it automatically sets the loading state to be true while the function is running.
 * Any kind of function can be wrapped, but wrapLoader will only actually set loading state for asynchronous functions.
 * @param loaderState An object where loading information is persisted
 * @param fn Can be any function
 * @returns A wrapped version of fn
 */
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
                    // we make sure to propagate any errors that happen
                    return Promise.reject(error)
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
 *                     as the number of arguments that fn was defined with
 * @param isLoading True when the function starts and false when it ends
 */
export const setLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: (...args: A) => any,
    functionArgs: A,
    isLoading: boolean
) => {
    // pad array in case the function was called with fewer arguments than the definition. Padding ensures that
    // fn(1, undefined) and fn(1) are treated as the same arguments.
    // This will only happen in non-typed environments like raw js, so we just force undefined to fit with the
    // args type even though the type isn't techincally correct
    const paddedArgs = rightPadArray(functionArgs, fn.length, undefined)

    const path = [fn, ...paddedArgs]

    
    // we need a runInAction so mobx updates reactions when we set the loader. We also put the read in here to prevent
    // mobx from tracking the read and potentially generating an infinite loop
    runInAction(() => {
        // we keep track of the number of instances of the function running with these args. The function is only considered
        // not loading when all these instances are finished (counter is back to 0). This prevents incorrectly saying the
        // loader is finished when a second call of the function finishes while the first call is still running.
        const runningCount = deepGet(loaderState, path) ?? 0
    
        const newRunningCount = isLoading ? runningCount + 1 : runningCount - 1

        deepSet(loaderState, path, newRunningCount)
    })
}

// we can't inline this due to a typescript bug.
// https://stackoverflow.com/questions/64138789/why-are-typescript-mapped-tuple-types-behaving-differently-when-supplying-generi
type AddWildcardTypeToTuple<Tuple> = {
    [Index in keyof Tuple]: Tuple[Index] | typeof loaderWildcard
}

/**
 * Returns true if the function with given arguments is loading and false otherwise.
 *
 * @param loaderState An object where loading information is persisted
 * @param fn The function to be tracked
 * @param functionArgs The arguments to check for. The number and types of arguments should match the definition of the
 *                     supplied function. functionArgs can be unspecified or undefined to check for any combination
 *                     of arguments. Use {@link loaderWildcard} as an argument to match any argument in that position.
 *
 * @example <caption>if ```fn(1, 'a')``` is currently loading, then </caption>
 * ```
 * getLoader(loaderState, fn) // true
 * getLoader(loaderState, fn, [1, 'a']) // true
 * getLoader(loaderState, fn, [5, 'a']) // false
 * getLoader(loaderState, fn, [loaderWildcard, 'a']) //true
 * ```
 */
export const getLoader = <A extends any[]>(
    loaderState: LoaderState,
    fn: (...args: A) => any,
    functionArgs: AddWildcardTypeToTuple<A> | undefined = undefined
) => {
    let currentlyRunningCounts: number[]

    if (functionArgs === undefined) {
        currentlyRunningCounts = deepGetAllNumbers([
            loaderState.get(fn) ?? new Map(),
        ])
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

/**
 * Automatically wraps all functions with {@link wrapLoader} in an object or class.
 * @param loaderState An object where loading information is persisted
 * @param item An object, class or array
 * @param options.recursive Wraps objects, arrays and classes which are deeply nested in the input item. Defaults to true
 * @param options.overrides Disable wrapping on certain props. E.g. { myFn: false } will disable wrapping for myFn.
 *                          Currently only supported for top level props.
 */
export const makeAutoLoader = (
    loaderState: object,
    item: object,
    options: {
        recursive?: boolean
        overrides?: { [propName: string]: boolean }
    } = {}
) => {
    const wrap_if_function = (
        val: any,
        path: (string | number)[],
        parent: any
    ) => {
        const prop = path[path.length - 1]
        const is_overriden =
            path.length === 1 && options.overrides?.[prop] === false

        if (val instanceof Function && !is_overriden) {
            // @ts-ignore
            parent[prop] = wrapLoader(loaderState, val)
        }
    }

    if (options.recursive === false) {
        Object.keys(item).forEach((prop) => {
            // @ts-ignore
            const val = item[prop]
            wrap_if_function(val, [prop], item)
        })
    } else {
        deep_for_each(item, (value, path, parent) =>
            wrap_if_function(value, path, parent)
        )
    }
}
