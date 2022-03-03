import { expect } from 'chai'
import { describe, test } from 'mocha'
import {
    deepGet,
    deepGetAllNumbers,
    deepGetWithWilcard,
    deepSet,
    deep_for_each,
    hasProp,
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
    describe(hasProp.name, () => {
        test('checks for a property', () => {
            const obj = { a: 1 }
            expect(hasProp(obj, 'a')).to.equal(true)
            expect(hasProp(obj, 'b')).to.equal(false)
        })
        test('works for arrays', () => {
            const ar = ['a', 'b']
            expect(hasProp(ar, 1)).to.equal(true)
            expect(hasProp(ar, 2)).to.equal(false)
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
            const obj: any = new Map(Object.entries({
                a: new Map(Object.entries({
                    b: 2
                }))
            }))

            deepSet(obj, ['a', 'b'], 5)

            expect(obj.get('a').get('b')).to.equal(5)
        })
        test('sets non existing properties', () => {
            const obj = new Map()

            deepSet(obj, ['a', 'b'], 5)

            expect(obj.get('a').get('b')).to.equal(5)
        })
    })
    describe(deepGet.name, () => {
        test('gets existing nested prop', () => {
            const obj = new Map(Object.entries({
                a: new Map(Object.entries({
                    b: 3
                }))
            }))

            const result = deepGet(obj, ['a', 'b'])
            expect(result).to.equal(3)
        })
        test('returns undefined for non-existing path', () => {
            const obj = new Map()

            const result = deepGet(obj, ['a', 'b'])
            expect(result).to.equal(undefined)
        })
    })
    describe(deepGetWithWilcard.name, () => {
        test('gets locations with wildcards', () => {
            const obj = new Map(Object.entries({
                a: new Map(Object.entries({
                    b: 1,
                    c: new Map(Object.entries({
                        b: 2,
                        c: 3,
                    })),
                    d: new Map(Object.entries({
                        b: 4,
                    })),
                    e: new Map(Object.entries({
                        c: 5,
                    })),
                })),
            }))

            const wildcard = Symbol('wildcard')
            const results = deepGetWithWilcard(
                obj,
                ['a', wildcard, 'b'],
                wildcard
            )

            expect(results).to.deep.equal([2, 4])
        })
    })
    describe(deepGetAllNumbers.name, () => {
        test('gets numbers', () => {
            const obj = new Map(Object.entries({
                a: 1,
                b: new Map(Object.entries({
                    c: 2
                }))
            }))

            const result = deepGetAllNumbers([obj])
            expect(result).to.deep.equal([1, 2])
        })
    })
})
