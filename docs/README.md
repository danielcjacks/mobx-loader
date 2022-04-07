# mobx-loader

## Table of contents

### Type aliases

- [LoaderState](README.md#loaderstate)

### Variables

- [loaderWildcard](README.md#loaderwildcard)

### Functions

- [getLoader](README.md#getloader)
- [makeAutoLoader](README.md#makeautoloader)
- [setLoader](README.md#setloader)
- [wrapLoader](README.md#wraploader)

## Type aliases

### LoaderState

Ƭ **LoaderState**: `Map`<`Function`, `LoaderStateArgs`\>

## Variables

### loaderWildcard

• `Const` **loaderWildcard**: typeof [`loaderWildcard`](README.md#loaderwildcard)

Using a this as an argument in the arguments list of [getLoader](README.md#getloader) will match any argument in that position

## Functions

### getLoader

▸ **getLoader**<`A`\>(`loaderState`, `fn`, `functionArgs?`): `boolean`

Returns true if the function with given arguments is loading and false otherwise.

**`example`** if ```fn(1, 'a')``` is currently loading, then 
```
getLoader(loaderState, fn) // true
getLoader(loaderState, fn, [1, 'a']) // true
getLoader(loaderState, fn, [5, 'a']) // false
getLoader(loaderState, fn, [loaderWildcard, 'a']) //true
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `A` | extends `any`[] |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `loaderState` | [`LoaderState`](README.md#loaderstate) | `undefined` | An object where loading information is persisted |
| `fn` | (...`args`: `A`) => `any` | `undefined` | The function to be tracked |
| `functionArgs` | `undefined` \| `A` | `undefined` | The arguments to check for. The number and types of arguments should match the definition of the                     supplied function. functionArgs can be unspecified or undefined to check for any combination                     of arguments. Use [loaderWildcard](README.md#loaderwildcard) as an argument to match any argument in that position. |

#### Returns

`boolean`

___

### makeAutoLoader

▸ **makeAutoLoader**(`loaderState`, `item`, `options?`): `void`

Automatically wraps all functions with [wrapLoader](README.md#wraploader) in an object or class.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `loaderState` | `object` | An object where loading information is persisted |
| `item` | `object` | An object, class or array |
| `options` | `Object` | - |
| `options.overrides?` | `Object` | Disable wrapping on certain props. E.g. { myFn: false } will disable wrapping for myFn.                          Currently only supported for top level props. |
| `options.recursive?` | `boolean` | Wraps objects, arrays and classes which are deeply nested in the input item. Defaults to true |

#### Returns

`void`

___

### setLoader

▸ **setLoader**<`A`\>(`loaderState`, `fn`, `functionArgs`, `isLoading`): `void`

Sets the loader state to indicate that a given function, called with a specific set of arguments,
is running / finished. This function should be called every time a tracked function is started or finishes.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `A` | extends `any`[] |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `loaderState` | [`LoaderState`](README.md#loaderstate) | An object where loading information is persisted |
| `fn` | (...`args`: `A`) => `any` | The function to be tracked |
| `functionArgs` | `A` | The arguments that the tracked function was called with. The length of this should be the same                     as the number of arguments that fn was defined with |
| `isLoading` | `boolean` | True when the function starts and false when it ends |

#### Returns

`void`

___

### wrapLoader

▸ **wrapLoader**<`A`, `R`\>(`loaderState`, `fn`): (...`args`: `A`) => `R`

Wraps a function so that it automatically sets the loading state to be true while the function is running.
Any kind of function can be wrapped, but wrapLoader will only actually set loading state for asynchronous functions.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `A` | extends `any`[] |
| `R` | `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `loaderState` | [`LoaderState`](README.md#loaderstate) | An object where loading information is persisted |
| `fn` | (...`args`: `A`) => `R` | Can be any function |

#### Returns

`fn`

A wrapped version of fn

▸ (...`args`): `R`

##### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `A` |

##### Returns

`R`
