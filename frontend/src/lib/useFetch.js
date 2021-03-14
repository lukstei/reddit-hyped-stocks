import { usePromise } from "./usePromise";

export function useFetch(input, init) {
    return usePromise(async () => {
        return await fetch(input, init);
    });
}
