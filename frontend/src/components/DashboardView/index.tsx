import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';
import {
  dashboardTitleSelector,
  setTitle,
} from '../../context/dashboardStateSlice';

function DashboardView() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dispatch = useDispatch();

  return (
    <Box className={classes.titleBar}>
      <label className={classes.titleBarLabel}>
        <Typography variant="h2" component="span">
          Dashboard title
        </Typography>
        <input
          type="text"
          className={classes.titleBarInput}
          placeholder="Enter dashboard title"
          value={dashboardTitle}
          onChange={e => dispatch(setTitle(e.target.value))}
        />
      </label>
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    background: '#F1F1F1',
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  titleBarLabel: {
    marginRight: 16,
    fontWeight: 600,
    fontSize: 16,
    flex: '1 0 fit-content',
  },
  titleBarInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
  },
}));

export default DashboardView;
