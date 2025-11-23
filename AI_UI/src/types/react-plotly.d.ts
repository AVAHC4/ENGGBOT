declare module 'react-plotly.js' {
    import * as React from 'react';
    import { Layout, Data, Config } from 'plotly.js';

    export interface PlotParams {
        data: Data[];
        layout?: Partial<Layout>;
        config?: Partial<Config>;
        frames?: any[];
        revision?: number;
        onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
        onPurge?: (figure: any, graphDiv: HTMLElement) => void;
        onError?: (err: any) => void;
        onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
        debug?: boolean;
        style?: React.CSSProperties;
        className?: string;
        useResizeHandler?: boolean;
    }

    export default class Plot extends React.Component<PlotParams> { }
}
