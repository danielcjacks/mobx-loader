import { expect } from 'chai'
import { describe, test } from 'mocha'
import {
    deepGet,
    deepGetWithWilcard,
    deepSet,
    deep_for_each,
    hasOwnProperty,
    rightPadArray,
} from '../helpers'

describe('helpers.ts', () => {
    describe(deep_for_each.name, () => {
        test('iterates deeply', () => {
            const obj = {
                a: [1],
                b: 2,
            }

            let results: any[] = []
            deep_for_each(obj, (val, path) => results.push([val, path]))
            expect(results).to.deep.equal([
                [
                    {
                        a: [1],
                        b: 2,
                    },
                    [],
                ],
                [[1], ['a']],
                [1, ['a', 0]],
                [2, ['b']],
            ])
        })
    })
    describe(hasOwnProperty.name, () => {
        test('checks for a property', () => {
            const obj = { a: 1 }
            expect(hasOwnProperty(obj, 'a')).to.equal(true)
            expect(hasOwnProperty(obj, 'b')).to.equal(false)
        })
        test('works for arrays', () => {
            const ar = ['a', 'b']
            expect(hasOwnProperty(ar, 1)).to.equal(true)
            expect(hasOwnProperty(ar, 2)).to.equal(false)
        })
    })
    describe(rightPadArray.name, () => {
        test('adds padding', () => {
            const ar = ['a', 'b']
            const result = rightPadArray(ar, 4, undefined)
            expect(result).to.deep.equal(['a', 'b', undefined, undefined])
        })
        test("doesn't remove elements", () => {
            const ar = ['a', 'b']
            const result = rightPadArray(ar, 1, undefined)
            expect(result).to.deep.equal(['a', 'b'])
        })
    })
    describe(deepSet.name, () => {
        test('sets existing property', () => {
            const obj: any = {
                a: new Map(
                    Object.entries({
                        b: new Map(
                            Object.entries({
                                c: [1, { d: 2 }, 3],
                            })
                        ),
                    })
                ),
            }

            deepSet(obj, ['a', 'b', 'c', 1, 'd'], 5)

            expect(obj.a.get('b').get('c')[1].d).to.equal(5)
        })
        test('sets non existing properties', () => {
            const obj: any = {}

            deepSet(obj, ['a', 'b', 2], 5)

            expect(obj.a.get('b')[2]).to.equal(5)
        })
        test('sets in object mode', () => {
            const obj: any = {}
            deepSet(obj, ['a', 'b'], 5, false)
            expect(obj.a.b).to.equal(5)
        })
    })
    describe(deepGet.name, () => {
        test('gets existing nested prop', () => {
            const obj = {
                a: [
                    1,
                    {
                        b: new Map(
                            Object.entries({
                                c: 3,
                            })
                        ),
                    },
                    3,
                ],
            }

            const result = deepGet(obj, ['a', 1, 'b', 'c'])
            expect(result).to.equal(3)
        })
        test('returns undefined for non-existing path', () => {
            const obj = {
                a: [],
            }

            const result = deepGet(obj, ['a', 5, 'b'])
            expect(result).to.equal(undefined)
        })
    })
    describe(deepGetWithWilcard.name, () => {
        test('gets locations with wildcards', () => {
            const obj = {
                a: [
                    1,
                    {
                        b: 2,
                        c: 3,
                    },
                    {
                        b: 4,
                    },
                    {
                        c: 5,
                    },
                ],
            }

            const wildcard = Symbol('wildcard')
            const results = deepGetWithWilcard(
                obj,
                ['a', wildcard, 'b'],
                wildcard
            )

            expect(results).to.deep.equal([2, 4])
        })
        test('works with Maps', () => {
            const obj = new Map(Object.entries({
                a: new Map(Object.entries({
                    b: 1,
                    c: 2
                }))
            }))
            const wildcard = Symbol('wildcard')
            const results = deepGetWithWilcard(obj, [wildcard, 'b'], wildcard)
            expect(results).to.deep.equal([1])
        })
    })
})
