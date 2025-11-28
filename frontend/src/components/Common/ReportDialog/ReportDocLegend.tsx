import { memo, useMemo } from 'react';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { PDFLegendDefinition } from './types';

interface LegendProps {
  theme: Theme;
  title: string;
  definition: PDFLegendDefinition[];
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
  });

const ReportDocLegend = memo(({ theme, title, definition }: LegendProps) => {
  const styles = makeStyles(theme);

  // The rendered definitions
  const renderedDefinitions = useMemo(
    () =>
      definition.map(item => (
        <View key={item.value as string} style={styles.legendContent}>
          <View style={item.style as any} />
          <Text style={[styles.legendText]}>{item.value}</Text>
        </View>
      )),
    [definition, styles.legendContent, styles.legendText],
  );

  return (
    <View style={styles.legend}>
      <View>
        <Text style={styles.legendTittle}>{title}</Text>
        <View style={styles.legendContentsWrapper}>{renderedDefinitions}</View>
      </View>
    </View>
  );
});

export default ReportDocLegend;
