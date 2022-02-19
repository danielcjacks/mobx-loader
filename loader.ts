import { hasOwnProperty, rightPadArray } from './helpers'

export type LoaderState = {
    [functionName: string]: {
        [stringifiedArgs: string]: number // number of currently running functions
    }
}

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

const setLoader = (
    loaderState: LoaderState,
    functionName: string,
    functionArgs: any[],
    isLoading: boolean
) => {
    if (!loaderState[functionName]) {
        loaderState[functionName] = {}
    }

    // stringifying is unfortunate, but javascript objects only take string keys (and Maps check equality by reference
    // for arrays, not values so they can't be used here)
    const stringifiedArgs = JSON.stringify(functionArgs)

    // we keep track of the number of instances of the function running with these args. The function is only considered
    // not loading when all these instances are finished (counter is back to 0). This prevents incorrectly saying the
    // loader is finished when a second call of the function finishes while the first call is still running.
    const functionState = loaderState[functionName]
    const currentlyRunningCount = functionState[stringifiedArgs] ?? 0

    const newRunningCount = isLoading
        ? currentlyRunningCount + 1
        : currentlyRunningCount - 1

    if (newRunningCount < 0) throw new Error('something is really wrong')
    if (newRunningCount === 0) {
        delete functionState[stringifiedArgs]
    } else {
        functionState[stringifiedArgs] = newRunningCount
    }
}