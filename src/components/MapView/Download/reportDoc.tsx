import React from 'react';
import {
  Page,
  Document,
  StyleSheet,
  View,
  Text,
  Image,
} from '@react-pdf/renderer';
import { Theme } from '@material-ui/core';
import { chunk } from 'lodash';
import { Style } from '@react-pdf/types';
import {
  TableData,
  TableRowType,
} from '../../../context/analysisResultStateSlice';
import { getLegendItemLabel, ReportType } from '../utils';
import { LegendDefinition } from '../../../config/types';
import { getTableCellVal, TFunction } from '../../../utils/data-utils';

// This numbers depends on table header and row height
const MAX_TABLE_ROWS_PER_PAGE = 29;
const FIRST_PAGE_TABLE_ROWS = 9;

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#FFF',
      paddingBottom: 25,
      paddingTop: '1vh',
      fontFamily: 'Roboto',
    },
    section: {
      width: '96vw',
      marginLeft: '2vw',
      marginRight: '2vw',
      marginBottom: 10,
    },
    title: {
      fontSize: theme.pdf?.fontSizes.large,
      fontWeight: 500,
    },
    subText: {
      fontSize: theme.pdf?.fontSizes.medium,
    },
    mapImage: {
      width: '100%',
      maxHeight: 284,
    },
    legendsContainer: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      backgroundColor: theme.pdf?.legendsBackgroundColor,
    },
    legend: {
      height: 130,
      display: 'flex',
      flexDirection: 'column',
      marginRight: 10,
      padding: 10,
    },
    legendTittle: {
      fontSize: theme.pdf?.fontSizes.large,
      paddingBottom: 10,
      fontWeight: 500,
    },
    legendContentsWrapper: {
      display: 'flex',
      flexDirection: 'column',
      flexWrap: 'wrap',
      height: '100%',
    },
    legendContent: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      fontSize: theme.pdf?.fontSizes.large,
      paddingTop: 5,
      paddingRight: 5,
    },
    legendText: {
      paddingLeft: 10,
    },
    dash: {
      width: 16,
      height: 2,
    },
    borderedBox: {
      width: 12,
      height: 12,
      border: 2,
      borderRadius: 3,
    },
    box: {
      width: 10,
      height: 10,
    },
    tableName: {
      padding: 6,
      fontWeight: 500,
    },
    tableCell: {
      padding: 8,
      fontSize: theme.pdf?.fontSizes.medium,
    },
    tableRow: {
      display: 'flex',
      flexDirection: 'row',
      lineHeight: 1,
    },
    tableHead: {
      borderBottom: 1,
      borderBottomColor: theme.pdf?.table?.borderColor,
      backgroundColor: theme.pdf?.table?.darkRowColor,
      fontWeight: 500,
    },
    tableFooter: {
      borderTop: 1,
      borderTopColor: theme.pdf?.table?.borderColor,
      fontWeight: 700,
    },
    footer: {
      position: 'absolute',
      fontSize: theme.pdf?.fontSizes.medium,
      bottom: 10,
      left: 10,
      right: 0,
      textAlign: 'left',
    },
  });

interface PDFLegendDefinition {
  value: string | number;
  style: Style | Style[];
}

interface LegendProps {
  theme: Theme;
  title: string;
  definition: PDFLegendDefinition[];
}

const Legend = ({ theme, title, definition }: LegendProps) => {
  const styles = makeStyles(theme);
  return (
    <View style={styles.legend}>
      <View>
        <Text style={styles.legendTittle}>{title}</Text>
        <View style={styles.legendContentsWrapper}>
          {definition.map(item => (
            <View style={styles.legendContent}>
              <View style={item.style} />
              <Text style={[styles.legendText]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

interface TableHeadProps {
  theme: Theme;
  name: string;
  cellWidth: string;
  columns: string[];
}

const TableHead = ({ theme, name, cellWidth, columns }: TableHeadProps) => {
  const styles = makeStyles(theme);
  return (
    <View style={{ backgroundColor: theme.pdf?.table?.darkRowColor }}>
      <View>
        <Text style={styles.tableName}>{name}</Text>
      </View>
      <View style={[styles.tableHead, styles.tableRow]} wrap={false}>
        {columns.map(value => {
          return (
            <Text style={[styles.tableCell, { width: cellWidth }]}>
              {value}
            </Text>
          );
        })}
        <Text style={[styles.tableCell, { width: cellWidth }]}>Total</Text>
      </View>
    </View>
  );
};

interface TableProps {
  theme: Theme;
  name: string;
  rows: TableRowType[];
  columns: string[];
  cellWidth: string;
  showTotal: boolean;
  t: TFunction;
}

const Table = ({
  theme,
  name,
  rows,
  columns,
  cellWidth,
  showTotal,
  t,
}: TableProps) => {
  const styles = makeStyles(theme);

  const totals = showTotal
    ? columns.reduce<number[]>((colPrev, colCurr) => {
        const rowTotal = rows.reduce((rowPrev, rowCurr) => {
          const val = Number(rowCurr[colCurr]);
          if (!Number.isNaN(val)) {
            return rowPrev + val;
          }
          return rowPrev;
        }, 0);
        return [...colPrev, rowTotal];
      }, [])
    : [];

  const firstPageChunk = rows.slice(0, FIRST_PAGE_TABLE_ROWS);
  const restPagesChunks = chunk(
    rows.slice(FIRST_PAGE_TABLE_ROWS),
    MAX_TABLE_ROWS_PER_PAGE,
  );
  const chunks = [firstPageChunk, ...restPagesChunks];

  return (
    <>
      {chunks.map(chunkRow => {
        return (
          <View wrap={false}>
            <TableHead
              theme={theme}
              name={name}
              cellWidth={cellWidth}
              columns={columns}
            />
            {chunkRow.map((rowData, index) => {
              const color =
                index % 2
                  ? theme.pdf?.table?.darkRowColor
                  : theme.pdf?.table?.lightRowColor;
              const total = columns.reduce((prev, curr) => {
                const val = rowData[curr as keyof typeof rowData];
                if (!Number.isNaN(Number(val))) {
                  return prev + Number(val);
                }
                return prev;
              }, 0);
              return (
                <View
                  style={[styles.tableRow, { backgroundColor: color }]}
                  wrap={false}
                >
                  {columns.map(col => (
                    <Text style={[styles.tableCell, { width: cellWidth }]}>
                      {getTableCellVal(rowData, col, t)}
                    </Text>
                  ))}
                  <Text style={[styles.tableCell, { width: cellWidth }]}>
                    {Number(total).toLocaleString('en-US')}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}

      {showTotal && (
        <View
          wrap={false}
          style={[
            styles.tableRow,
            styles.tableFooter,
            {
              backgroundColor:
                rows.length % 2
                  ? theme.pdf?.table?.darkRowColor
                  : theme.pdf?.table?.lightRowColor,
            },
          ]}
        >
          {totals.map((val, index) => {
            if (index === 0) {
              return (
                <Text style={[styles.tableCell, { width: cellWidth }]}>
                  Total
                </Text>
              );
            }
            return (
              <Text style={[styles.tableCell, { width: cellWidth }]}>
                {val}
              </Text>
            );
          })}
          <Text style={[styles.tableCell, { width: cellWidth }]}>
            {totals.reduce((prev, cur) => {
              return prev + cur;
            }, 0)}
          </Text>
        </View>
      )}
    </>
  );
};

const ReportDoc = ({
  theme,
  reportType,
  mapImage,
  tableData,
  tableName,
  tableRowsNum,
  tableShowTotal,
  eventName,
  sortByKey,
  exposureLegendDefinition,
  t,
}: ReportDocProps) => {
  if (mapImage === null) {
    return <></>;
  }
  const styles = makeStyles(theme);
  const date = new Date().toUTCString();
  const tableCellWidth = `${100 / (tableData.columns.length + 1)}%`;

  const tableRows = tableData.rows.slice(1);
  const sortedTableRows =
    sortByKey !== undefined
      ? // eslint-disable-next-line fp/no-mutating-methods
        tableRows.sort((a, b) => {
          if (a[sortByKey] > b[sortByKey] || Number.isNaN(b[sortByKey])) {
            return -1;
          }
          if (a[sortByKey] < b[sortByKey] || Number.isNaN(a[sortByKey])) {
            return 1;
          }
          return 0;
        })
      : tableRows;
  const trimmedTableRows =
    tableRowsNum !== undefined
      ? sortedTableRows.slice(0, tableRowsNum - (tableShowTotal ? 1 : 0))
      : sortedTableRows;

  const areasLegendDefinition: PDFLegendDefinition[] = [
    {
      value: 'Province',
      style: [styles.dash, { backgroundColor: '#000000' }],
    },
    {
      value: 'District',
      style: [styles.dash, { backgroundColor: '#999797' }],
    },
    {
      value: 'Township',
      style: [styles.dash, { backgroundColor: '#D8D6D6' }],
    },
  ];

  const stormWindBuffersLegendDefinition: PDFLegendDefinition[] = [
    {
      value: 'Uncertainty Cones',
      style: [
        styles.borderedBox,
        { backgroundColor: '#ffffff', borderColor: '#b8b1b1' },
      ],
    },
    {
      value: 'Wind Buffer 60 km/h',
      style: [
        styles.borderedBox,
        { backgroundColor: '#fffcf1', borderColor: '#f7e705' },
      ],
    },
    {
      value: 'Wind Buffer 90 km/h',
      style: [
        styles.borderedBox,
        { backgroundColor: '#ffeed8', borderColor: '#f99408' },
      ],
    },
    {
      value: 'Wind Buffer 120 km/h',
      style: [
        styles.borderedBox,
        { backgroundColor: '#fcd4ce', borderColor: '#f90c08' },
      ],
    },
  ];

  const floodsLegendDefinition: PDFLegendDefinition[] = [
    {
      value: 'flooded',
      style: [styles.box, { backgroundColor: '#a50f15' }],
    },
  ];

  const populationExposureLegendDefinition: PDFLegendDefinition[] = exposureLegendDefinition.map(
    item => ({
      value: getLegendItemLabel(item),
      style: [styles.box, { backgroundColor: item.color, opacity: 0.5 }],
    }),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.section]}>
          <Text style={styles.title}>Event name: {eventName}</Text>
          <Text style={styles.title}>Publication date: {date}</Text>
          <Text style={styles.subText}>
            This is an automated report.
            <Text> Information should be treated as preliminary</Text>
          </Text>
        </View>
        <View style={styles.section}>
          <Image src={mapImage} style={styles.mapImage} />
        </View>
        <View style={[styles.legendsContainer, styles.section]}>
          <Legend
            theme={theme}
            title="Areas"
            definition={areasLegendDefinition}
          />
          {reportType === ReportType.Storm ? (
            <Legend
              title="Tropical Storms - Wind buffers"
              definition={stormWindBuffersLegendDefinition}
              theme={theme}
            />
          ) : (
            <Legend
              title="Potential Flooding"
              definition={floodsLegendDefinition}
              theme={theme}
            />
          )}
          <Legend
            title="Population Exposure"
            definition={populationExposureLegendDefinition}
            theme={theme}
          />
        </View>
        <View style={styles.section}>
          <Text style={{ fontSize: theme.pdf?.fontSizes.small }}>
            Sources WFP, UNGIWG, OCHA, GAUL, USGS, NASA, UCSB
          </Text>
          <Text
            style={{
              fontSize: theme.pdf?.fontSizes.extraSmall,
              color: theme.pdf?.secondaryTextColor,
            }}
          >
            The designations employed and the presentation of material in the
            map(s) do not imply the expression of any opinion on the part of WFP
            concerning the legal or constitutional status of any country,
            territory, city or sea, or concerning the delimitation of its
            frontiers or boundaries.
          </Text>
        </View>
        <View style={[styles.section]}>
          <Table
            theme={theme}
            name={tableName}
            rows={trimmedTableRows}
            columns={tableData.columns}
            cellWidth={tableCellWidth}
            showTotal={tableShowTotal}
            t={t}
          />
        </View>
        <Text fixed style={styles.footer}>
          P R I S M automated report
        </Text>
      </Page>
    </Document>
  );
};

interface ReportDocProps {
  theme: Theme;
  reportType: ReportType;
  mapImage: string | null;
  tableData: TableData;
  tableName: string;
  tableRowsNum?: number;
  tableShowTotal: boolean;
  eventName: string;
  sortByKey?: keyof TableRowType;
  exposureLegendDefinition: LegendDefinition;
  t: TFunction;
}

export default ReportDoc;
