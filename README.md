# Mobx loader

Mobx-loader is a utility library that automatically sets a piece of loading state whenever a promise starts, is resolved or is rejected. This replaces the tedious process of manually managing an isLoading prop to keep track of whether an asynchronous function is running or not. Mobx-loader can set loading state based on which specific arguments are passed to the function, which allows different calls of the same function to be tracked.

Some examples of where mobx-loader may be useful:

-   showing loading indicators
-   stopping duplicate requests when submitting a form
-   changing a button as long as a (promise based) dialog is open
-   anytime you need to know if an asynchronous function is running

# Installation

```
npm install mobx-loader
```

or

```
yarn add mobx-loader
```

# Examples

## Basic usage with react

This is the simplest way to use mobx-loader with mobx and react. Copy-paste this to get started.

```typescript
import { wrapLoader, getLoader } from 'mobx-loader'
import { observer } from 'mobx-react-lite'
import { observable } from 'mobx'

// we need to create an empty loaderState Map. This is where mobx-loader will store whether all our functions
// are running or not
const loaderState = observable(new Map())

// we can wrap any function we want with wrapLoader. This lets us use fn like any other javascript function and the loaderState variable will automatically keep track of whether it's running
const fn = wrapLoader(loaderState, async () => {})

// create any React component with mobx
const MyComponent = observer(() => {
    // getLoader returns true if fn is running, and false otherwise.
    // This causes the text to change whenever fn starts or finishes
    return <>{getLoader(loaderState, fn) ? 'loading' : 'finished'}</>
})
```

## Tracking arguments

Mobx-loader can tell you if a function is running with specific arguments. This is useful when the same function is called with different arguments - for example only row 3 in a UI table should show a loading indicator when deleteRow(3) is called.

```typescript
import { wrapLoader, getLoader, loaderWildcard } from 'mobx-loader'

const loaderState = new Map()
const deleteRow = wrapLoader(
    loaderState,
    async (rowIndex: number, message: string) => {}
)

deleteRow(3, 'Deleted!')

getLoader(loaderState, fn) // true, since an instance of deleteRow is running (with any arguments)
getLoader(loaderState, fn, [3, 'Deleted!']) // true, since deleteRow is running with these arguments
getLoader(loaderState, fn, [1, 'Deleted!']) // false, since fn is not running with these arguments
getLoader(loaderState, fn, [loaderWildcard, 'Deleted!']) // true, loaderWildcard matches any argument
```

## Automatic wrapping

Wrapping functions with wrapLoader can get annoying when there are a lot of functions to wrap. makeAutoLoader is a utility function which automatically wraps any functions it finds in an object or array with wrapLoader.

```typescript
import { makeAutoLoader } from 'mobx-loader'

const loaderState = observable(new Map())
const obj = {
    fn: async () => {},
    children: [
        {
            fn2: async () => {},
        },
    ],
}

// makeAutoLoader will recursively go through obj and wrap any functions it finds with wrapLoader.
// In this case, fn and fn2 will both be wrapped
makeAutoLoader(loaderState, obj)
```

makeAutoLoader also works with classes. This is especially convenient if you also use the makeAutoObservable utility from mobx, since makeAutoLoader works in a similar way.

```typescript
import { makeAutoObservable } from 'mobx'
import { makeAutoLoader } from 'mobx-loader'

class MyClass {
    loaderState = new Map()

    constructor(this) {
        makeAutoObservable(this)
        // IMPORTANT: makeAutoLoader should come after makeAutoObservable if they are both used
        makeAutoLoader(this.loaderState, this)
    }

    fn = async () => {} // fn is automatically wrapped with wrapLoader
}
```

# Documentation

[Full documentation](docs/README.md)

# Testing

To run the tests, download the git repo and run

```
npm install
npm run test
npm run coverage
```

```
25 passing (25ms)

------------|---------|----------|---------|---------|-------------------
File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------|---------|----------|---------|---------|-------------------
All files   |     100 |      100 |     100 |     100 |
 helpers.ts |     100 |      100 |     100 |     100 |
 loader.ts  |     100 |      100 |     100 |     100 |
------------|---------|----------|---------|---------|-------------------
```

# Advanced details

This section is not needed for most usages of mobx-loader. It describes more advanced use cases and some points about how mobx-loader works under the hood, which might help if something is not doing what is expected.

-   Mobx-loader is usually used with the wrapLoader function. If you want to set the loading state manually for whatever reason, you can do this using the setLoader function.

```typescript
import { setLoader, getLoader } from 'mobx-loader'

const loaderState = new Map()
const fn = async (a: number, b: string) => {}

setLoader(loaderState, fn, [1, 'a'], true) // all arguments must be provided

getLoader(loaderState, fn, [1, 'a']) // true
```

-   mobx-loader tracks functions based on an actual reference to the function, so if two functions have the same name and the same code in them but are defined in different places, they are considered separate. This means that one loaderState can be used across a whole application if needed.
-   loaders are only set for async functions, so reactions (observer components rerendering, autoruns etc) don't happen when a non-async function is called, even if it is wrapped with wrapLoader
-   The first time a wrapped function is called (or set manually with setLoader), it will trigger all reactions even if they are not looking at the arguments of the called functions (so the reaction will run, but getLoader will still return false). After the first time though, reactions only will run if the value returned by getLoader changes
