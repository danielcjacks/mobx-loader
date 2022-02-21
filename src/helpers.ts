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

export const hasOwnProperty = <X extends {}, Y extends PropertyKey>(
    obj: X,
    prop: Y
): obj is X & Record<Y, unknown> => {
    return obj.hasOwnProperty(prop)
}

export const rightPadArray = <T>(array: T[], length: number, fill: T) => {
    return length > array.length
        ? array.concat(Array(length - array.length).fill(fill))
        : array
}

/**
 * Deep set which works with arrays, objects and Maps
 */
export const deepSet = (
    obj: any,
    path_array: (string | number)[],
    value: any,
    createMaps: boolean = true
) => {
    let pointer = obj

    for (let i = 0; i < path_array.length; i++) {
        const path_el = path_array[i]

        const path_el_in_pointer =
            pointer instanceof Map ? pointer.has(path_el) : path_el in pointer
        const last_path_el = i === path_array.length - 1

        if (!path_el_in_pointer || last_path_el) {
            let val
            if (last_path_el) {
                val = value
            } else if (typeof path_array[i + 1] === 'number') {
                val = []
            } else {
                val = createMaps ? new Map() : {}
            }

            if (pointer instanceof Map) {
                pointer.set(path_el, val)
            } else {
                pointer[path_el] = val
            }
        }

        if (pointer instanceof Map) {
            pointer = pointer.get(path_el)
        } else {
            pointer = pointer[path_el]
        }
    }
}

/**
 * Deep get which works with arrays, objects and Maps
 */
 export const deepGet = (
    obj: any,
    path_array: (string | number)[]
) => {
    let pointer = obj

    for (let i = 0; i < path_array.length; i++) {
        if (pointer === undefined) {
            break
        }

        const path_el = path_array[i]

        if (pointer instanceof Map) {
            pointer = pointer.get(path_el)
        } else {
            pointer = pointer[path_el]
        }
    }

    return pointer
}

/**
 * Deep get which works with arrays, objects and Maps. Uses a wildcard to mean any prop.
 * Only returns values which match (unlike regular deep get which can return undefined
 * if the prop doesn't exist)
 */
 export const deepGetWithWilcard = (
    obj: any,
    path_array: (string | number | symbol)[],
    wildcard: any
) => {
    return deepGetWithWilcardRecursion([obj], path_array, wildcard)
}

const deepGetWithWilcardRecursion = (
    objs: any[],
    path_array: (string | number | symbol)[],
    wildcard: any
): any[] => {
    if (path_array.length === 0) {
        return objs
    }
    
    const path_el = path_array[0]
    
    const results = objs.flatMap(obj => {
        let next_objs: any
        if (path_el === wildcard) {
            next_objs = obj instanceof Map ? [...obj.values()] : Object.values(obj)
        } else {
            const next_obj = obj instanceof Map ? obj.get(path_el) : obj[path_el]
            next_objs = next_obj === undefined ? [] : [next_obj]
        }
        return deepGetWithWilcardRecursion(next_objs, path_array.slice(1, Infinity), wildcard)
    })

    return results
}