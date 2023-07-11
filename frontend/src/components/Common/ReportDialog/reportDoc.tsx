import React, { memo, useMemo } from 'react';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { Theme } from '@material-ui/core';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { getLegendItemLabel } from 'components/MapView/utils';
import { LegendDefinition, ReportType, ReportTypeEnum } from 'config/types';
import { TFunction } from 'utils/data-utils';
import { Column } from 'utils/analysis-utils';
import { PDFLegendDefinition } from './types';
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
    mapImage,
    tableRowsNum,
    tableShowTotal,
    reportTitle,
    reportConfig,
    exposureLegendDefinition,
    t,
    tableData,
    columns,
  }: ReportDocProps) => {
    const styles = makeStyles(theme);

    const date = useMemo(() => {
      return new Date().toUTCString();
    }, []);

    const tableName = useMemo(() => {
      return reportConfig?.tableName
        ? reportConfig?.tableName
        : 'Population Exposure';
    }, [reportConfig]);

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
      return reportConfig.areasLegendDefinition.items.map(areaDefinition => {
        return {
          value: t(areaDefinition.title),
          style: [styles.dash, { backgroundColor: areaDefinition.color }],
        };
      });
    }, [reportConfig.areasLegendDefinition.items, styles.dash, t]);

    const typeLegendDefinition: PDFLegendDefinition[] = useMemo(() => {
      return reportConfig.typeLegendDefinition.items.map(
        typeLegendDefinitionItem => {
          return {
            value: t(typeLegendDefinitionItem.title),
            style: [
              reportConfig.type === ReportTypeEnum.TROPICAL_STORMS
                ? styles.borderedBox
                : styles.box,
              {
                backgroundColor: typeLegendDefinitionItem.color,
                ...(typeLegendDefinitionItem?.border && {
                  borderColor: typeLegendDefinitionItem.border,
                }),
              },
            ],
          };
        },
      );
    }, [
      reportConfig.type,
      reportConfig.typeLegendDefinition.items,
      styles.borderedBox,
      styles.box,
      t,
    ]);

    const populationExposureLegendDefinition: PDFLegendDefinition[] = useMemo(() => {
      return exposureLegendDefinition.map(item => ({
        value: getLegendItemLabel(t, item),
        style: [styles.box, { backgroundColor: item.color, opacity: 0.5 }],
      }));
    }, [exposureLegendDefinition, styles.box, t]);

    const renderedMapFooterText = useMemo(() => {
      if (!reportConfig?.mapFooterText) {
        return null;
      }
      return (
        <Text style={{ fontSize: theme.pdf?.fontSizes.small }}>
          {reportConfig.mapFooterText}
        </Text>
      );
    }, [reportConfig, theme.pdf]);

    const renderedMapFooterSubText = useMemo(() => {
      if (!reportConfig?.mapFooterSubText) {
        return null;
      }
      return (
        <Text
          style={{
            fontSize: theme.pdf?.fontSizes.extraSmall,
            color: theme.pdf?.secondaryTextColor,
          }}
        >
          {reportConfig.mapFooterSubText}
        </Text>
      );
    }, [reportConfig, theme.pdf]);

    const renderedSourcesView = useMemo(() => {
      if (!reportConfig?.mapFooterText && !reportConfig?.mapFooterSubText) {
        return null;
      }
      return (
        <View style={styles.section}>
          {renderedMapFooterText}
          {renderedMapFooterSubText}
        </View>
      );
    }, [
      renderedMapFooterSubText,
      renderedMapFooterText,
      reportConfig,
      styles.section,
    ]);

    const renderedSubText = useMemo(() => {
      if (!reportConfig?.subText) {
        return null;
      }
      return <Text style={styles.subText}>{t(reportConfig.subText)}</Text>;
    }, [reportConfig, styles.subText, t]);

    const renderedSignatureText = useMemo(() => {
      return reportConfig?.signatureText
        ? t(reportConfig.signatureText)
        : t('PRISM automated report');
    }, [reportConfig, t]);

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={[styles.section]}>
            <Text style={styles.title}>{reportTitle}</Text>
            <Text style={styles.title}>
              {t(reportConfig.publicationDateLabel)}: {date}
            </Text>
            {renderedSubText}
          </View>
          <View style={styles.section}>
            <Image src={mapImage} style={styles.mapImage} />
          </View>
          <View style={[styles.legendsContainer, styles.section]}>
            <ReportDocLegend
              theme={theme}
              title={t(reportConfig.areasLegendDefinition.title)}
              definition={areasLegendDefinition}
            />
            <ReportDocLegend
              title={t(reportConfig.typeLegendDefinition.title)}
              definition={typeLegendDefinition}
              theme={theme}
            />
            <ReportDocLegend
              title="Population Exposure"
              definition={populationExposureLegendDefinition}
              theme={theme}
            />
          </View>
          {renderedSourcesView}
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
            {renderedSignatureText}
          </Text>
        </Page>
      </Document>
    );
  },
);

interface ReportDocProps {
  theme: Theme;
  mapImage: string;
  tableRowsNum?: number;
  reportTitle: string;
  reportConfig: ReportType;
  tableShowTotal: boolean;
  exposureLegendDefinition: LegendDefinition;
  t: TFunction;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default ReportDoc;
