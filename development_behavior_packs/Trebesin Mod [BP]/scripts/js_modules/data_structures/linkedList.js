/*
    "linkedList.js" - Class representing double linked list data structure in JS.
    Copyright (C) 2023  PavelDobCZ23

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Double Linked List class.
 */
export class LinkedList {
    constructor() {}

    get start() {
        return this.#pointers.start
    }

    get end() {
        return this.#pointers.end
    }

    /**
    * @param {any} value Value to add before a node.
    */
    insertBefore(value,node) {
        new LinkedListNode(value,node,node.previous,this.#pointers);
    }

    /**
    * @param {any} value Value to add after a node.
    */
    insertAfter(value,node) {
        new LinkedListNode(value,node.next,node,this.#pointers);
    }

    /**
    * @param {any} value Value to add to the start.
    */
    addToStart(value) {
        new LinkedListNode(value,this.#pointers.start,null,this.#pointers);
    }

    /**
     * @param {any} value Value to add to the end.
     */
    addToEnd(value) {
        new LinkedListNode(value,null,this.#pointers.end,this.#pointers);
    }

    /**
     * Common callback for linked list operations.
     * @callback NodeSignal
     * @param {LinkedListNode} node - Current node.
     * @param {?object} node.next
     * @param {?object} node.previous
     */

    /**
     * Sets a callback to iterate over every node in the linked kist.
     * @param {NodeSignal} callback Callback for iterating over a linked list.
     * @param {boolean} [reverse] If the iteration should reverse its direction, default is towards the end.
     * @param {LinkedListNode} [start] Optional node to start the iteration at, default to `start` or `end` depending on the `reverse` parameter respectively.
     */
    forEach(callback,reverse = false,start = null) {
        let node;
        if (start != null) node = start;
        if (start == null) node = reverse ? this.#pointers.end : this.#pointers.start;
        while (node) {
            callback(node);
            node = reverse ? node.previous : node.next;
        }
    }

    /**
     * Returns first node for which the `callback` returns true.
     * @param {NodeSignal} callback Callback for iterating over the linked list.
     * @param {boolean} [reverse] If the search should reverse its direction, default is towards the end.
     * @param {LinkedListNode} [start] Optional node to start the search at, default to `start` or `end` depending on the `reverse` parameter respectively.
     * @returns {LinkedListNode} The found node.
    */
    find(callback,reverse = false,start = null) {
        let node;
        if (start != null) node = start;
        if (start == null) node = reverse ? this.#pointers.end : this.#pointers.start;
        while (node) {
            if (callback(node)) return node;
            node = reverse ? node.previous : node.next;
        }
        return null
    }

    /**
     * Returns a new linked list composed only of the nodes for which the `callback` returns true.
     * @param {NodeSignal} callback Callback for filtering of the linked list.
     * @returns {LinkedList} The filtered linked list.
    */
    filter(callback) {
        const node = this.#pointers.start;
        const newLinkedList = new LinkedList();
        while (node) {
            if (callback(node)) newLinkedList.addToEnd(node.value);
            node = node.next;
        }
        return newLinkedList
    }

    /**
     * Returns a new linked list composed of the nodes with values returned by the `callback`.
     * @param {NodeSignal} callback Callback for mapping of the linked list.
     * @returns {LinkedList} The mapped linked list.
    */
    map(callback) {
        const node = this.#pointers.start;
        const newLinkedList = new LinkedList();
        while (node) {
            newLinkedList.addToEnd(callback(node));
            node = node.next;
        }
        return newLinkedList
    }

    /**
     * Slices the linked list by 2 nodes.
     * @param {LinkedListNode} start New start node of the linked listed.
     * @param {LinkedListNode} end New end node of the linked list.
    */
    slice(start,end) {
        this.#pointers.start = start;
        start.previous = null;
        this.#pointers.end = end;
        end.next = null;
    }

    #pointers = {
        start: null,
        end: null,
        length: 0
    }
}

class LinkedListNode {
    /**
     * Creates a new relative linked list node.
     * @param {any} value `value` property of the node.
     * @param {?object} next Pointer `next` of the node.
     * @param {?object} previous Pointer `previous` of the node.
     * @param {object} listPointers Pointer object of the linked list the node belongs to.
     */
    constructor(value,next,previous,listPointers) {
        this.value = value;
        this.#listPointers = listPointers;

        if (next) {
            this.next = next;
            next.previous = this;
        }
        if (previous) {
            this.previous = previous;
            previous.next = this;
        }
        if (!next) {
            this.#listPointers.end = this;
        }
        if (!previous) {
            this.#listPointers.start = this;
        }
        this.#listPointers.length++;
    }

    /**
     * Deletes this node from its linked list.
     */
    delete() {
        if (this.next) {
            this.next.previous = this.previous;
        }
        if (this.previous) {
            this.previous.next = this.next;
        }
        if (!this.next) {
            this.#listPointers.end = this.previous;
        }
        if (!this.previous) {
            this.#listPointers.start = this.next;
        }
        this.#listPointers.length--;
    }

    //This can be shorter, ik it's just inverted, can refactor later!
    /**
     * Moves the node in its linked list by the specified amount of nodes or until it hits an edge of the list.
     * @param {number} direction Sets the amount of steps the node should move by. Positive values mean direction towards the end, negative values towards the start.
     */
    move(direction) {
        for (let step = Math.abs(direction);step > 0;step--) {
            if (direction > 0) {
                if (this.next == null) return
                const newNext = this.next.next;
                const newPrevious = this.next;
                if (this.next.next) {
                    this.next.next.previous = this;
                } else {
                    this.#listPointers.end = this;
                }
                this.next.previous = this.previous;
                this.next.next = this;
                if (this.previous) {
                    this.previous.next = this.next;
                } else {
                    this.#listPointers.start = newPrevious;
                }
                this.previous = newPrevious;
                this.next = newNext;
            }
            if (direction < 0) {
                if (this.previous == null) return
                const newPrevious = this.previous.previous;
                const newNext = this.previous;
                if (this.previous.previous) {
                    this.previous.previous.next = this;
                } else {
                    this.#listPointers.start = this;
                }
                this.previous.next = this.next;
                this.previous.previous = this;
                if (this.next) {
                    this.next.previous = this.previous;
                } else {
                    this.#listPointers.end = newNext;
                }
                this.next = newNext;
                this.previous = newPrevious;
            }
        }
    }

    next = null;
    previous = null;
    value;

    #listPointers = null;
}