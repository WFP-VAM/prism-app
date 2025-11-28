;

export const useLayerMenuItemStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'inherit',
      backgroundColor: '#FFFF',
    },
    rootSummary: {
      backgroundColor: '#FFFF',
    },
    rootDetails: {
      padding: 0,
    },
    expandIcon: {
      color: 'black',
    },
    summaryContent: {
      alignItems: 'center',
    },
    title: {
      color: 'black',
      fontSize: '14px',
      fontWeight: 600,
    },
    chipRoot: {
      marginLeft: '3%',
    },
  }),
);

export const makeSafeIDFromTitle = (title: string): string =>
  title.replace(/ /g, '').replace(/[\u{0080}-\u{FFFF}]/gu, '');
