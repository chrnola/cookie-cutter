/*
Copyright (c) Walmart Inc.

This source code is licensed under the Apache 2.0 license found in the
LICENSE file in the root directory of this source tree.
*/

import { BoundedPriorityQueue } from "../../";
import { timeout } from "../../utils";

describe("BoundedPriorityQueue", () => {
    it("blocks adding when capacity is reached", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        await expect(queue.enqueue(1)).resolves.toBe(true);
        await expect(queue.enqueue(2)).resolves.toBe(true);
        await expect(queue.enqueue(3)).resolves.toBe(true);
        await expect(timeout(queue.enqueue(4), 50)).rejects.toBeDefined();
    });

    it("blocks dequeue when empty", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        await expect(timeout(queue.dequeue(), 50)).rejects.toBeDefined();
    });

    it("resolves dequeue after item was added", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        const pendingDequeue = queue.dequeue();
        await queue.enqueue(42);
        await expect(pendingDequeue).resolves.toBe(42);
    });

    it("performs blocked enqueue operation after item was dequeued", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        await queue.enqueue(1);
        await queue.enqueue(2);
        await queue.enqueue(3);
        const pendingEnqueue = queue.enqueue(4);

        for (let expected = 1; expected <= 4; expected++) {
            await expect(queue.dequeue()).resolves.toBe(expected);
        }

        await expect(pendingEnqueue).resolves.toBe(true);
    });

    it("fails blocked enqueue/dequeue on close", async () => {
        const queue = new BoundedPriorityQueue<number>(0);
        const pendingDequeue = queue.dequeue();
        const pendingEnqueue = queue.enqueue(1);
        queue.close();
        await expect(pendingDequeue).rejects.toBeTruthy();
        await expect(pendingEnqueue).resolves.toBe(false);
    });

    it("dequeues items with higher priority first", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        await queue.enqueue(1, 0);
        await queue.enqueue(2, 1);
        await queue.enqueue(3, 0);

        await expect(queue.dequeue()).resolves.toBe(2);
        await expect(queue.dequeue()).resolves.toBe(1);
        await expect(queue.dequeue()).resolves.toBe(3);
    });

    it("iterates contained items", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        await queue.enqueue(1, 0);
        await queue.enqueue(2, 1);
        await queue.enqueue(3, 0);
        queue.close();

        const buffer = [];
        for await (const item of queue.iterate()) {
            buffer.push(item);
        }

        expect(buffer).toMatchObject([2, 1, 3]);
    });

    it("terminates iterator if no items have been produced", async () => {
        const queue = new BoundedPriorityQueue<number>(3);
        const p = (async () => {
            for await (const _ of queue.iterate()) {
                // nothing
            }
            return "done";
        })();
        queue.close();
        await expect(p).resolves.toBe("done");
    });
});
