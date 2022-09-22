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
      fontSize: 10.78,
      fontWeight: 500,
    },
    subText: {
      fontSize: 9.24,
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
      fontSize: 10.78,
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
      fontSize: 10.78,
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
      fontSize: 9.24,
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
      fontSize: 9.24,
      bottom: 10,
      left: 10,
      right: 0,
      textAlign: 'left',
    },
  });

interface LegendProps {
  theme: Theme;
}

const AreasLegend = ({ theme }: LegendProps) => {
  const styles = makeStyles(theme);
  return (
    <View style={styles.legend}>
      <View>
        <Text style={styles.legendTittle}>Areas</Text>
      </View>
      <View style={styles.legendContentsWrapper}>
        <View style={styles.legendContent}>
          <View style={[styles.dash, { backgroundColor: '#000000' }]} />
          <Text style={[styles.legendText]}>Province</Text>
        </View>
        <View style={styles.legendContent}>
          <View style={[styles.dash, { backgroundColor: '#999797' }]} />
          <Text style={[styles.legendText]}>District</Text>
        </View>
        <View style={styles.legendContent}>
          <View style={[styles.dash, { backgroundColor: '#D8D6D6' }]} />
          <Text style={[styles.legendText]}>Township</Text>
        </View>
      </View>
    </View>
  );
};

const StormWindBuffersLegend = ({ theme }: LegendProps) => {
  const styles = makeStyles(theme);
  return (
    <View style={styles.legend}>
      <View>
        <Text style={styles.legendTittle}>Tropical Storms - Wind buffers</Text>
        <View style={styles.legendContentsWrapper}>
          <View style={styles.legendContent}>
            <View
              style={[
                styles.borderedBox,
                { backgroundColor: '#ffffff', borderColor: '#b8b1b1' },
              ]}
            />
            <Text style={[styles.legendText]}>Uncertainty Cones</Text>
          </View>
          <View style={styles.legendContent}>
            <View
              style={[
                styles.borderedBox,
                { backgroundColor: '#fffcf1', borderColor: '#f7e705' },
              ]}
            />
            <Text style={[styles.legendText]}>Wind Buffer 60 km/h</Text>
          </View>
          <View style={styles.legendContent}>
            <View
              style={[
                styles.borderedBox,
                { backgroundColor: '#ffeed8', borderColor: '#f99408' },
              ]}
            />
            <Text style={[styles.legendText]}>Wind Buffer 90 km/h</Text>
          </View>
          <View style={styles.legendContent}>
            <View
              style={[
                styles.borderedBox,
                { backgroundColor: '#fcd4ce', borderColor: '#f90c08' },
              ]}
            />
            <Text style={[styles.legendText]}>Wind Buffer 120 km/h</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const FloodsLegend = ({ theme }: LegendProps) => {
  const styles = makeStyles(theme);
  return (
    <View style={styles.legend}>
      <View>
        <Text style={styles.legendTittle}>Potential flooding</Text>
        <View style={styles.legendContentsWrapper}>
          <View style={styles.legendContent}>
            <View style={[styles.box, { backgroundColor: '#a50f15' }]} />
            <Text style={[styles.legendText]}>flooded</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

type PopulationExposureLegendProps = LegendProps & {
  exposureLegend: LegendDefinition;
};

const PopulationExposureLegend = ({
  theme,
  exposureLegend,
}: PopulationExposureLegendProps) => {
  const styles = makeStyles(theme);
  return (
    <View style={styles.legend}>
      <View>
        <Text style={styles.legendTittle}>Population Exposure</Text>
        <View style={styles.legendContentsWrapper}>
          {exposureLegend.map(item => (
            <View style={styles.legendContent}>
              <View
                style={[
                  styles.box,
                  { backgroundColor: item.color, opacity: 0.5 },
                ]}
              />
              <Text style={[styles.legendText]}>
                {getLegendItemLabel(item)}
              </Text>
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
    ? columns.reduce((colPrev, colCurr) => {
        const rowTotal = rows.reduce((rowPrev, rowCurr) => {
          const val = Number(rowCurr[colCurr as keyof typeof rowCurr]);
          if (!Number.isNaN(val)) {
            return rowPrev + val;
          }
          return rowPrev;
        }, 0);
        return [...colPrev, rowTotal];
      }, [] as number[])
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
                  {columns.map(col => {
                    const formattedColValue = getTableCellVal(rowData, col, t);
                    return (
                      <Text style={[styles.tableCell, { width: cellWidth }]}>
                        {formattedColValue}
                      </Text>
                    );
                  })}
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

const StormReportDoc = ({
  theme,
  reportType,
  mapImage,
  tableData,
  tableName,
  tableRowsNum,
  tableShowTotal,
  eventName,
  sortByKey,
  exposureLegend,
  t,
}: StormReportDocProps) => {
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
          <AreasLegend theme={theme} />
          {reportType === ReportType.Storm ? (
            <StormWindBuffersLegend theme={theme} />
          ) : (
            <FloodsLegend theme={theme} />
          )}
          <PopulationExposureLegend
            exposureLegend={exposureLegend}
            theme={theme}
          />
        </View>
        <View style={styles.section}>
          <Text style={{ fontSize: 7.7 }}>
            Sources WFP, UNGIWG, OCHA, GAUL, USGS, NASA, UCSB
          </Text>
          <Text
            style={{ fontSize: 6.14, color: theme.pdf?.secondaryTextColor }}
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

interface StormReportDocProps {
  theme: Theme;
  reportType: ReportType;
  mapImage: string;
  tableData: TableData;
  tableName: string;
  tableRowsNum?: number;
  tableShowTotal: boolean;
  eventName: string;
  sortByKey?: keyof TableRowType;
  exposureLegend: LegendDefinition;
  t: TFunction;
}

export default StormReportDoc;
