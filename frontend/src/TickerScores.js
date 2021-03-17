import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Loading from "./components/Loading";
import { useBackend } from "./index";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { CartesianGrid, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts";
import * as d3 from "d3";
import moment from "moment";
import YahooFinanceInfo from "./YahooFinanceInfo";
import { useSettings } from "./lib/useSettings";

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    }
}));

export function dfToObjectArray(data, convertDateIdx=false) {
    return data.idx.map((idx, i) => {
        const o = {
            idx: convertDateIdx ? +moment.utc(idx).toDate() : idx
        };
        Object.keys(data.values).forEach(k => {
            o[k] = data.values[k][i];
        })
        return o;
    });
}

export default function () {
    const classes = useStyles();

    const r = useBackend("/scores");
    const [selectedTicker, setSelectedTicker] = useState();
    const [tickerClassifications, setTickerClassifications] = useSettings("tickerClassifications", {});


    const generateArrows = (delta) => {
        function c(delta) {
            if(delta >= 5) return "uu";
            if(delta > 0) return "u";
            if(delta <= -5) return "dd";
            if(delta < 0) return "d";
            return "=";
        }
        return c(delta).split("").map(s => {
            if(s === "u") return <span className="arrow up"/>;
            if(s === "d") return <span className="arrow down"/>;
            if(s === "=") return <span>=</span>;
        })
    }

    return <div className={classes}>
        <Loading {...r}>{r => {
            console.log(r);

            const color = d3.scaleOrdinal(d3.schemeCategory10);
            const chartData = dfToObjectArray(r.tickerScoreSum, true);

            const inList = new Set(r.tickerScoreSummary.idx);
            const inSettings = new Set(Object.keys(tickerClassifications));
            const lostTickers = [...inSettings].filter(s => !inList.has(s))

            console.log(chartData);

            const formatScore = d => Math.round(d).toString().padStart(3, "0");


            return <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Paper style={{padding: "1em"}}>
                        <ResponsiveContainer width='100%' height={300}>
                            <LineChart data={chartData}>
                                {Object.keys(r.tickerScoreRel.values).map(k =>
                                    <Line dot={false} key={k} animationDuration={0} type="monotone" dataKey={k} stroke={color(k)}/>)
                                }
                                <Tooltip itemStyle={{padding: 0}} formatter={x => Math.round(x)}
                                         animationDuration={10}
                                         itemSorter={(x) => -x.value}
                                         labelFormatter={l => moment(l).local().format('l')}/>
                                <Legend/>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(t) => moment(t).local().format('l')}
                                       dataKey="idx"
                                       domain={[]}
                                       scale="time"
                                />
                                <YAxis/>
                                <Brush  />

                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={3}>
                    <TableContainer component={Paper}>
                        <Table className={classes.table} size="small" aria-label="a dense table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ticker</TableCell>
                                    <TableCell align="right">Score Abs /Δ7d/Δ3d/Δ1d</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dfToObjectArray(r.tickerScoreSummary).sort((x1, x2) => x2.cumsum3d - x1.cumsum3d).map((x, i) => (
                                    <TableRow key={x.idx} className={`ticker-${tickerClassifications[x.idx]?.classification||'unknown'}`}>
                                        <TableCell component="th" scope="row">
                                            {generateArrows(x.positionDelta.positionDelta)} <a href="#" onClick={() => setSelectedTicker(x.idx)}>{x.idx}</a> ({x.positionDelta.positionDelta})
                                        </TableCell>
                                        <TableCell align="right">{formatScore(x.absolute)}/{formatScore(x.cumsum7d)}/{formatScore(x.cumsum3d)}/{formatScore(x.cumsum1d)}</TableCell>
                                    </TableRow>
                                ))}
                                {lostTickers.map(t => <TableRow key={t} className={`ticker-lost`}>
                                    <TableCell component="th" scope="row">{t}</TableCell>
                                    <TableCell align="right">?</TableCell>
                                </TableRow>)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                <Grid item xs={9}>
                    <Grid container spacing={2}>
                        {selectedTicker && <YahooFinanceInfo ticker={selectedTicker} chartData={chartData}/>}

                        <Grid item>
                            <Paper>
                                <Table className={classes.table} size="small" aria-label="a dense table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell align="right">Score</TableCell>
                                            <TableCell>Title</TableCell>
                                            <TableCell>Subreddit</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {r && selectedTicker && r.tickersPosts[selectedTicker].sort((i1, i2) => moment(r.posts[i2].date) - moment(r.posts[i1].date)).map(id => {
                                            const post = r.posts[id];
                                            return <TableRow key={id}>
                                                <TableCell>{moment.utc(post.date).local().calendar()}</TableCell>
                                                <TableCell><a href={`https://reddit.com/${id}`}
                                                              target="_blank">{Math.round(post.score)}</a> ({post.upvoteRatio})</TableCell>
                                                <TableCell><a href={`https://reddit.com/u/${post.author}`}
                                                              target="_blank">@{post.author}</a>: {post.flair ? `(${post.flair}) ` : ""}{post.title}</TableCell>
                                                <TableCell>{post.subreddit}</TableCell>
                                            </TableRow>
                                        })}
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        }}</Loading>
    </div>;
}