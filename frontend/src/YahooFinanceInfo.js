import React from 'react';
import Loading from "./components/Loading";
import { formatPrice, useBackend } from "./index";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { CartesianGrid, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts";
import moment from "moment";
import { dfToObjectArray } from "./TickerScores";
import { useSettings } from "./lib/useSettings";
import { Button, ButtonGroup, Chip } from "@material-ui/core";

function TickerClassificationInfo({classification, yfInfo}) {
    return <Chip
        label={`Classified ${classification.classification} (${moment(classification.date).local().calendar()} @ ${formatPrice(classification.price)})`}/>
}

export default function ({ticker, chartData: scoreChartData}) {
    const r = useBackend(`/yahoo/${ticker}`);
    const infos = ["averageVolume10days", "enterpriseToEbitda", "enterpriseToRevenue", "enterpriseValue", "forwardPE", "forwardEps", "fullTimeEmployees", "heldPercentInsiders", "heldPercentInstitutions", "industry", "longName", "priceToBook", "shortRatio", "website"];
    const [tickerClassifications, setTickerClassifications] = useSettings("tickerClassifications", {});
    const [blacklist, setBlacklist] = useSettings("blacklist", []);

    function classify(w) {
        setTickerClassifications(c => ({
            ...c,
            [ticker]: w === 'neutral' ? undefined : {
                classification: w,
                price: r.value.historyWeek.values.Close[r.value.historyWeek.values.Close.length - 1],
                date: +new Date()
            }
        }))
    }


    return <Loading {...r}>{r => {
        console.log(r);

        const prepare = d => dfToObjectArray(d, true).map(x => {
            x["VolumePct"] = x.Volume / r.info.sharesOutstanding;
            return x;
        });

        const weekChartData = prepare(r.historyWeek);
        const monthChartData = prepare(r.historyMonth)

        const weekDomain = [(new Date() - 86400 * 1000 * 7), +new Date()];
        return <>
            <Grid item xs={12}>
                <Paper style={{padding: "1em"}}>
                    <h2 style={{display: "inline-block", marginTop: 0, marginRight: "1em"}}>{r.info.longName} (<a
                        href={`https://finance.yahoo.com/quote/${ticker}`}
                        target="_blank">{ticker}</a>)</h2>
                    {tickerClassifications[ticker] &&
                    <TickerClassificationInfo classification={tickerClassifications[ticker]} yfInfo={r}/>}
                    <ButtonGroup style={{float: "right"}} size="small" aria-label="small outlined button group">
                        <Button onClick={() => classify("buy")}>Buy</Button>
                        <Button onClick={() => classify("sell")}>Sell</Button>
                        <Button onClick={() => classify("neutral")}>Neutral</Button>
                        <Button color="danger" onClick={() => setBlacklist(b => Array.from(new Set([...b, ticker])))}>Blacklist</Button>
                    </ButtonGroup>

                    <Grid container>
                        <Grid item xs={6}>

                            <p>{r.info.longBusinessSummary}</p>
                        </Grid>
                        <Grid item xs={6}>
                            <Table size="small" aria-label="a dense table">
                                <TableBody>
                                    {Object.entries(r.info).filter(([k]) => infos.indexOf(k) >= 0).map(([k, v]) => (
                                        <TableRow key={k}>
                                            <TableCell component="th" scope="row">{k}</TableCell>
                                            <TableCell>{v}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>
            <Grid item xs={12}>
                <Paper style={{padding: "1em"}}>
                    <h3 style={{marginTop: 0}}>Monthly Price / Volume</h3>
                    <ResponsiveContainer width='100%' height={300}>
                        <LineChart data={monthChartData}>
                            <Line yAxisId="left" animationDuration={0} type="monotone" dataKey={"Close"}/>
                            <Line yAxisId="right" animationDuration={0} stroke="red" type="monotone"
                                  dataKey={"VolumePct"}/>
                            <Tooltip formatter={x => Math.round(x * 100) / 100} animationDuration={10}
                                     itemSorter={(x) => -x.value}/>
                            <Legend/>
                            <CartesianGrid stroke="#ccc"/>
                            <XAxis type="number" tickFormatter={(t) => moment.utc(t).local().format('dd DD.MM.')}
                                   dataKey="idx" domain={weekDomain}
                                   scale="time"/>
                            <YAxis domain={[0, 2]} yAxisId="right" orientation="right"/>
                            <YAxis yAxisId="left" orientation="left"/>
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>
            <Grid item xs={12}>
                <Paper style={{padding: "1em"}}>
                    <h3 style={{marginTop: 0}}>Weekly Price / Hype Score</h3>
                    <ResponsiveContainer width='100%' height={200}>
                        <LineChart data={weekChartData} syncId="yf" chartName={"Test"} >
                            <Line dot={false} yAxisId="left" animationDuration={0} type="monotone" dataKey={"Close"}/>
                            <Tooltip formatter={x => Math.round(x * 100) / 100} animationDuration={10}
                                     itemSorter={(x) => -x.value}/>
                            <CartesianGrid stroke="#ccc"/>
                            <XAxis type="number" tickFormatter={(t) => moment.utc(t).local().format('dd DD.MM. HH:mm')}
                                   hide={true}
                                   dataKey="idx" domain={weekDomain}
                                   scale="time"/>
                            <YAxis domain={[0, 2]} yAxisId="right" orientation="right"/>
                            <YAxis yAxisId="left" orientation="left"/>
                        </LineChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width='100%' height={200}>
                        <LineChart data={scoreChartData} syncId="yf">
                            <Line yAxisId="left" dot={false} animationDuration={0} type="monotone" dataKey={ticker}/>
                            <Line yAxisId="right" dot={false} animationDuration={0} type="monotone" dataKey={ticker}/>
                            <CartesianGrid stroke="#ccc"/>
                            <XAxis
                                type="number" tickFormatter={(t) => moment.utc(t).local().format('dd DD.MM. HH:mm')}
                                dataKey="idx"
                                domain={weekDomain}
                                scale="time"/>
                            <YAxis yAxisId="right" orientation="right"/>
                            <YAxis yAxisId="left" orientation="left"/>
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>
        </>;
    }}</Loading>;
    }