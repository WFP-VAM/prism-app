import React from 'react';
import {
  Page,
  Document,
  StyleSheet,
  View,
  Text,
  Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFF',
    paddingBottom: 15,
    paddingTop: '1vh',
  },
  section: {
    width: '96vw',
    marginLeft: '2vw',
    marginRight: '2vw',
    marginBottom: 10,
  },
  title: {
    fontSize: '14px',
  },
  subText: {
    fontSize: '12px',
  },
  legendsContainer: {
    height: 100,
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
  },
  legend: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 10,
  },
  legendTittle: {
    fontSize: 14,
    paddingBottom: 10,
  },
  legendContentsWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  legendContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 14,
    paddingTop: 5,
  },
  dash: {
    width: 16,
    height: 2,
  },
  tableCell: {
    padding: 10,
    fontSize: 12,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  tableHead: {
    borderBottom: 1,
    borderBottomColor: '#c1c1c1',
    backgroundColor: '#EBEBEB',
  },
  tableFooter: {
    borderTop: 1,
    borderTopColor: '#c1c1c1',
  },
  footer: {
    position: 'absolute',
    fontSize: 12,
    bottom: 10,
    left: 10,
    right: 0,
    textAlign: 'left',
  },
});

const dummyTable = {
  columns: ['TS_PCODE', '60 km/h', 'Uncertainty Cones'],
  rows: [
    {
      TS_PCODE: 'MMR016001',
      '60 km/h': 177,
      'Uncertainty Cones': 824199,
    },
    { TS_PCODE: 'MMR016006', 'Uncertainty Cones': 0, '60 km/h': 0 },
    {
      TS_PCODE: 'MMR016011',
      '60 km/h': 384551,
      'Uncertainty Cones': 384551,
    },
    {
      TS_PCODE: 'MMR016009',
      '60 km/h': 0,
      'Uncertainty Cones': 182638,
    },
    {
      TS_PCODE: 'MMR016002',
      '60 km/h': 11808,
      'Uncertainty Cones': 214136,
    },
    { TS_PCODE: 'MMR016007', 'Uncertainty Cones': 64279, '60 km/h': 0 },
    { TS_PCODE: 'MMR015024', 'Uncertainty Cones': 0, '60 km/h': 0 },
    {
      TS_PCODE: 'MMR016003',
      '60 km/h': 403130,
      'Uncertainty Cones': 517026,
    },
    {
      TS_PCODE: 'MMR016010',
      '60 km/h': 0,
      'Uncertainty Cones': 146776,
    },
    { TS_PCODE: 'MMR015005', 'Uncertainty Cones': 55569, '60 km/h': 0 },
    { TS_PCODE: 'MMR015006', 'Uncertainty Cones': 3994, '60 km/h': 0 },
    {
      TS_PCODE: 'MMR016005',
      '60 km/h': 198556,
      'Uncertainty Cones': 198556,
    },
  ],
};

const StormReportDoc = ({ mapImage }: StormReportDocProps) => {
  const eventName = 'Storm';
  const date = '16 April 2020, 6:00:00 UTC';
  const tableName = 'Number of people exposed by wind speed category';

  const totals: number[] = [];

  dummyTable.columns.forEach(col => {
    let total = 0;
    dummyTable.rows.forEach(row => {
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
          <Text style={styles.title}>Event Name: {eventName}</Text>
          <Text style={styles.title}>Publication Date: {date}</Text>
          <Text style={styles.subText}>
            This is an automated report.
            <Text> Information should be treated as preliminary.</Text>
          </Text>
        </View>
        <View>
          <Image src={mapImage} style={styles.section} />
        </View>
        <View style={[styles.legendsContainer, styles.section]}>
          <View style={styles.legend}>
            <View>
              <Text style={styles.legendTittle}>Areas</Text>
            </View>
            <View style={styles.legendContentsWrapper}>
              <View style={styles.legendContent}>
                <View style={[styles.dash, { backgroundColor: '#000000' }]} />
                <Text> Province</Text>
              </View>
              <View style={styles.legendContent}>
                <View style={[styles.dash, { backgroundColor: '#999797' }]} />
                <Text> District</Text>
              </View>
              <View style={styles.legendContent}>
                <View style={[styles.dash, { backgroundColor: '#D8D6D6' }]} />
                <Text> Township</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={{ fontSize: 10 }}>
            Sources WFP, UNGIWG, OCHA, GAUL, USGS, NASA, UCSB
          </Text>
          <Text style={{ fontSize: 8 }}>
            The designations employed and the presentation of material in the
            map(s) do not imply the expression of any opinion on the part of WFP
            concerning the legal or constitutional status of any country,
            territory, city or sea, or concerning the delimitation of its
            frontiers or boundaries.
          </Text>
        </View>
        <View style={[styles.section]}>
          <View style={{ backgroundColor: '#EBEBEB' }}>
            <Text style={{ padding: 10 }}>{tableName}</Text>
          </View>
          <View style={[styles.tableHead, styles.tableRow]} wrap={false}>
            {dummyTable.columns.map(value => {
              return (
                <Text
                  style={[
                    styles.tableCell,
                    { width: `${100 / dummyTable.columns.length + 1}%` },
                  ]}
                >
                  {value}
                </Text>
              );
            })}
            <Text
              style={[
                styles.tableCell,
                { width: `${100 / dummyTable.columns.length + 1}%` },
              ]}
            >
              Total
            </Text>
          </View>
          {dummyTable.rows.map((value, index) => {
            const color = index % 2 ? '#F5F5F5' : '#EBEBEB';
            let total = 0;
            return (
              <View
                style={[styles.tableRow, { backgroundColor: color }]}
                wrap={false}
              >
                {dummyTable.columns.map(col => {
                  const val = value[col as keyof typeof value];
                  // eslint-disable-next-line no-restricted-globals
                  if (!isNaN(Number(val))) {
                    // eslint-disable-next-line fp/no-mutation
                    total += Number(val);
                  }
                  return (
                    <Text
                      style={[
                        styles.tableCell,
                        { width: `${100 / dummyTable.columns.length + 1}%` },
                      ]}
                    >
                      {val}
                    </Text>
                  );
                })}
                <Text
                  style={[
                    styles.tableCell,
                    { width: `${100 / dummyTable.columns.length + 1}%` },
                  ]}
                >
                  {total}
                </Text>
              </View>
            );
          })}
          <View
            wrap={false}
            style={[
              styles.tableRow,
              styles.tableFooter,
              {
                backgroundColor:
                  dummyTable.columns.length % 2 ? '#EBEBEB' : '#F5F5F5',
              },
            ]}
          >
            {totals.map((val, index) => {
              if (index === 0) {
                return (
                  <Text
                    style={[
                      styles.tableCell,
                      { width: `${100 / dummyTable.columns.length + 1}%` },
                    ]}
                  >
                    Total
                  </Text>
                );
              }
              return (
                <Text
                  style={[
                    styles.tableCell,
                    { width: `${100 / dummyTable.columns.length + 1}%` },
                  ]}
                >
                  {val}
                </Text>
              );
            })}
            <Text
              style={[
                styles.tableCell,
                { width: `${100 / dummyTable.columns.length + 1}%` },
              ]}
            >
              {totals.reduce((prev, cur) => {
                return prev + cur;
              }, 0)}
            </Text>
          </View>
        </View>
        <Text fixed style={styles.footer}>
          PRISM automated report
        </Text>
      </Page>
    </Document>
  );
};

interface StormReportDocProps {
  mapImage: string;
}

export default StormReportDoc;
