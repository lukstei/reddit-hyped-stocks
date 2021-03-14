import React, { useState } from "react";
import { useSettingsSaveListener } from "./lib/useSettings";
import MuiAlert from "@material-ui/lab/Alert";
import { Snackbar } from "@material-ui/core";

export function SettingsSnackbar() {
    const [sbProps, setSbProps] = useState({open: false});
    useSettingsSaveListener((n, e) => {
        if (!e) {
            setSbProps({
                open: true,
                children: <MuiAlert elevation={6} variant="filled" severity="success">Saved</MuiAlert>
            })
        } else {
            setSbProps({
                open: true,
                children: <MuiAlert elevation={6} variant="filled" severity="error">Error saving!</MuiAlert>
            })
        }
    });

    return <Snackbar
        {...sbProps}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={2000}
        onClose={() => setSbProps({open: false})}
    />;
}