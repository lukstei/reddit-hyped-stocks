import { useEffect } from "react";
import { LinearProgress, Paper } from "@material-ui/core";

export default function ({loading, error, value, children}) {
    useEffect(() => {
        if (error) {
            console.log(error);
        }
    }, [error]);

    if (error) {
        return "Error: " + error.message;
    } else if (loading) {
        return <Paper variant="outlined" style={{width: '100%', margin: "0.5em 0"}}><LinearProgress style={{margin: "1em"}} /></Paper>;
    } else {
        if (typeof children === 'function') {
            return children(value);
        } else {
            return <>{children}</>;
        }
    }
}