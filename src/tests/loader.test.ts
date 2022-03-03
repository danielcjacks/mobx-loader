import { describe, test } from 'mocha'
import { expect } from 'chai'
import {
    getLoader,
    LoaderState,
    makeAutoLoader,
    setLoader,
    wrapLoader,
} from '../loader'
import {autorun, observable, toJS} from 'mobx'

describe('loader.ts', () => {
    describe(setLoader.name, () => {
        test('sets a value in the state', () => {
            const loaderState: LoaderState = {}
            const testFunction = (a: number, b: string) => a + b

            // notice the arguments have types since the function itself was passed in, as opposed to the funtion name string
            setLoader(loaderState, testFunction, [12, 'hi'], true)

            // @ts-ignore
            const isLoading = loaderState.testFunction.get(12)?.get('hi')
            expect(isLoading).to.equal(1)

            setLoader(loaderState, testFunction, [12, 'hi'], false)

            // @ts-ignore
            const isLoading2 = loaderState.testFunction.get(12)?.get('hi')
            expect(isLoading2).to.equal(0)
        })
        test('works with other data types', () => {
            const loaderState: LoaderState = {}

            const a = new Date()
            const b: any[] = []
            const c = {}
            const d = new Map()
            const e = Symbol('my symbol')

            setLoader(loaderState, 'testFunction', [a, b, c, d, e], true)

            const isLoading = loaderState.testFunction
                // @ts-ignore
                .get(a)
                .get(b)
                .get(c)
                .get(d)
                .get(e)
            expect(isLoading).to.equal(1)
        })
        test('works with multiple funtions and params', () => {
            const loaderState: LoaderState = {}

            setLoader(loaderState, 'fn1', [1, 'a'], true)
            setLoader(loaderState, 'fn2', [1, 'a'], true)
            setLoader(loaderState, 'fn1', [1, 'b'], true)

            // @ts-ignore
            const isLoadingA = loaderState.fn1?.get(1)?.get('a')
            // @ts-ignore
            const isLoadingB = loaderState.fn2?.get(1)?.get('a')
            // @ts-ignore
            const isLoadingC = loaderState.fn1?.get(1)?.get('b')

            expect(isLoadingA).to.equal(1)
            expect(isLoadingB).to.equal(1)
            expect(isLoadingC).to.equal(1)
        })
        test('works with the same function multiple times', () => {
            const loaderState: LoaderState = {}

            // using a counter means that we correctly know when ALL functions have finished,
            // which only happens when the counter is 0
            setLoader(loaderState, 'fn1', [], true)
            setLoader(loaderState, 'fn1', [], true)
            const isLoading1 = loaderState.fn1

            setLoader(loaderState, 'fn1', [], false)
            const isLoading2 = loaderState.fn1

            setLoader(loaderState, 'fn1', [], false)
            const isLoading3 = loaderState.fn1

            expect(isLoading1).to.equal(2)
            expect(isLoading2).to.equal(1)
            expect(isLoading3).to.equal(0)
        })
    })
    describe(getLoader.name, () => {
        test('gets loader value', () => {
            const loaderState: LoaderState = {}
            setLoader(loaderState, 'fn1', ['a'], true)
            setLoader(loaderState, 'fn1', ['a'], true)

            const isLoading1 = getLoader(loaderState, 'fn1', ['a'])

            setLoader(loaderState, 'fn1', ['a'], false)
            const isLoading2 = getLoader(loaderState, 'fn1', ['a'])

            setLoader(loaderState, 'fn1', ['a'], false)
            const isLoading3 = getLoader(loaderState, 'fn1', ['a'])

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(true)
            expect(isLoading3).to.equal(false)
        })
        test('checks all function instances if no args list is given', () => {
            const loaderState: LoaderState = {}
            setLoader(loaderState, 'fn1', ['a', 'b'], true)

            const isLoading = getLoader(loaderState, 'fn1')

            expect(isLoading).to.equal(true)
        })
    })
    describe(wrapLoader.name, () => {
        test('tracks loading for async functions', async () => {
            let loaderState: LoaderState = {}

            const fn = wrapLoader(loaderState, async () => {})

            const prom = fn()
            const isLoading1 = getLoader(loaderState, fn, [])

            await prom
            const isLoading2 = getLoader(loaderState, fn, [])

            expect(isLoading1).to.equal(true)
            expect(isLoading2).to.equal(false)
        })
        test('tracks loading on error', async () => {
            let loaderState: LoaderState = {}

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
            let loaderState: LoaderState = {}

            const fn = wrapLoader(loaderState, () => {})

            fn()

            expect(loaderState).to.deep.equal({})
        })
    })
    describe(makeAutoLoader.name, () => {
        test('works with classes', () => {
            class MyClass {
                loaderState: any = {}

                constructor() {
                    makeAutoLoader(this, this.loaderState, { fn1: false })
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
    })
    describe('integration tests', () => {
        test('mobx integration', async () => {
            const loaderState = observable({})

            const fn = wrapLoader(loaderState, async () => { })

            let loadingHistory: boolean[] = []
            const auto = autorun(() => {
                const a = toJS
                const loading = getLoader(loaderState, fn)
                loadingHistory.push(loading)
            })

            await fn()

            expect(loadingHistory).to.deep.equal([false, true, false])
        })
    })
})

// TODO: make top level a map and store the actual function instead of just the name