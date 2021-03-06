import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import RGL, {WidthProvider} from 'react-grid-layout';

import React, {useEffect} from 'react';
import {css} from '@emotion/core';
import PuffLoader from 'react-spinners/PuffLoader';

// Material UI Components
import AppBar from '@material-ui/core/AppBar';
import {createStyles, makeStyles, Theme} from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
// Project files
import {extractOperationName, transformTimingData} from '../utils/helper';
import getMaxEventTime from '../utils/performanceMetricsCalcs';
import progressBarStyle from './progressBar';
import TracingDetails from './TracingDetails';

// React Grid Function
const ReactGridLayout = WidthProvider(RGL);

interface IPerformanceData {
  networkEvents: any;
  isDraggable: boolean;
  isResizable: boolean;
  items: number;
  rowHeight: number;
  // onLayoutChange: function () {},
  cols: number;
  verticalCompact: boolean;
  resizeHandles: Array<string>;
  compactType: string;
  preventCollision: boolean;
  autoSize: boolean;
  margin: [number, number];
}

interface ITimings {
  duration: any;
  endTime?: any;
  key?: any;
  startTime?: any;
  resolvers?: {[num: number]: any};
  traceInfo: string;
}

// create event progress bar
const BorderLinearProgress = progressBarStyle('#1876D2');

// for the react-spinner
const override = css`
  display: block;
  margin: 0 auto;
  border-color: red;
`;

// setup component class hook
const useStyles: any = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    itemCSS: {
      flexGrow: 1,
    },
    paper: {
      padding: theme.spacing(0),
      textAlign: 'center',
      color: theme.palette.text.primary,
    },
    titles: {
      textAlign: 'center',
      marginTop: '2px',
      marginBottom: '2px',
    },
    grid: {
      'overflow-x': 'hidden',
      'overflow-y': 'auto',
      border: '1px solid lightgrey',
      borderRadius: '5px',
    },
  }),
);

const Performance = ({
  networkEvents,
  isDraggable,
  isResizable,
  items,
  rowHeight,
  cols,
  verticalCompact,
  resizeHandles,
  compactType,
  preventCollision,
  autoSize,
  margin,
}: IPerformanceData) => {
  const componentClass = useStyles();
  const [selectedIndex, setSelectedIndex] = React.useState(() => 0);
  const [isAnEventSelected, setIsAnEventSelected] = React.useState(false);
  const [maxEventTime, setMaxEventTime] = React.useState(
    getMaxEventTime(networkEvents),
  );
  const [tracingInfo, setTracingInfo] = React.useState(
    (): ITimings => ({
      duration: '',
      resolvers: {},
      traceInfo: '',
    }),
  );

  // layout is an array of objects
  const layoutArray = [
    {i: '1', x: 0, y: 0, w: 3, h: 22},
    {i: '2', x: 3, y: 0, w: 9, h: 22},
  ];

  useEffect(() => {
    console.log('events', networkEvents);
    setMaxEventTime(getMaxEventTime(networkEvents));
  }, [networkEvents]);

  const handleListItemClick = (event: any, index: number, key: string) => {
    if (networkEvents[key]) {
      const payload = networkEvents[key];
      if (payload && payload.response && payload.response.content) {
        // first level safety check

        // using destructured assignment
        const {
          response: {content},
        } = payload;
        if (!(content && content.extensions && content.extensions.tracing)) {
          // let use know they need to activate Tracing Data when ApolloServer was instantiated on their server
          // payload.time
          // setTimingsInfo({duration: payload.time})
          setTracingInfo({
            duration: payload.time,
            resolvers: {},
            traceInfo:
              'Please enabled tracing and cache in your Apollo Server initialization to show further network/tracing visualization',
          });
        } else {
          // const {duration, endTime, startTime} = payload.extensions.tracing;
          // extract from content using destructured assignment construct
          const {
            extensions: {
              tracing: {
                duration,
                endTime,
                startTime,
                execution: {resolvers},
              },
            },
          } = content;
          // need to transform resolvers in Array
          const tracingData = {
            key,
            duration,
            endTime,
            startTime,
            resolvers: transformTimingData(resolvers, duration),
            traceInfo: '',
          };

          // need to transform resolvers in Array
          // TODO: Transform resolvers ordering by startOffset and hopeful format to show in the details list on a waterfall model

          tracingData.traceInfo =
            Object.keys(tracingData.resolvers).length === 0
              ? 'There is no tracing info available for this operation'
              : '';
          // this should be sent to the hook - tracingData
          console.log('Tracing Data :: ', tracingData);

          setTracingInfo(tracingData);
        }
      }
    }
    setIsAnEventSelected(true);
    setSelectedIndex(index);
  };

  return (
    <ReactGridLayout
      className="layout"
      layout={layoutArray}
      // onLayoutChange={onLayoutChange}
      isDraggable={isDraggable}
      isResizable={isResizable}
      items={items}
      rowHeight={rowHeight}
      cols={cols}
      verticalCompact={verticalCompact}
      resizeHandles={resizeHandles}
      compactType={compactType}
      preventCollision={preventCollision}
      autoSize={autoSize}
      margin={margin}>
      {/* generateDOM() */}
      <div
        className={componentClass.grid}
        key={1}
        data-grid={{i: '1', x: 0, y: 0, w: 2, h: 22}}>
        {/* <h1 className={componentClass.titles}>Network Events</h1> */}
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="subtitle2"
              className={componentClass.titles}
              color="inherit">
              Network Events
            </Typography>
          </Toolbar>
        </AppBar>
        <List component="nav" aria-label="main mailbox folders" dense>
          {Object.entries(networkEvents)
            .filter(([, obj]: any) => obj && (obj.response || obj.request))
            .map(([key, obj]: any, k: number) => {
              const newobj = {
                operation:
                  obj &&
                  obj.request &&
                  obj.request.operation &&
                  obj.request.operation.operationName
                    ? obj.request.operation.operationName
                    : extractOperationName(obj),
                time: obj.time,
              };

              return (
                <div key={`div-operation${key}`}>
                  <ListItem
                    key={`operation${key}`}
                    className={`${componentClass.itemCSS}`}
                    selected={selectedIndex === k}
                    onClick={event => handleListItemClick(event, k, key)}>
                    <ListItemText
                      primary={`${newobj.operation} ${Math.floor(
                        newobj.time,
                      )} ms`}
                    />
                  </ListItem>
                  <BorderLinearProgress
                    variant="determinate"
                    value={(newobj.time / maxEventTime) * 100}
                  />
                </div>
              );
            })}
          <PuffLoader css={override} size={60} color="#123abc" loading />
          <ListItemText
            style={{textAlign: 'center'}}
            primary="Listening for events"
          />
        </List>
      </div>

      <div
        className={componentClass.grid}
        key={2}
        data-grid={{i: '2', x: 2, y: 0, w: 10, h: 22}}>
        {/* <h1 className={componentClass.titles}>Resolver Times</h1> */}
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="subtitle2"
              className={componentClass.titles}
              color="inherit">
              Resolver Times
            </Typography>
          </Toolbar>
        </AppBar>
        <TracingDetails
          tracing={tracingInfo}
          eventSelected={isAnEventSelected}
        />
      </div>
    </ReactGridLayout>
  );
};

Performance.defaultProps = {
  isDraggable: true,
  isResizable: true,
  items: 2,

  rowHeight: 22,

  cols: 12,
  verticalCompact: true,
  resizeHandles: ['e', 'ne', 'se'],
  autoSize: true,
  compactType: 'vertical',
  preventCollision: false,
  margin: [10, 10],
};

export default Performance;
