import { describe, test } from 'mocha'
import { expect } from 'chai'
import {
    getLoader,
    LoaderState,
    loaderWildcard,
    makeAutoLoader,
    setLoader,
    wrapLoader,
} from '../loader'
import { autorun, observable, toJS, trace } from 'mobx'

describe('loader.ts', () => {
    describe(setLoader.name, () => {
        test('sets a value in the state', () => {
            const loaderState: LoaderState = new Map()
            const fn = (a: number, b: string) => a + b

            // notice the arguments are properly typed
            setLoader(loaderState, fn, [12, 'hi'], true)

            // @ts-ignore
            const isLoading = loaderState.get(fn).get(12)?.get('hi')
            expect(isLoading).to.equal(1)

            setLoader(loaderState, fn, [12, 'hi'], false)

            // @ts-ignore
            const isLoading2 = loaderState.get(fn).get(12)?.get('hi')
            expect(isLoading2).to.equal(0)
        })
        test('works with other data types', () => {
            const loaderState: LoaderState = new Map()
            const fn: any = () => {}

            const a = new Date()
            const b: any[] = []
            const c = {}
            const d = new Map()
            const e = Symbol('my symbol')

            setLoader(loaderState, fn, [a, b, c, d, e], true)

            // @ts-ignore
            const isLoading = loaderState
                .get(fn)
                // @ts-ignore
                .get(a)
                .get(b)
                .get(c)
                .get(d)
                .get(e)
            expect(isLoading).to.equal(1)
        })
        test('works with multiple funtions and params', () => {
            const loaderState: LoaderState = new Map()
            const fn1: any = () => {}
            const fn2: any = () => {}

            setLoader(loaderState, fn1, [1, 'a'], true)
            setLoader(loaderState, fn2, [1, 'a'], true)
            setLoader(loaderState, fn1, [1, 'b'], true)

            // @ts-ignore
            const isLoadingA = loaderState.get(fn1).get(1).get('a')
            // @ts-ignore
            const isLoadingB = loaderState.get(fn2).get(1).get('a')
            // @ts-ignore
            const isLoadingC = loaderState.get(fn1).get(1)?.get('b')

            expect(isLoadingA).to.equal(1)
            expect(isLoadingB).to.equal(1)
            expect(isLoadingC).to.equal(1)
        })
        test('works with the same function multiple times', () => {
            const loaderState: LoaderState = new Map()
            const fn: any = () => {}

            // using a counter means that we correctly know when ALL functions have finished,
            // which only happens when the counter is 0
            setLoader(loaderState, fn, [], true)
            setLoader(loaderState, fn, [], true)
            const isLoading1 = loaderState.get(fn)

            setLoader(loaderState, fn, [], false)
            const isLoading2 = loaderState.get(fn)

            setLoader(loaderState, fn, [], false)
            const isLoading3 = loaderState.get(fn)

            expect(isLoading1).to.equal(2)
            expect(isLoading2).to.equal(1)
            expect(isLoading3).to.equal(0)
        })
    })
    describe(getLoader.name, () => {
        test('gets loader value', () => {
            const loaderState: LoaderState = new Map()
            const fn: any = () => {}

            setLoader(loaderState, fn, ['a'], true)
            setLoader(loaderState, fn, ['a'], true)

            const isLoading1 = getLoader(loaderState, fn, ['a'])

            setLoader(loaderState, fn, ['a'], false)
            const isLoading2 = getLoader(loaderState, fn, ['a'])

            setLoader(loaderState, fn, ['a'], false)
            const isLoading3 = getLoader(loaderState, fn, ['a'])

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(true)
            expect(isLoading3).to.equal(false)
        })
        test('checks all function instances if no args list is given', () => {
            const loaderState: LoaderState = new Map()
            const fn1: any = () => {}
            const fn2: any = () => {}

            setLoader(loaderState, fn1, ['a', 'b'], true)

            const isLoading1 = getLoader(loaderState, fn1)
            const isLoading2 = getLoader(loaderState, fn2)

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(false)
        })
    })
    describe(wrapLoader.name, () => {
        test('tracks loading for async functions', async () => {
            let loaderState: LoaderState = new Map()

            const fn = wrapLoader(loaderState, async () => {})

            const prom = fn()
            const isLoading1 = getLoader(loaderState, fn, [])

            await prom
            const isLoading2 = getLoader(loaderState, fn, [])

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(false)
        })
        test('tracks loading on error', async () => {
            let loaderState: LoaderState = new Map()

            const fn = wrapLoader(loaderState, async () => {
                throw new Error()
            })

            const prom = fn().catch((error) => {})
            const isLoading1 = getLoader(loaderState, fn, [])

            await prom

            const isLoading2 = getLoader(loaderState, fn, [])

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(false)
        })
        test("doesn't track loading for synchronous functions", () => {
            let loaderState: LoaderState = new Map()

            const fn = wrapLoader(loaderState, () => {})

            fn()

            expect(loaderState).to.deep.equal(new Map())
        })
    })
    describe(makeAutoLoader.name, () => {
        test('works with classes and respects overrides', () => {
            class MyClass {
                loaderState: any = new Map()

                constructor() {
                    makeAutoLoader(this.loaderState, this, { overrides: { fn1: false}, recursive: false })
                }

                fn1 = async () => {}
                fn2 = async () => {}
            }

            const myClass = new MyClass()

            const prom1 = myClass.fn1()
            const prom2 = myClass.fn2()

            const fn2IsLoading = getLoader(myClass.loaderState, myClass.fn2)
            const fn1Loader = myClass.loaderState.fn1

            expect(fn2IsLoading).to.equal(true)
            expect(fn1Loader).to.equal(undefined)
        })
        test('works on objects and works recursively', () => {
            const loaderState = new Map()

            const obj = {
                fn: async () => { },
                child: {
                    fn2: async () => { }
                }
            }

            makeAutoLoader(loaderState, obj)

            const prom1 = obj.fn()
            const isLoading1 = getLoader(loaderState, obj.fn)
            
            const prom2 = obj.child.fn2()
            const isLoading2 = getLoader(loaderState, obj.child.fn2)

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(true)
        })
    })
    describe('mobx integration tests', () => {
        test('triggers reactions on loading change', async () => {
            const loaderState = observable(new Map())
            const fn = wrapLoader(loaderState, async () => {})

            // 'warm up' the state
            await fn()

            let loadingHistory: boolean[] = []
            const disposer = autorun(() => {
                const loading = getLoader(loaderState, fn)
                loadingHistory.push(loading)
            })

            await fn()

            expect(loadingHistory).to.deep.equal([false, true, false])

            disposer()
        })
        test("doesn't trigger unnecessary reactions", async () => {
            const loaderState = observable(new Map())
            const fn = wrapLoader(loaderState, async (a) => {})

            // this 'warms up' the state by adding fn to it. This first call causes all reactions to run regardless of
            // which arguments they are tracking, but after this the autoruns will only activate if the function
            // is called with the correct arguments
            await fn(3)

            let loadingHistory: [number, boolean][] = []
            const disposer1 = autorun(() => {
                // trace(true)
                const loading = getLoader(loaderState, fn, [1])
                loadingHistory.push([1, loading])
            })

            const disposer2 = autorun(() => {
                const loading = getLoader(loaderState, fn, [2])
                loadingHistory.push([2, loading])
            })

            await fn(3)
            expect(loadingHistory).to.deep.equal([
                [1, false],
                [2, false],
            ])
            await fn(2)
            expect(loadingHistory).to.deep.equal([
                [1, false],
                [2, false],
                [2, true],
                [2, false],
            ])
            await fn(1)
            expect(loadingHistory).to.deep.equal([
                [1, false],
                [2, false],
                [2, true],
                [2, false],
                [1, true],
                [1, false],
            ])

            disposer1()
            disposer2()
        })
        test('tracks with wildcards', async () => {
            const loaderState = observable(new Map())
            const fn = wrapLoader(loaderState, async (a, b) => {})

            // 'warm up' state
            await fn(1, 2)

            let loadingHistory: boolean[] = []
            const disposer = autorun(() => {
                const loading = getLoader(loaderState, fn, [loaderWildcard, 2])
                loadingHistory.push(loading)
            })

            await fn(5, 2) // causes autorun
            await fn(5, 3) // no autorun

            expect(loadingHistory).to.deep.equal([false, true, false])

            disposer()
        })
    })
})