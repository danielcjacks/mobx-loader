// from https://stackoverflow.com/a/16608074
export const is_simple_object = (val: any) =>
    !!val && val.constructor === Object

/**
 * Calls the processor on every object and array for deeply nested objects/arrays. Processort runs from the least deeply nested keys to the most deeply nested ones
 * Does not run on leaf keys (i.e. where value of key is not an object or array)
 * @param item
 * @param processor
 * @param current_path
 */
export const deep_for_each = (
    item: any,
    processor: (value: any, path: (string | number)[]) => void,
    current_path: any[] = []
) => {
    const is_object = is_simple_object(item)
    const is_array = Array.isArray(item)
    const is_primitive = !is_object && !is_array

    if (is_object) {
        processor(item, current_path)
        for (const prop in item) {
            deep_for_each(item[prop], processor, [...current_path, prop])
        }
    }

    if (is_array) {
        processor(item, current_path)
        item.forEach((el, i) => {
            deep_for_each(el, processor, [...current_path, i])
        })
    }

    if (is_primitive) {
        processor(item, current_path)
    }
}

export const hasProp = <X extends {}, Y extends PropertyKey>(
    obj: X,
    prop: Y
): obj is X & Record<Y, unknown> => {
    return typeof obj === 'object' && prop in obj
}

export const rightPadArray = <T>(array: T[], length: number, fill: T) => {
    return length > array.length
        ? array.concat(Array(length - array.length).fill(fill))
        : array
}

/**
 * Deep set which works with nested maps
 */
export const deepSet = (obj: any, path_array: any[], value: any) => {
    let pointer = obj

    for (let i = 0; i < path_array.length; i++) {
        const path_el = path_array[i]

        const path_el_in_pointer = pointer.has(path_el)
        const last_path_el = i === path_array.length - 1

        if (!path_el_in_pointer || last_path_el) {
            const val = last_path_el ? value : new Map()
            pointer.set(path_el, val)
        }

        pointer = pointer.get(path_el)
    }
}

/**
 * Deep get which works with nested maps
 */
export const deepGet = (obj: any, path_array: any[]): any => {
    let pointer = obj

    for (let i = 0; i < path_array.length; i++) {
        if (!(pointer instanceof Map)) {
            break
        }

        const path_el = path_array[i]

        pointer = pointer?.get?.(path_el)
    }

    return pointer
}

/**
 * Deep get which works with Maps. Uses a wildcard to mean any prop.
 * Only returns values which match the path (unlike regular deep get which can return undefined
 * if the path doesn't exist)
 */
export const deepGetWithWilcard = (
    obj: any,
    path_array: any[],
    wildcard: any
) => {
    return deepGetWithWilcardRecursion([obj], path_array, wildcard)
}

const deepGetWithWilcardRecursion = (
    objs: any,
    path_array: any[],
    wildcard: any
): any[] => {
    if (path_array.length === 0) {
        return objs
    }

    const path_el = path_array[0]

    const results = objs.flatMap((obj: any) => {
        let next_objs: any
        if (path_el === wildcard) {
            const vals = obj?.values() ?? []
            // obj.values() returns an iterator so we need to spread then to make it an array
            next_objs = [...vals]
        } else {
            const next_obj = obj?.get?.(path_el)
            next_objs = next_obj === undefined ? [] : [next_obj]
        }
        return deepGetWithWilcardRecursion(
            next_objs,
            path_array.slice(1, Infinity),
            wildcard
        )
    })

    return results
}

export const deepGetAllNumbers = (objs: (Map<any, any> | number)[]): number[] => {
    const results = objs.flatMap((obj) => {
        if (obj instanceof Map) {
            const next_objs = [...obj.values()]
            return deepGetAllNumbers(next_objs)
        } else {
            return obj
        }
    })

    return results
}
