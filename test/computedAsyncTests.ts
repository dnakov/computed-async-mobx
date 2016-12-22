import * as test from "blue-tape";
import delay from "./delay";

import { observable, autorun } from "mobx"
import { computedAsync } from "../computedAsync"

test("non-reverting", async (assert) => {

    const x = observable<number>(0),
          y = observable<number>(0);

    const r = computedAsync(500, async () => {
        const vx = x.get(), vy = y.get();
        await delay(100);
        return vx + vy;
    });

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting);
                resolve();
            };
        });
    }

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

    assert.equal(busyChanges, 1);

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    assert.equal(busyChanges, 2);

    x.set(2);

    assert.equal(busyChanges, 2);

    await expected(2);

    assert.equal(busyChanges, 3);

    y.set(3);

    assert.equal(busyChanges, 3);

    await delay(10);

    assert.equal(busyChanges, 4);

    await expected(5);

    assert.equal(busyChanges, 5);
    
    x.set(4);

    assert.equal(busyChanges, 5);

    await expected(7);

    stopRunner();

    y.set(4);

    assert.equal(busyChanges, 7);

    assert.equal(r.value, 500);

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    x.set(5);
    await delay(1000);

    assert.equal(busyChanges, 7);

    expect = v => assert.equal(v, 7); 

    stopRunner = autorun(() => expect(r.value));

    x.set(1);

    assert.equal(busyChanges, 7);
    
    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    assert.equal(busyChanges, 9);

    x.set(2);

    assert.equal(busyChanges, 9);

    await delay(1000);
    
    assert.equal(busyChanges, 9);

    stopRunner();
    stopCountBusyChanges();
});

test("reverting", async (assert) => {

    const x = observable<number>(0),
          y = observable<number>(0);

    const r = computedAsync({
        init: 500,
        fetch: async () => {
            const vx = x.get(), vy = y.get();
            await delay(100);
            return vx + vy;
        },
        revert: true
    });

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting);
                resolve();
            };
        });
    }

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    x.set(2);

    await expected(500);
    await expected(2);

    y.set(3);

    await expected(500);
    await expected(5);

    x.set(4);

    await expected(500);
    await expected(7);

    stopRunner();

    y.set(4);

    assert.equal(r.value, 500);

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    x.set(5);
    await delay(1000);

    expect = v => assert.equal(v, 7); 

    stopRunner = autorun(() => expect(r.value));

    x.set(1);
    
    await expected(500);
    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    x.set(2);

    await delay(1000);
    
    stopRunner();
});