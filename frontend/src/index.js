import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from "./Dashboard";
import { usePromise } from "./lib/usePromise";
import "./index.css";

export const backendUrl = "http://localhost:5000";


export function formatPrice(num, opts = {}) {
    const o = {
        ...{signs: 2, currency: "$"},
        ...opts
    }
    return "" + Math.round(num * 100) / 100 + o.currency;
}

export function useBackend(path, init) {
    return usePromise(async () => {
        const response = await fetch(`${backendUrl}${path}`, init);
        return await response.json();
    }, [path, init]);
}

ReactDOM.render(
    <React.StrictMode>
        <Dashboard/>
    </React.StrictMode>,
    document.getElementById('root')
);
