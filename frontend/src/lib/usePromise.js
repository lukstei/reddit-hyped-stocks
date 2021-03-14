import React from 'react';
import { useCallback } from 'react';

/**
 * The usePromise hook calls the function `f` and subscribes to the returned promise.
 *
 * Following values are returned in an object:
 *
 * `result`: the result of the promised passed to the resolve function, or `undefined` if it was not yet resolved.
 * `error`: the error of the promise passed to the reject function, or `undefined` if it was not yet rejected.
 * `isLoading`: true when neither the `resolve` nor the `reject` function has been called on the promise, i.e. it is in loading state.
 *
 * Example usage:
 *
 * const TestComponent = () => {
 *  const myPromiseFunction = () => Promise.resolve(123);
 *  const {result, error, isLoading} = usePromise(myPromiseFunction);
 *
 *  return <>
 *    {isLoading && <p>Loading...</p>}
 *    {result && <div>{result}</div>}
 *  </>;
 * }
 *
 * @param f the function which returns the promise to subscribe to
 * @param deps the dependencies of the function, works like the useEffect hook dependency parameter,
 *             EXCEPT when nothing (`undefined`) is passed, the function is only called once
 * @param defaultValue default value to return when promise is still loading
 */
export const usePromise = (
    f,
    deps,
    defaultValue,
) => {
    return _usePromise(f, deps, defaultValue, true);
};

/**
 * The usePromiseOnCallback hook calls the function `f` and subscribes to the returned promise, when the callback function is called.
 *
 * Following values are returned in an object:
 *
 * `result`: the result of the promised passed to the resolve function, or `undefined` if it was not yet resolved.
 * `error`: the error of the promise passed to the reject function, or `undefined` if it was not yet rejected.
 * `isLoading`: true when neither the `resolve` nor the `reject` function has been called on the promise, i.e. it is in loading state.
 * `doCall`: when this function is called the `f` function is called and the returned promise is subscribed to
 *
 * Example usage:
 *
 * const TestComponent = () => {
 *  const myPromiseFunction = () => Promise.resolve(123);
 *  const {result, error, isLoading, doCall} = usePromiseOnCallback(myPromiseFunction);
 *
 *  return <>
 *    <button onClick={doCall}>Do Call</button>
 *    {result && <div>{result}</div>}
 *  </>;
 * }
 *
 * @param f the function which returns the promise to subscribe to
 * @param deps the dependencies of the function, works like the useEffect hook dependency parameter,
 *             EXCEPT when nothing (`undefined`) is passed, the function is only called once
 * @param defaultValue default value to return when promise is still loading
 */
export const usePromiseOnCallback = (
    f,
    deps,
    defaultValue,
) => {
    const [counter, setCounter] = React.useState(0);
    const [args, setArgs] = React.useState();

    const x = _usePromise(() => f(args), [counter, ...(deps || [])], defaultValue, counter > 0);

    const cb = useCallback((a) => {
        setArgs(a);
        setCounter(c => c + 1);
    }, []);
    return counter > 0
        ? ({...x, callback: cb})
        : {value: undefined, error: undefined, loading: false, callback: cb};
};

const _usePromise = (
    f,
    deps,
    defaultValue,
    shouldFire = true,
) => {
    const [state, setState] = React.useState({
        value: defaultValue,
        isLoading: true,
    });

    React.useEffect(() => {
        let isSubscribed = true;

        if (shouldFire && isSubscribed) {
            setState({ value, isLoading: true });
            const promise = f();

            promise.then(
                value => {
                    if (isSubscribed) {
                        setState({ value, isLoading: false });
                    }
                },
                error => {
                    if (isSubscribed) {
                        setState({ error, isLoading: false });
                    }
                },
            );
        }

        return () => {
            isSubscribed = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...(deps || []), shouldFire]);

    const { value, error, isLoading } = state;
    return {value, error, loading: isLoading};
};
