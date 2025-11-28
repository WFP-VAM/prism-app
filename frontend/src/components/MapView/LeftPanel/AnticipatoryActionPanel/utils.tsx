/* eslint-disable react-refresh/only-export-components */
import { black, cyanBlue } from 'muiTheme';
import { makeStyles, createStyles } from '@mui/styles';
import {Select,
  
  styled} from '@mui/material';

export const StyledSelect = styled(Select)({
  '&:focus': {
    backgroundColor: 'transparent',
  },
});

export const useAACommonStyles = makeStyles(() =>
  createStyles({
    footerWrapper: { display: 'flex', flexDirection: 'column' },
    footerActionsWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.5rem',
      gap: '1rem',
    },
    footerDialogsWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.5rem',
      paddingTop: 0,
    },
    footerButton: { borderColor: cyanBlue, color: black },
    footerDialog: {
      textDecoration: 'underline',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'right',
    },
    footerWrapperVert: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footerDialogsWrapperVert: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '0.5rem',
    },
    newTag: {
      height: '2em',
      padding: '0 0.5em',
      color: 'white',
      background: '#A4A4A4',
      fontSize: '10px',
      borderRadius: '32px',
      display: 'flex',
      alignItems: 'center',
    },
    windowHeader: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.5rem',
    },
  }),
);
