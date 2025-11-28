import { memo, useMemo } from 'react';
import { makeStyles } from '@mui/styles';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { Theme } from '@mui/material';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { getLegendItemLabel } from 'components/MapView/utils';
import { LegendDefinition, ReportType } from 'config/types';
import { Column } from 'utils/analysis-utils';
import { useSafeTranslation } from 'i18n';
import { PDFLegendDefinition } from './types';
import ReportDocLegend from './ReportDocLegend';
import ReportDocTable from './ReportDocTable';
import { getReportFontFamily } from './utils';

const makeStyles = (theme: Theme, selectedLanguage: string) =>
  StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: 'white',
      paddingBottom: 25,
      paddingTop: '1vh',
      fontFamily: getReportFontFamily(selectedLanguage),
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
    tableData,
    columns,
  }: ReportDocProps) => {
    const { t, i18n } = useSafeTranslation();

    const styles = makeStyles(theme, i18n.language);

    const date = useMemo(() => new Date().toUTCString(), []);

    const tableName = useMemo(
      () =>
        reportConfig?.tableName
          ? reportConfig?.tableName
          : 'Population Exposure',
      [reportConfig],
    );

    const showRowTotal = useMemo(() => columns.length > 2, [columns.length]);

    const tableCellWidth = useMemo(
      () => `${100 / (columns.length + (showRowTotal ? 1 : 0))}%`,
      [columns.length, showRowTotal],
    );

    const trimmedTableRows = useMemo(
      () =>
        tableRowsNum !== undefined
          ? tableData.slice(0, tableRowsNum - (tableShowTotal ? 1 : 0))
          : tableData,
      [tableData, tableRowsNum, tableShowTotal],
    );

    const areasLegendDefinition: PDFLegendDefinition[] = useMemo(
      () =>
        reportConfig.areasLegendDefinition.items.map(areaDefinition => ({
          value: t(areaDefinition.title),
          style: [styles.dash, { backgroundColor: areaDefinition.color }],
        })),
      [reportConfig.areasLegendDefinition.items, styles.dash, t],
    );

    const typeLegendDefinition: PDFLegendDefinition[] = useMemo(
      () =>
        reportConfig.typeLegendDefinition.items.map(
          typeLegendDefinitionItem => ({
            value: t(typeLegendDefinitionItem.title),
            style: [
              typeLegendDefinitionItem?.border
                ? styles.borderedBox
                : styles.box,
              {
                backgroundColor: typeLegendDefinitionItem.color,
                ...(typeLegendDefinitionItem?.border && {
                  borderColor: typeLegendDefinitionItem.border,
                }),
              },
            ],
          }),
        ),
      [
        reportConfig.typeLegendDefinition.items,
        styles.borderedBox,
        styles.box,
        t,
      ],
    );

    const populationExposureLegendDefinition: PDFLegendDefinition[] = useMemo(
      () =>
        exposureLegendDefinition.map(item => ({
          value: getLegendItemLabel(t, item),
          style: [styles.box, { backgroundColor: item.color, opacity: 0.5 }],
        })),
      [exposureLegendDefinition, styles.box, t],
    );

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

    const renderedSignatureText = useMemo(
      () =>
        reportConfig?.signatureText
          ? t(reportConfig.signatureText)
          : t('PRISM automated report'),
      [reportConfig, t],
    );

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
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default ReportDoc;
