import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Link,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { memo } from 'react';

const styles = () =>
  createStyles({
    externalLinkContainer: {
      display: 'flex',
      gap: '8px',
      color: '#5b9bd5',
      fontWeight: 'bold',
      marginBottom: '8px',
      alignItems: 'center',
    },
  });

interface RedirectToDMPProps extends WithStyles<typeof styles> {
  dmpDisTyp: string | undefined;
  dmpSubmissionId: string | undefined;
}

const computeDisasterTypeFromDistTyp = (distTyp: string) => {
  if (!Number(distTyp)) {
    throw Error('distTyp must be convertable to integer');
  }
  if (distTyp === '1') {
    return 'FLOOD';
  }
  if (distTyp === '2') {
    return 'DROUGHT';
  }
  return 'INCIDENT';
};

const RedirectToDMP = ({
  dmpDisTyp,
  dmpSubmissionId,
  classes,
}: RedirectToDMPProps) => {
  if (!dmpDisTyp) {
    return null;
  }
  return (
    <Link
      href={`https://dmp.ovio.org/form/${computeDisasterTypeFromDistTyp(
        dmpDisTyp,
      )}/${dmpSubmissionId}`}
      target="_blank"
    >
      <Typography className={classes.externalLinkContainer}>
        <u>Report details</u>
        <FontAwesomeIcon icon={faExternalLinkAlt} />
      </Typography>
    </Link>
  );
};

export default memo(withStyles(styles)(RedirectToDMP));
