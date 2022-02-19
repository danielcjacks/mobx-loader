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
