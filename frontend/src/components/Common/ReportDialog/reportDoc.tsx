import React, { memo, useMemo } from 'react';
import {
  Page,
  Document,
  StyleSheet,
  View,
  Text,
  Image,
} from '@react-pdf/renderer';
import { Theme } from '@material-ui/core';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { getLegendItemLabel } from 'components/MapView/utils';
import { LegendDefinition } from 'config/types';
import { TFunction } from 'utils/data-utils';
import { Column } from 'utils/analysis-utils';
import { PDFLegendDefinition, ReportType } from './types';
import ReportDocLegend from './ReportDocLegend';
import ReportDocTable from './ReportDocTable';

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
    footer: {
      position: 'absolute',
      fontSize: theme.pdf?.fontSizes.medium,
      bottom: 10,
      left: 10,
      right: 0,
      textAlign: 'left',
    },
  });

const ReportDoc = memo(
  ({
    theme,
    reportType,
    mapImage,
    tableName,
    tableRowsNum,
    tableShowTotal,
    eventName,
    exposureLegendDefinition,
    t,
    tableData,
    columns,
  }: ReportDocProps) => {
    const styles = makeStyles(theme);

    const date = useMemo(() => {
      return new Date().toUTCString();
    }, []);

    const showRowTotal = useMemo(() => {
      return columns.length > 2;
    }, [columns.length]);

    const tableCellWidth = useMemo(() => {
      return `${100 / (columns.length + (showRowTotal ? 1 : 0))}%`;
    }, [columns.length, showRowTotal]);

    const trimmedTableRows = useMemo(() => {
      return tableRowsNum !== undefined
        ? tableData.slice(0, tableRowsNum - (tableShowTotal ? 1 : 0))
        : tableData;
    }, [tableData, tableRowsNum, tableShowTotal]);

    const areasLegendDefinition: PDFLegendDefinition[] = useMemo(() => {
      return [
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
    }, [styles.dash]);

    const stormWindBuffersLegendDefinition: PDFLegendDefinition[] = useMemo(() => {
      return [
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
    }, [styles.borderedBox]);

    const floodsLegendDefinition: PDFLegendDefinition[] = useMemo(() => {
      return [
        {
          value: 'flooded',
          style: [styles.box, { backgroundColor: '#a50f15' }],
        },
      ];
    }, [styles.box]);

    const populationExposureLegendDefinition: PDFLegendDefinition[] = useMemo(() => {
      return exposureLegendDefinition.map(item => ({
        value: getLegendItemLabel(t, item),
        style: [styles.box, { backgroundColor: item.color, opacity: 0.5 }],
      }));
    }, [exposureLegendDefinition, styles.box, t]);

    // The rendered report doc legend
    const renderedReportDocLegend = useMemo(() => {
      if (reportType === ReportType.Storm) {
        return (
          <ReportDocLegend
            title="Tropical Storms - Wind buffers"
            definition={stormWindBuffersLegendDefinition}
            theme={theme}
          />
        );
      }
      return (
        <ReportDocLegend
          title="Potential Flooding"
          definition={floodsLegendDefinition}
          theme={theme}
        />
      );
    }, [
      floodsLegendDefinition,
      reportType,
      stormWindBuffersLegendDefinition,
      theme,
    ]);

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
            <ReportDocLegend
              theme={theme}
              title="Areas"
              definition={areasLegendDefinition}
            />
            {renderedReportDocLegend}
            <ReportDocLegend
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
              map(s) do not imply the expression of any opinion on the part of
              WFP concerning the legal or constitutional status of any country,
              territory, city or sea, or concerning the delimitation of its
              frontiers or boundaries.
            </Text>
          </View>
          <View style={[styles.section]}>
            <ReportDocTable
              theme={theme}
              name={tableName}
              rows={trimmedTableRows}
              columns={columns}
              cellWidth={tableCellWidth}
              showTotal={tableShowTotal}
              showRowTotal={showRowTotal}
              t={t}
            />
          </View>
          <Text fixed style={styles.footer}>
            P R I S M automated report
          </Text>
        </Page>
      </Document>
    );
  },
);

interface ReportDocProps {
  theme: Theme;
  reportType: ReportType;
  mapImage: string;
  tableName: string;
  tableRowsNum?: number;
  tableShowTotal: boolean;
  eventName: string;
  exposureLegendDefinition: LegendDefinition;
  t: TFunction;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default ReportDoc;
