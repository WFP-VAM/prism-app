import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, Typography } from '@mui/material';
import { memo } from 'react';

import { externalLinkContainerSx } from './mapTooltipStyles';

interface RedirectToDMPProps {
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

const RedirectToDMP = memo(
  ({ dmpDisTyp, dmpSubmissionId }: RedirectToDMPProps) => {
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
        <Typography sx={externalLinkContainerSx}>
          <u>Report details</u>
          <FontAwesomeIcon icon={faExternalLinkAlt} />
        </Typography>
      </Link>
    );
  },
);

export default RedirectToDMP;
