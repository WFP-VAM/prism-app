import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';
import {
  dashboardTextContentSelector,
  setTextContent,
} from '../../context/dashboardStateSlice';

interface TextBlockProps {
  label?: string;
  placeholder?: string;
}

function TextBlock({
  label = 'Block #1',
  placeholder = 'Add custom text here',
}: TextBlockProps) {
  const textContent = useSelector(dashboardTextContentSelector);
  const dispatch = useDispatch();
  const classes = useStyles();

  return (
    <Box className={classes.grayCard}>
      <Typography variant="h3" className={classes.blockLabel}>
        {label}
      </Typography>
      <textarea
        name="text-block"
        className={classes.textarea}
        placeholder={placeholder}
        value={textContent}
        onChange={e => dispatch(setTextContent(e.target.value))}
      />
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  blockLabel: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  textarea: {
    width: '95%',
    minHeight: 120,
    padding: '12px',
    borderRadius: 4,
    fontSize: 14,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
    resize: 'vertical',
  },
}));

export default TextBlock;
