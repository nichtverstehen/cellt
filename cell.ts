// https://github.com/fynyky/reactor.js
// https://github.com/arnelenero/simpler-state
// https://github.com/ds300/derivablejs/blob/master/src/atom.js

type ValueCallback<T> = (value: ValueOrError<T>|undefined) => void;
type Unsubscribe = () => void;
type Process<T> = (next: ValueCallback<T>) => Unsubscribe;

class Cell<T> {
    constructor(process: Process<T>) {
        this.#process = process;
    }

    current(): ValueOrError<T>|undefined {
        return this.#current;
    }

    next(): Promise<T> {
        return new Promise((resolve, reject) => {
            const cancel = this.subscribe(valueOrError => {
                if (valueOrError == undefined) {
                    // still waiting for a defined value.
                    return
                }
                cancel();
                if (valueOrError.error != undefined) {
                    reject(valueOrError.error);
                } else {
                    resolve(valueOrError.value);
                }
            });
        });
    }

    subscribe (sub: ValueCallback<T>): Unsubscribe {
        this.#subscribers.push(sub);
        if (this.#subscribers.length === 1) {
            this.#activate();
        }
        return () => {
            const i = this.#subscribers.indexOf(sub);
            if (i >= 0) this.#subscribers.splice(i, 1);
            if (this.#subscribers.length === 0) {
                this.#deactivate();
            }
        }
    }


    #activate () {
        console.assert(this.#cancel == null);
        this.#cancel = this.#process(this.#onValue);
    }

    #deactivate () {
        console.assert(this.#cancel != null);
        this.#cancel();
        this.#cancel = null;
    }

    #onValue: ValueCallback<T> = (value) => {
        this.#current = value;
        for (const sub of this.#subscribers) {
            sub(value)
        }
    }

    #process: Process<T>;
    #cancel: Unsubscribe;
    #subscribers: ValueCallback<T>[] = [];
    #current: ValueOrError<T>|undefined;
}

class ValueOrError<T> {
  constructor (value: T, error: any) {
    this.value = value
    this.error = error
  }

  getOrThrow() {
    if (this.error !== undefined) {
      throw this.error
    }
    return this.value
  }

  value: T
  error: any
}


function skipOne<T> (callback: ValueCallback<T>): [ValueCallback<T>, Promise<T>] {
    const completer = new Completer<T>()
    let resolved = false
    const reactor = (v: ValueOrError<T>): void => {
      if (resolved) callback(v)
      else {
        resolved = true
        if (v.error !== undefined) completer.reject(v.error)
        else completer.resolve(v.value)
      }
    }
    return [reactor, completer.promise]
  }


type Use<V> = (cell: Cell<V>) => Promise<V>
type Computation<V> = (use: Use<V>) => Promise<V>

export class Calculator<T> {
    constructor (computation: Computation<T>, callback: ValueCallback<T>) {
        this.#callback = callback
        this.#computation = computation
    }

    calculate (): void {
        const oldDeps = this.cancel();
        this.#callback(undefined);
        const deps = [];
        const use = <D>(cell: Cell<D>): Promise<D> => {
            this.newDeps.add(cell)
            if (this.deps.has(cell)) {
            return cell.get()
            } else {
            const [sub, v] = skipOne<V>(this.ping.bind(this))
            const unsub = cell.subscribe(sub)
            this.unsub.set(cell, unsub)
            return v
        }
            return cell.next();
        }
        const resultPromise = this.#computation(use);
    }

    cancel(): void {

    }

    deactivate (): void {
        for (const dep of this.deps) {
        const unsub = this.unsub.get(dep)
        console.assert(unsub !== undefined)
    }

    invalidate (): void {
        this.dirty = true
        if (!this.calculating) {
        this.calculate()
        }
    }

    #callback: ValueCallback<T>;
    #computation: Computation<T>;
    #deps: Dep<?>[];
}

interface Dep<D> {
    cell: Cell<D>;
    dispose: Unsubscribe;
    callback: ValueCallback<D>;
}
