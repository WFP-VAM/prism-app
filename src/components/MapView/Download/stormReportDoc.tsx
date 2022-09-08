import React from 'react';
import {
  Page,
  Document,
  StyleSheet,
  View,
  Text,
  Image,
  Font,
} from '@react-pdf/renderer';
import { TableData } from '../../../context/analysisResultStateSlice';

// https://github.com/diegomura/react-pdf/issues/1991
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src:
        'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
      fontWeight: 400,
    },
    {
      src:
        'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9vAx05IsDqlA.ttf',
      fontWeight: 500,
    },
    {
      src:
        'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf',
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
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
    backgroundColor: '#F9F9F9',
  },
  legend: {
    height: 110,
    display: 'flex',
    flexDirection: 'column',
    marginRight: 40,
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
    borderBottomColor: '#c1c1c1',
    backgroundColor: '#EBEBEB',
    fontWeight: 500,
  },
  tableFooter: {
    borderTop: 1,
    borderTopColor: '#c1c1c1',
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

const StormReportDoc = ({ mapImage, tableData }: StormReportDocProps) => {
  const eventName = 'Storm';
  const date = new Date().toUTCString();
  const tableName = 'Number of people exposed by wind speed category';
  const tableCellWidth = `${100 / (tableData.columns.length + 1)}%`;
  const hasTableData =
    tableData.columns.length > 0 && tableData.rows.length > 0;
  const tableRowsNum = 10;
  const showTotal = true;
  const sortByKey = '60 km/h';

  const tableRows = tableData.rows.slice(1);
  // eslint-disable-next-line fp/no-mutating-methods
  const sortedTableRows = tableRows.sort((a, b) => {
    if (a[sortByKey as keyof typeof a] > b[sortByKey as keyof typeof b]) {
      return -1;
    }
    if (a[sortByKey as keyof typeof a] < b[sortByKey as keyof typeof b]) {
      return 1;
    }
    return 0;
  });
  const trimmedTableRows = sortedTableRows.slice(
    0,
    tableRowsNum - (showTotal ? 1 : 0),
  );

  const totals: number[] = [];

  tableData.columns.forEach(col => {
    let total = 0;
    tableData.rows.forEach(row => {
      const val = row[col as keyof typeof row];
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(Number(val))) {
        // eslint-disable-next-line fp/no-mutation
        total += Number(val);
      }
    });

    // eslint-disable-next-line fp/no-mutating-methods
    totals.push(total);
  });

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
          {hasTableData && (
            <View style={styles.legend}>
              <View>
                <Text style={styles.legendTittle}>
                  Tropical Storms - Wind buffers
                </Text>
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
                    <Text style={[styles.legendText]}>
                      Wind Buffer 120 km/h
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          {hasTableData && (
            <View style={styles.legend}>
              <View>
                <Text style={styles.legendTittle}>Population Exposure</Text>
                <View style={styles.legendContentsWrapper}>
                  <View style={styles.legendContent}>
                    <View
                      style={[styles.box, { backgroundColor: '#fef2ec' }]}
                    />
                    <Text style={[styles.legendText]}>Very low</Text>
                  </View>
                  <View style={styles.legendContent}>
                    <View
                      style={[styles.box, { backgroundColor: '#fdd6c8' }]}
                    />
                    <Text style={[styles.legendText]}>Low</Text>
                  </View>
                  <View style={styles.legendContent}>
                    <View
                      style={[styles.box, { backgroundColor: '#fdb4a4' }]}
                    />
                    <Text style={[styles.legendText]}>Medium</Text>
                  </View>
                  <View style={styles.legendContent}>
                    <View
                      style={[styles.box, { backgroundColor: '#ee9592' }]}
                    />
                    <Text style={[styles.legendText]}>Hight</Text>
                  </View>
                  <View style={styles.legendContent}>
                    <View
                      style={[styles.box, { backgroundColor: '#d28689' }]}
                    />
                    <Text style={[styles.legendText]}>Very hight</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={{ fontSize: 7.7 }}>
            Sources WFP, UNGIWG, OCHA, GAUL, USGS, NASA, UCSB
          </Text>
          <Text style={{ fontSize: 6.14, color: '#929292' }}>
            The designations employed and the presentation of material in the
            map(s) do not imply the expression of any opinion on the part of WFP
            concerning the legal or constitutional status of any country,
            territory, city or sea, or concerning the delimitation of its
            frontiers or boundaries.
          </Text>
        </View>
        {hasTableData && (
          <View style={[styles.section]}>
            <View style={{ backgroundColor: '#EBEBEB' }}>
              <View>
                <Text style={styles.tableName}>{tableName}</Text>
              </View>
              <View style={[styles.tableHead, styles.tableRow]} wrap={false}>
                {tableData.columns.map(value => {
                  return (
                    <Text style={[styles.tableCell, { width: tableCellWidth }]}>
                      {value}
                    </Text>
                  );
                })}
                <Text style={[styles.tableCell, { width: tableCellWidth }]}>
                  Total
                </Text>
              </View>
            </View>

            {trimmedTableRows.map((value, index) => {
              const color = index % 2 ? '#EBEBEB' : '#F5F5F5';
              let total = 0;
              return (
                <View
                  style={[styles.tableRow, { backgroundColor: color }]}
                  wrap={false}
                >
                  {tableData.columns.map(col => {
                    const val = value[col as keyof typeof value];
                    // eslint-disable-next-line no-restricted-globals
                    if (!isNaN(Number(val))) {
                      // eslint-disable-next-line fp/no-mutation
                      total += Number(val);
                    }
                    return (
                      <Text
                        style={[styles.tableCell, { width: tableCellWidth }]}
                      >
                        {val}
                      </Text>
                    );
                  })}
                  <Text style={[styles.tableCell, { width: tableCellWidth }]}>
                    {total}
                  </Text>
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
                      trimmedTableRows.length % 2 ? '#EBEBEB' : '#F5F5F5',
                  },
                ]}
              >
                {totals.map((val, index) => {
                  if (index === 0) {
                    return (
                      <Text
                        style={[styles.tableCell, { width: tableCellWidth }]}
                      >
                        Total
                      </Text>
                    );
                  }
                  return (
                    <Text style={[styles.tableCell, { width: tableCellWidth }]}>
                      {val}
                    </Text>
                  );
                })}
                <Text style={[styles.tableCell, { width: tableCellWidth }]}>
                  {totals.reduce((prev, cur) => {
                    return prev + cur;
                  }, 0)}
                </Text>
              </View>
            )}
          </View>
        )}
        <Text fixed style={styles.footer}>
          P R I S M automated report
        </Text>
      </Page>
    </Document>
  );
};

interface StormReportDocProps {
  mapImage: string;
  tableData: TableData;
}

export default StormReportDoc;
