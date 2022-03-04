# Mobx loader

Mobx-loader is a utility library which helps you reactively track when an asynchronous function is running. Mobx-loader can track loading for specific function arguments, which allows different calls of the same function to be tracked.

Some examples of where mobx-loader may be useful:

-   showing loading indicators
-   stopping duplicate requests when submitting a form
-   changing a button as long as a (promise based) dialog is open
-   anytime you need to know if an asynchronous function is running

# Installation

```
npm install mobx-loader
```

```
yarn add mobx-loader
```

# Documentation

[Full documentation](docs/readme.md)

# Examples

## Basic usage with react

```typescript
import { wrapLoader, getLoader } from 'mobx-loader'
import { observer } from 'mobx-react-lite'
import { observable } from 'mobx'

const loaderState = observable(new Map())

const fn = wrapLoader(loaderState, async () => 2)

// React component with mobx
const MyComponent = observer(() => {
    // The text will change whenever fn starts or finishes
    return <>{getLoader(loaderState, fn) ? 'loading' : 'finished'}</>
})
```

## Tracking arguments

Argument tracking is useful when the same function is called with different arguments - for example only row 3 in a table should show a loading indicator when deleteRow(3) is called.

```typescript
import { wrapLoader, getLoader, loaderWildcard } from 'mobx-loader'

const loaderState = new Map()
const fn = wrapLoader(loaderState, async (a: number, b: string) => {})

fn(1, 'a')

getLoader(loaderState, fn) // true, since an instance of fn is running (ignores arguments)
getLoader(loaderState, fn, [1, 'a']) // true, since fn is running with these arguments
getLoader(loaderState, fn, [1, 'b']) // false, since fn is not running with these arguments
getLoader(loaderState, fn, [loaderWildcard, 'a']) // true, loaderWildcard matches any argument
```

## Automatic wrapping

Using an object

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

makeAutoLoader(loaderState, obj)
```

Using a class

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

# Manually setting loading state

```typescript
import { setLoader, getLoader } from 'mobx-loader'

const loaderState = new Map()
const fn = async (a: number, b: string) => {}

setLoader(loaderState, fn, [1, 'a']) // all arguments must be provided

getLoader(loaderState, fn, [1, 'a']) // true
```

# Testing

Download the git repo and run

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

# Technical details

This section is not needed for most usages of mobx-loader, but it might help if something is not doing what is expected

-   mobx-loader tracks functions based on an actual reference to the function, so if two functions have the same name and the same code in them but are defined in different places, they are considered separate. This means that one loaderState can be used across a whole application if needed.
-   loaders are only set for async functions, so reactions (observer components rerendering, autoruns etc) don't happen when a non-async function is called, even if it is wrapped with wrapLoader
-   The first time a wrapped function is called (or set manually with setLoader), it will trigger all reactions even if they are not looking at the arguments of the called functions (so the reaction will run, but getLoader will still return false). After the first time though, reactions only will run if the value returned by getLoader changes
-   makeAutoLoader recursion only works on objects, classes and arrays (not Maps, Sets etc)