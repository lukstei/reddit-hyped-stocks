import { useEffect, useState } from "react";
import { backendUrl } from '../index';

let listenerIdx = 1;
const listeners = {};


let saveListenerIdx = 1;
const saveListeners = {};

export function useSettingsSaveListener(f) {
    useEffect(() => {
        const idx = saveListenerIdx++;
        saveListeners[idx] = f;
        return () => delete saveListeners[idx];
    }, []);
}

export function useSettings(name, defaultValue) {
    const [settings, setSettings] = useState(defaultValue);
    useEffect(() => {
        const idx = listenerIdx++;
        listeners[idx] = (n, v) => {
            if (name === n) {
                setSettings(v);
            }
        };

        fetch(`${backendUrl}/settings/${name}`)
            .then(r => r.json())
            .then(r => {
                if (r !== null) {
                    setSettings(r);
                }
            })
            .catch(console.error);

        return () => delete listeners[idx];

    }, [name]);

    return [settings, (newSettingsF) => {
        setSettings(currentSettings => {
            const newSettings = newSettingsF(currentSettings);
            Object.values(listeners).forEach(l => l(name, newSettings));
            fetch(`${backendUrl}/settings/${name}`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: "PUT",
                body: JSON.stringify(newSettings)
            })
                .then(() => Object.values(saveListeners).forEach(f => f(name)), e => Object.values(saveListeners).forEach(f => f(null, e)));
            return newSettings;
        });
    }]
}
